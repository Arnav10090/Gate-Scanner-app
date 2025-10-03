import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Scan, Camera, CheckCircle, AlertCircle, LogIn, LogOut } from 'lucide-react';
import ScannerCamera from './components/ScannerCamera';
import ManualEntry from './components/ManualEntry';
import VerificationDetails from './components/VerificationDetails';
import { login, scan as scanApi, verify as verifyApi, rejectSubmission as rejectApi, logout } from './api/gateApi';

function Header({ onLogout, isLoggedIn }) {
  return (
    <header className="w-full bg-white border-b">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scan className="w-6 h-6 text-blue-600" />
          <h1 className="text-lg md:text-xl font-semibold">Gate Scanner</h1>
        </div>
        {isLoggedIn ? (
          <button onClick={onLogout} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}

function LoginForm({ onSuccess, loading, onMockContinue }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await login({ username, password });
      if (res?.token) onSuccess();
      else setError('Invalid credentials');
    } catch (err) {
      setError(err?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 md:p-6 w-full">
      <div className="flex items-center gap-2 mb-4">
        <LogIn className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Gate User Login</h2>
      </div>
      <div className="grid gap-3">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-60"
        >
          <LogIn className="w-4 h-4" /> Login
        </button>
        {error ? (
          <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>
        ) : null}
        <p className="text-xs text-gray-500">Tip: If server is unavailable, mock responses are used for scan/verify/reject.</p>
      </div>
    </form>
  );
}

export default function App() {
  const [scanMode, setScanMode] = useState('camera'); // 'camera' | 'manual'
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [tokenSent, setTokenSent] = useState(null); // { tokenNumber, smsStatus }
  const isLoggedIn = useMemo(() => !!localStorage.getItem('gateToken'), []);
  const [loggedIn, setLoggedIn] = useState(isLoggedIn);

  useEffect(() => {
    // Stop scanning if leaving the page
    return () => setScanning(false);
  }, []);

  const startScan = useCallback(() => {
    setError('');
    setSubmission(null);
    setTokenSent(null);
    setScanning(true);
  }, []);

  const stopScan = useCallback(() => {
    setScanning(false);
  }, []);

  const handleDetected = useCallback(async (text) => {
    setScanning(false);
    setLoading(true);
    setError('');
    try {
      const res = await scanApi({ qrCode: String(text) });
      if (!res?.valid || !res?.submission) {
        setError(res?.error || 'Invalid QR code');
        return;
      }
      // Basic validation: expiry within 24h
      const now = Date.now();
      const expiresAt = res.submission.expiresAt || now + 1;
      if (expiresAt < now) {
        setError('QR code expired');
        return;
      }
      setSubmission(res.submission);
    } catch (e) {
      setError(e?.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualSubmit = useCallback((value) => {
    handleDetected(value);
  }, [handleDetected]);

  const approveAndSend = useCallback(async () => {
    if (!submission) return;
    setLoading(true);
    setError('');
    try {
      if (submission.status === 'completed') {
        setError('Submission already completed');
        return;
      }
      const res = await verifyApi({ submissionId: submission.id });
      if (res?.tokenNumber) {
        setTokenSent({ tokenNumber: res.tokenNumber, smsStatus: res.smsStatus });
      } else {
        setError('Failed to send token');
      }
    } catch (e) {
      setError(e?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [submission]);

  const rejectWithReason = useCallback(async () => {
    if (!submission) return;
    const reason = window.prompt('Enter rejection reason:');
    if (!reason) return;
    setLoading(true);
    setError('');
    try {
      await rejectApi({ submissionId: submission.id, reason });
      setSubmission({ ...submission, status: 'rejected' });
    } catch (e) {
      setError(e?.message || 'Rejection failed');
    } finally {
      setLoading(false);
    }
  }, [submission]);

  const resetToScan = useCallback(() => {
    setSubmission(null);
    setTokenSent(null);
    setError('');
    setScanMode('camera');
    setScanning(true);
  }, []);

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header onLogout={handleLogout} isLoggedIn={loggedIn} />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {!loggedIn ? (
          <LoginForm onSuccess={() => setLoggedIn(true)} />
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  <h2 className="text-base md:text-lg font-semibold">Scanner</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setScanMode('camera')}
                    className={`px-3 py-1.5 rounded border ${scanMode === 'camera' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300'}`}
                  >
                    Camera Scan
                  </button>
                  <button
                    onClick={() => setScanMode('manual')}
                    className={`px-3 py-1.5 rounded border ${scanMode === 'manual' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-300'}`}
                  >
                    Manual Entry
                  </button>
                </div>
              </div>

              <div className="mt-4">
                {scanMode === 'camera' ? (
                  <div className="space-y-3">
                    <ScannerCamera active={scanning && !submission && !tokenSent} onDetected={handleDetected} onError={setError} />
                    <div className="flex gap-2">
                      {!scanning ? (
                        <button onClick={startScan} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Start</button>
                      ) : (
                        <button onClick={stopScan} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded">Stop</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <ManualEntry onSubmit={handleManualSubmit} loading={loading} error={error} />
                )}
                {error && (
                  <p className="mt-3 text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</p>
                )}
              </div>
            </div>

            {submission && !tokenSent ? (
              <VerificationDetails
                submission={submission}
                onApprove={approveAndSend}
                onReject={rejectWithReason}
                onCancel={() => setSubmission(null)}
                loading={loading}
                error={error}
              />
            ) : null}

            {tokenSent ? (
              <div className="bg-white rounded-lg shadow p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="w-6 h-6" />
                  <h3 className="text-lg font-semibold">Token Sent</h3>
                </div>
                <p className="mt-2 text-gray-700">Token <span className="font-semibold">{tokenSent.tokenNumber}</span> has been sent via SMS to the driver.</p>
                <button onClick={resetToScan} className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Scan Next Vehicle</button>
              </div>
            ) : null}

            {loading ? (
              <div className="flex items-center gap-2 text-blue-700"><span className="animate-spin inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> Loading...</div>
            ) : null}
          </>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-gray-500">© Gate Scanner</footer>
    </div>
  );
}
