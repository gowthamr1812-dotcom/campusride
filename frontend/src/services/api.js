import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: Attach JWT token if stored
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campusride_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Extract structured errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    let errorMessage = 'An unexpected network error occurred.';
    let errorCode = 'NETWORK_ERROR';
    
    if (error.response) {
      if (error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error.message || errorMessage;
        errorCode = error.response.data.error.code || errorCode;
      } else if (error.response.data && error.response.data.detail) {
        errorMessage = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      } else {
        errorMessage = `Request failed with status code ${error.response.status}`;
      }
      
      // Auto-handle 401 unauthorized
      if (error.response.status === 401) {
        localStorage.removeItem('campusride_token');
        localStorage.removeItem('campusride_user');
      }
    } else if (error.request) {
      errorMessage = 'Backend server is not responding. Please verify server status.';
      errorCode = 'SERVER_UNREACHABLE';
    }

    return Promise.reject({
      message: errorMessage,
      code: errorCode,
      status: error.response ? error.response.status : null,
      raw: error,
    });
  }
);

export const healthApi = {
  getHealth: () => api.get('/health'),
};

export default api;
