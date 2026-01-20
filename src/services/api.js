// FILE: frontend/src/services/api.js
// ✅ OPTIMIZED: Cleaner logging, better error filtering, enhanced token refresh

import axios from 'axios';

// Create axios instance WITHOUT default Content-Type header
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  withCredentials: true,
});

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Helper to check if error should be logged
const shouldLogError = (error) => {
  const url = error.config?.url || '';
  const status = error.response?.status;
  
  // Don't log expected 404s for session checks
  if (status === 404 && url.includes('/sessions/active/current')) {
    return false;
  }
  
  // Don't log expected 400s for session end (already ended)
  if (status === 400 && url.includes('/sessions/') && url.includes('/end')) {
    return false;
  }
  
  return true;
};

// --- Request Interceptor ---
api.interceptors.request.use(
  (config) => {
    // Only log non-polling requests in development
    const isPolling = config.url?.includes('/active/current') || 
                     config.url?.includes('/metrics') ||
                     config.url?.includes('/live');
    
    if (process.env.NODE_ENV === 'development' && !isPolling) {
      console.log('📤 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
      });
    }
    
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// --- Response Interceptor ---
api.interceptors.response.use(
  (response) => {
    // Only log non-polling responses in development
    const isPolling = response.config.url?.includes('/active/current') || 
                     response.config.url?.includes('/metrics') ||
                     response.config.url?.includes('/live');
    
    if (process.env.NODE_ENV === 'development' && !isPolling) {
      console.log('📥 API Response:', {
        method: response.config.method?.toUpperCase(),
        url: response.config.url,
        status: response.status,
      });
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Log only significant errors
    if (shouldLogError(error)) {
      console.log('📥 API Error Response:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }

    // Handle 401 Unauthorized - Token refresh logic
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        // No refresh token available, redirect to login
        isRefreshing = false;
        processQueue(error, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const { accessToken } = response.data;
        
        if (!accessToken) {
          throw new Error('No access token received');
        }

        // Update token in localStorage
        localStorage.setItem('token', accessToken);
        
        // Update authorization header for the original request
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        
        // Process queued requests
        processQueue(null, accessToken);
        isRefreshing = false;

        console.log('✅ Token refreshed successfully');
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        processQueue(refreshError, null);
        isRefreshing = false;
        
        console.error('❌ Token refresh failed:', refreshError.message);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        
        // Redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // For all other errors, just reject
    return Promise.reject(error);
  }
);

// --- API Service Definitions ---

export const authAPI = {
  register: (data) => api.post('/auth/register', data, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  login: (data) => api.post('/auth/login', data, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  logout: (refreshToken) => api.post('/auth/logout', { refreshToken }, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  getCurrentUser: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
};

export const roomsAPI = {
  getAll: () => api.get('/rooms'),
  getById: (id) => api.get(`/rooms/${id}`),
  create: (data) => api.post('/rooms', data, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  update: (id, data) => api.put(`/rooms/${id}`, data, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  delete: (id) => api.delete(`/rooms/${id}`),
  joinRoom: (code) => api.post('/rooms/join', { code }, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  
  // ✅ No Content-Type header - browser adds it with boundary
  uploadPDF: (roomId, formData) => api.post(`/rooms/${roomId}/pdf/upload`, formData),
  
  addStudent: (roomId, email) => api.post(`/rooms/${roomId}/add-student`, { studentEmail: email }, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  removeStudent: (roomId, studentId) => api.post(`/rooms/${roomId}/remove-student`, { studentId }, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  getStudents: (roomId) => api.get(`/rooms/${roomId}/students`),
  getMetrics: (roomId) => api.get(`/rooms/${roomId}/metrics`),
  getStats: () => api.get('/rooms/stats'),
};

export const routinesAPI = {
  getAll: () => api.get('/routines'),
  getById: (id) => api.get(`/routines/${id}`),
  create: (data) => api.post('/routines', data, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  update: (id, data) => api.put(`/routines/${id}`, data, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  delete: (id) => api.delete(`/routines/${id}`),
  
  // ✅ All upload endpoints - no Content-Type header
  uploadPDF: (routineId, formData) => api.post(`/routines/${routineId}/upload`, formData),
  uploadPDFs: (formData) => api.post('/routines/upload-pdfs', formData),
  uploadSubjectPDF: (routineId, formData) => api.post(`/routines/${routineId}/upload-subject-pdf`, formData),
};

export const sessionsAPI = {
  startSession: (data) => api.post('/sessions', data, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  endSession: (sessionId) => api.patch(`/sessions/${sessionId}/end`),
  getById: (sessionId) => api.get(`/sessions/${sessionId}`),
  getRecent: () => api.get('/sessions/recent'),
  getActiveSession: () => api.get('/sessions/active/current'),
  getMetrics: (sessionId) => api.get(`/sessions/${sessionId}/metrics`),
  deleteSession: (sessionId) => api.delete(`/sessions/${sessionId}`),
  getStudentSessions: (roomId, studentId) => api.get(`/sessions/room/${roomId}/student/${studentId}`),
  getRoomSummary: (roomId) => api.get(`/sessions/room/${roomId}/summary`),
  getAchievements: (studentId) => api.get(`/sessions/student/${studentId}/achievements`),
};

export const interactionsAPI = {
  saveInteraction: (sessionId, type, data) => api.post(`/interactions/${sessionId}`, { type, data }, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  saveBatch: (sessionId, interactions) => api.post(`/interactions/${sessionId}/batch`, { interactions }, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  getInteractionsBySession: (sessionId) => api.get(`/interactions/${sessionId}`),
  getOverallAnalytics: () => api.get('/interactions/analytics/overall'),
  deleteInteraction: (interactionId) => api.delete(`/interactions/${interactionId}`),
};

export const aiAPI = {
  generateInsights: (sessionId) => api.post('/ai/generate-insights', { sessionId }, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  getSummary: (data) => api.post('/ai/summary', data, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
};

export const analyticsAPI = {
  getOverallAnalytics: (params = {}) => api.get('/analytics/analytics', { params }),
  getTrends: (params = {}) => {
    if (typeof params === 'string') params = { period: params };
    return api.get('/analytics/trends', { params });
  },
  getStudyPatterns: (params = {}) => {
    if (typeof params === 'string') params = { period: params };
    return api.get('/analytics/study-patterns', { params });
  },
  getEngagementAnalysis: (params = {}) => {
    if (typeof params === 'string') params = { period: params };
    return api.get('/analytics/engagement-analysis', { params });
  },
  getHealthReport: (params = {}) => {
    if (typeof params === 'string') params = { period: params };
    return api.get('/analytics/health-report', { params });
  },
  getProductivityScore: (params = {}) => {
    if (typeof params === 'string') params = { period: params };
    return api.get('/analytics/productivity-score', { params });
  },
};

export const metricsAPI = {
  getRoomMetrics: (roomId) => api.get(`/metrics/room/${roomId}`),
  getStudentMetrics: (studentId, params = {}) => api.get(`/metrics/student/${studentId}`, { params }),
  getLiveMetrics: (roomId) => api.get(`/metrics/room/${roomId}/live`),
  getSessionMetrics: (sessionId) => api.get(`/sessions/${sessionId}/metrics`),
  getOverallMetrics: (params = {}) => api.get('/metrics/overall', { params }),
  getBySession: (sessionId) => api.get(`/metrics/session/${sessionId}`),
};

export const highlightsAPI = {
  getBySession: (sessionId) => api.get(`/highlights/session/${sessionId}`),
  create: (data) => api.post('/highlights', data, { 
    headers: { 'Content-Type': 'application/json' } 
  }),
  delete: (highlightId) => api.delete(`/highlights/${highlightId}`),
  getByRoom: (roomId) => api.get(`/highlights/room/${roomId}`),
  getByStudent: (studentId) => api.get(`/highlights/student/${studentId}`),
};

export default api;