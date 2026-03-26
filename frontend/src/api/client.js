import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Fetch a PDF blob, retrying once after 900ms on network/connection errors. */
export async function fetchPdfBlob(url) {
  const attempt = () => api.get(url, { responseType: 'blob' }).then((res) => {
    const blob = res.data;
    if (!blob.type || !blob.type.includes('pdf')) throw new Error('Server did not return a PDF. Please try again.');
    return blob;
  });
  try {
    return await attempt();
  } catch (err) {
    const retryable = !err.response || err.response.status >= 500 || err.code === 'ERR_NETWORK' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
    if (!retryable) throw err;
    await new Promise((r) => setTimeout(r, 900));
    return attempt();
  }
}

/** User-friendly message when backend is unreachable or connection fails. */
export function getNetworkErrorMessage(err) {
  const code = err?.code;
  if (code === 'ECONNREFUSED' || code === 'ERR_NETWORK' || (code === 'ERR_BAD_RESPONSE' && !err?.response)) {
    return 'Cannot reach the server. Make sure the backend is running (e.g. run "npm run dev" in the backend folder).';
  }
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || (err?.message?.toLowerCase().includes('network') && !err?.response)) {
    return 'Connection was reset or timed out. The server may be busy or restarted. Try again.';
  }
  return err?.response?.data?.message || err?.message || 'Request failed.';
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
