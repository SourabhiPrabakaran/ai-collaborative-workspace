import axios from 'axios';

const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  if (!url.endsWith('/api') && !url.endsWith('/api/')) {
    return url.endsWith('/') ? `${url}api` : `${url}/api`;
  }
  return url;
};

const API_BASE_URL = getApiUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for sending/receiving JWT HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to format errors consistently
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || 'An unexpected error occurred';
    const status = error.response?.status || 500;
    
    // Return a structured error object
    return Promise.reject({
      message,
      status,
      success: false,
      originalError: error
    });
  }
);

export default api;
