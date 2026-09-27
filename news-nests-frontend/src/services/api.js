import axios from 'axios';

const isServer = typeof window === 'undefined';

const getBaseUrl = () => {
  if (isServer) {
    return process.env.VITE_API_URL ? `${process.env.VITE_API_URL.replace(/\/+$/, '')}/api` : 'http://127.0.0.1:5050/api';
  }
  // If VITE_API_URL is provided in Vite env (e.g. "https://news.ritzla.in")
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.replace(/\/+$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  // When running on localhost during local dev
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://${window.location.hostname}:5000/api`;
  }
  // In production browser, use relative /api which Nginx proxies over HTTPS
  return '/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

// Interceptor to add auth token later for admin/reporter dashboards
api.interceptors.request.use(
  (config) => {
    if (!isServer) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
