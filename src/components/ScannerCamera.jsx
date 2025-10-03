import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, AlertCircle, RefreshCw } from 'lucide-react';
import jsQR from 'jsqr';

export default function ScannerCamera({ active, onDetected, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const [cameraStatus, setCameraStatus] = useState('idle'); // idle | ready | error

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStatus('idle');
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
    if (code && code.data) {
      // Provide quick audio feedback
      try {
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        o.connect(g);
        g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.2, ac.currentTime + 0.01);
        o.start();
        o.stop(ac.currentTime + 0.12);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12);
      } catch {}
      onDetected(code.data);
      stopCamera();
      return;
    }
    rafRef.current = requestAnimationFrame(scanFrame);
  }, [onDetected, stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      setCameraStatus('idle');
      const constraints = {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
        setCameraStatus('ready');
        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (playErr) {
        // Some browsers throw a harmless "The play() request was interrupted by a new load request" error
        // when streams are started/stopped rapidly. Ignore that specific message and surface a friendly
        // message for actual permission/read errors.
        const msg = playErr?.message || '';
        console.error('Video play error:', playErr);
        if (msg.includes('play() request was interrupted')) {
          // do not call onError for this non-actionable error; try to continue scanning loop
          // but set camera to ready if the video element has dimensions
          const w = videoRef.current?.videoWidth || 0;
          const h = videoRef.current?.videoHeight || 0;
          if (w && h) {
            setCameraStatus('ready');
            rafRef.current = requestAnimationFrame(scanFrame);
          } else {
            setCameraStatus('idle');
          }
        } else if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
          setCameraStatus('error');
          onError?.('Camera access denied or unavailable');
        } else {
          setCameraStatus('error');
          onError?.(playErr?.message || 'Camera access failed');
        }
      }
    } catch (e) {
      console.error(e);
      setCameraStatus('error');
      const msg = e?.message || '';
      if (msg.includes('play() request was interrupted')) {
        // ignore
      } else if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
        onError?.('Camera access denied or unavailable');
      } else {
        onError?.(e?.message || 'Camera access failed');
      }
    }
  }, [scanFrame, onError]);

  useEffect(() => {
    if (active) startCamera();
    return () => stopCamera();
  }, [active, startCamera, stopCamera]);

  return (
    <div className="w-full">
      <div className="relative w-full mx-auto bg-gray-900 rounded-lg overflow-hidden shadow-md aspect-video max-h-[400px]">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {/* Blue corner frame overlay */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="relative w-4/5 h-3/5">
            <span className="absolute left-0 top-0 w-10 h-10 border-t-4 border-l-4 border-blue-600 rounded-tl-sm" />
            <span className="absolute right-0 top-0 w-10 h-10 border-t-4 border-r-4 border-blue-600 rounded-tr-sm" />
            <span className="absolute left-0 bottom-0 w-10 h-10 border-b-4 border-l-4 border-blue-600 rounded-bl-sm" />
            <span className="absolute right-0 bottom-0 w-10 h-10 border-b-4 border-r-4 border-blue-600 rounded-br-sm" />
          </div>
        </div>
        <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/50 text-white px-2 py-1 rounded">
          <Camera className="w-4 h-4" />
          <span className="text-xs">{cameraStatus === 'ready' ? 'Camera On' : cameraStatus === 'error' ? 'Camera Error' : 'Preparing...'}</span>
        </div>
      </div>
      <p className="text-center text-sm text-gray-600 mt-2 flex items-center justify-center gap-1">
        {cameraStatus === 'error' ? (
          <>
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>Camera access denied or unavailable.</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            <span>Position QR code within the frame</span>
          </>
        )}
      </p>
    </div>
  );
}
