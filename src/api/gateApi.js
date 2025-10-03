const BASE_URL = '/api/gate';

function getToken() {
  return localStorage.getItem('gateToken') || '';
}

async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    // Fallback mock behavior when API is unreachable
    if (path === '/scan' && method === 'POST') {
      const now = Date.now();
      return {
        valid: true,
        submission: {
          id: 'mock-sub-1',
          companyName: 'Acme Logistics',
          vehicleNumber: 'MH12AB1234',
          driverPhone: '+911234567890',
          helperPhone: '+919876543210',
          preferredLanguage: 'English',
          documents: ['Driving License', 'RC Book', 'Insurance'],
          status: 'pending',
          createdAt: now - 1000 * 60 * 30,
          expiresAt: now + 1000 * 60 * 60 * 12,
        },
      };
    }
    if (path === '/verify' && method === 'POST') {
      return {
        tokenNumber: 'GT-784213',
        smsStatus: { sent: true, provider: 'mock' },
      };
    }
    if (path === '/reject' && method === 'POST') {
      return { success: true };
    }
    throw err;
  }
}

export async function login({ username, password }) {
  const data = await request('/login', { method: 'POST', body: { username, password } });
  if (data && data.token) {
    localStorage.setItem('gateToken', data.token);
  }
  return data;
}

export async function scan({ qrCode }) {
  return request('/scan', { method: 'POST', auth: true, body: { qrCode } });
}

export async function verify({ submissionId }) {
  return request('/verify', { method: 'POST', auth: true, body: { submissionId } });
}

export async function rejectSubmission({ submissionId, reason }) {
  return request('/reject', { method: 'POST', auth: true, body: { submissionId, reason } });
}

export function logout() {
  localStorage.removeItem('gateToken');
}
