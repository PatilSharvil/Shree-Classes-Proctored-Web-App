import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// CSRF Token management
const getCSRFToken = () => {
  // Try to get from cookie first
  const match = document.cookie.match(/csrf_token=([a-f0-9]+)/);
  if (match) {
    return match[1];
  }
  // Try localStorage as fallback
  return localStorage.getItem('csrf_token');
};

const setCSRFToken = (token) => {
  // Store in localStorage as backup
  localStorage.setItem('csrf_token', token);
};

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Send cookies with requests
});

// Request interceptor - add token and CSRF
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token for state-changing requests
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken;
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and CSRF tokens
api.interceptors.response.use(
  (response) => {
    // Extract and store CSRF token from response headers
    const csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      setCSRFToken(csrfToken);
    }
    return response;
  },
  (error) => {
    // Extract CSRF token from error response headers too
    if (error.response?.headers?.['x-csrf-token']) {
      setCSRFToken(error.response.headers['x-csrf-token']);
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle CSRF token errors
    if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
      // Clear invalid token and reload to get new one
      localStorage.removeItem('csrf_token');
      document.cookie = 'csrf_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      window.location.reload();
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data)
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

// Exams API
export const examsAPI = {
  getAll: (params) => api.get('/exams', { params }),
  getActive: () => api.get('/exams/active'),
  getById: (id) => api.get(`/exams/${id}`),
  getStats: (id) => api.get(`/exams/${id}/stats`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  checkAvailability: (id) => api.get(`/exams/${id}/availability`)
};

// Questions API
export const questionsAPI = {
  getByExam: (examId, params) => api.get(`/exams/${examId}/questions`, { params }),
  getById: (id) => api.get(`/questions/${id}`),
  add: (examId, data) => api.post(`/exams/${examId}/questions`, data),
  addBulk: (examId, data) => api.post(`/exams/${examId}/questions/bulk`, data),
  upload: (examId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/exams/${examId}/questions/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`)
};

// Attempts API
export const attemptsAPI = {
  start: (examId) => api.post('/attempts/start', { examId }),
  getActive: (examId) => api.get(`/attempts/active/${examId}`),
  saveResponse: (sessionId, data) => api.post(`/attempts/${sessionId}/respond`, data),
  updateQuestion: (sessionId, index) => api.put(`/attempts/${sessionId}/question`, { index }),
  submit: (sessionId) => api.post(`/attempts/${sessionId}/submit`),
  getHistory: (params) => api.get('/attempts/history', { params }),
  getDetails: (sessionId) => api.get(`/attempts/${sessionId}/details`),
  getExamAttempts: (examId) => api.get(`/attempts/exam/${examId}`)
};

// Proctoring API
export const proctoringAPI = {
  recordViolation: (data) => api.post('/proctoring/violations', data),
  logActivity: (data) => api.post('/proctoring/log', data),
  getSessionViolations: (sessionId) => api.get(`/proctoring/violations/${sessionId}`),
  getSessionActivityLogs: (sessionId, limit) => api.get(`/proctoring/activity/${sessionId}`, { params: { limit } }),
  getSessionActivityTimeline: (sessionId) => api.get(`/proctoring/timeline/${sessionId}`),
  checkAutoSubmit: (sessionId) => api.get(`/proctoring/check-submit/${sessionId}`),
  getViolationScore: (sessionId) => api.get(`/proctoring/score/${sessionId}`),
  getExamStats: (examId) => api.get(`/proctoring/stats/${examId}`),
  getExamActivitySummary: (examId) => api.get(`/proctoring/summary/${examId}`),
  getLiveActiveSessions: (examId) => api.get(`/proctoring/live/${examId}`),
  getBreakdown: (params) => api.get('/proctoring/breakdown', { params }),
  getViolationPatterns: () => api.get('/proctoring/patterns'),
  clearViolations: (sessionId) => api.delete(`/proctoring/violations/${sessionId}`),
  exportProctoringReport: (examId) => api.get(`/proctoring/export/${examId}`)
};

export default api;
