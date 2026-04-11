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

// Create axios instance with credentials support
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Send cookies with requests (required for httpOnly cookies)
});

// Request interceptor - add CSRF token and Authorization header
api.interceptors.request.use(
  (config) => {
    // Add CSRF token for state-changing requests
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
      const csrfToken = getCSRFToken();
      if (csrfToken) {
        console.log(`[API] Adding CSRF token to ${config.method.toUpperCase()} ${config.url}`);
        config.headers['X-CSRF-Token'] = csrfToken;
      } else {
        console.warn(`[API] No CSRF token found for ${config.method.toUpperCase()} ${config.url}`);
      }
    }

    // CRITICAL: Add Authorization header with token from localStorage
    // This is a fallback when cookies are stripped by Cloudflare/proxy
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log(`[API] Adding Authorization header to ${config.method.toUpperCase()} ${config.url}`);
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
      console.log('[API] CSRF token received from response headers:', csrfToken.substring(0, 10) + '...');
      setCSRFToken(csrfToken);
    } else if (response.config.url?.includes('/auth/login')) {
      // For login responses, try to get CSRF token from cookies
      console.log('[API] Login response received, checking for CSRF token in cookies...');
      const match = document.cookie.match(/csrf_token=([a-f0-9]+)/);
      if (match) {
        console.log('[API] CSRF token found in cookies after login:', match[1].substring(0, 10) + '...');
        setCSRFToken(match[1]);
      } else {
        console.warn('[API] No CSRF token found in cookies after login');
      }
    }
    return response;
  },
  (error) => {
    // Extract CSRF token from error response headers too
    if (error.response?.headers?.['x-csrf-token']) {
      setCSRFToken(error.response.headers['x-csrf-token']);
    }

    // Log detailed error information for debugging
    console.error('[API] Error occurred:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      cookies: document.cookie
    });

    if (error.response?.status === 401) {
      // Clear local storage on auth failure
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('csrf_token');

      // Only redirect to login if not already on an auth-related page
      const currentPath = window.location.pathname;
      const authPaths = ['/login', '/', '/register', '/reset-password'];
      if (!authPaths.includes(currentPath)) {
        console.warn('[API] 401 Unauthorized, redirecting to login from:', currentPath);
        window.location.href = '/login';
      }
    }

    // Handle CSRF token errors
    if (error.response?.status === 403 && error.response?.data?.message?.includes('CSRF')) {
      console.error('[API] CSRF token validation failed. Clearing and reloading...');
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
  changePassword: (data) => api.post('/auth/change-password', data),
  logout: () => api.post('/auth/logout')
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
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
  exportProctoringReport: (examId) => api.get(`/proctoring/export/${examId}`),
  // AI Proctoring endpoints
  saveSnapshot: (data) => api.post('/proctoring/snapshots', data),
  getSessionSnapshots: (sessionId) => api.get(`/proctoring/snapshots/${sessionId}`),
  getExamEvidenceGallery: (examId, params) => api.get(`/proctoring/evidence/${examId}`, { params }),
  // Cheating Detection endpoints
  getStudentCheatingData: (sessionId) => api.get(`/proctoring/cheating/${sessionId}`),
  getExamCheatingSummary: (examId) => api.get(`/proctoring/cheating-summary/${examId}`)
};

// Upload API for images (questions, options, etc.)
export const uploadAPI = {
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    // Note: Backend upload endpoint needs to be implemented
    // For now, this returns a local URL for preview
    return {
      data: {
        url: URL.createObjectURL(file),
        filename: file.name
      }
    };
  }
};

export default api;
