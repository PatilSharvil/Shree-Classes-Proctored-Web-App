import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add token
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

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me')
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
  getSessionViolations: (sessionId) => api.get(`/proctoring/violations/${sessionId}`),
  checkAutoSubmit: (sessionId) => api.get(`/proctoring/check-submit/${sessionId}`),
  getExamStats: (examId) => api.get(`/proctoring/stats/${examId}`),
  getBreakdown: (params) => api.get('/proctoring/breakdown', { params }),
  clearViolations: (sessionId) => api.delete(`/proctoring/violations/${sessionId}`)
};

export default api;
