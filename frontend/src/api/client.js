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
