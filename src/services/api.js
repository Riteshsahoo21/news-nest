import axios from 'axios';

const api = axios.create({
  // Dynamically points to the host's IP so mobile devices connect to the correct backend
  baseURL: `http://${window.location.hostname}:5000/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add auth token later for admin/reporter dashboards
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
