import { createContext, useState, useEffect, useContext } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const isServer = typeof window === 'undefined';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (isServer) return null;
    const storedUser = localStorage.getItem('user');
    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLatestUser = async (token, storedUserStr) => {
      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.get('/user/me');
        const latestUser = { ...(storedUserStr ? JSON.parse(storedUserStr) : {}), ...res.data };
        localStorage.setItem('user', JSON.stringify(latestUser));
        setUser(latestUser);
        return latestUser;
      } catch (e) {
        console.error("Failed to fetch latest user", e);
        if (e.response && (e.response.status === 401 || e.response.status === 403)) {
          logout();
        }
      }
    };

    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        await fetchLatestUser(token, storedUser).catch(() => {});
      }
    };

    if (!isServer) {
      initializeAuth();
    }
  }, []);

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        const res = await api.get('/user/me');
        const currentUserStr = localStorage.getItem('user');
        const latestUser = { ...(currentUserStr ? JSON.parse(currentUserStr) : {}), ...res.data };
        localStorage.setItem('user', JSON.stringify(latestUser));
        setUser(latestUser);
      } catch (e) {
        console.error("Failed to refresh user", e);
      }
    }
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, user: baseUserData } = response.data;
    
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    try {
      const res = await api.get('/user/me');
      const fullUserData = { ...baseUserData, ...res.data };
      localStorage.setItem('user', JSON.stringify(fullUserData));
      setUser(fullUserData);
    } catch (e) {
      localStorage.setItem('user', JSON.stringify(baseUserData));
      setUser(baseUserData);
    }
    
    return response.data;
  };

  const register = async (userData) => {
    const response = await api.post('/auth/register', userData);
    const { token, user: baseUserData } = response.data;
    
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    try {
      const res = await api.get('/user/me');
      const fullUserData = { ...baseUserData, ...res.data };
      localStorage.setItem('user', JSON.stringify(fullUserData));
      setUser(fullUserData);
    } catch (e) {
      localStorage.setItem('user', JSON.stringify(baseUserData));
      setUser(baseUserData);
    }
    
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      
      const response = await api.post('/auth/google', { idToken });
      const { token, user: baseUserData } = response.data;
      
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      try {
        const res = await api.get('/user/me');
        const fullUserData = { ...baseUserData, ...res.data };
        localStorage.setItem('user', JSON.stringify(fullUserData));
        setUser(fullUserData);
      } catch (e) {
        localStorage.setItem('user', JSON.stringify(baseUserData));
        setUser(baseUserData);
      }
      
      return response.data;
    } catch (error) {
      console.error("Google sign in error", error);
      throw error;
    }
  };

  const sendRegistrationOTP = async (userData) => {
    const response = await api.post('/auth/send-otp', userData);
    return response.data;
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    sendRegistrationOTP,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
