import axios from 'axios';

const isServer = typeof window === 'undefined';
const host = isServer ? 'localhost' : window.location.hostname;

const api = axios.create({
  // Dynamically points to the host's IP so mobile devices connect to the correct backend
  baseURL: `http://${host}:5000/api`,
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
