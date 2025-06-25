import axios from 'axios';
import { ApiResponse, PaginatedResponse } from '@/types';

// Create axios instance with default config
export const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generic API wrapper
export const apiRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  config?: any
): Promise<ApiResponse<T>> => {
  try {
    const response = await api.request({
      method,
      url,
      data,
      ...config,
    });
    return { data: response.data };
  } catch (error: any) {
    return {
      error: {
        message: error.response?.data?.error?.message || error.message || 'An error occurred',
        status: error.response?.status || 500,
        details: error.response?.data?.error?.details,
      },
    };
  }
};

// Specific API methods
export const authApi = {
  login: (email: string, password: string) =>
    apiRequest('POST', '/auth/login', { email, password }),
  
  register: (userData: any) =>
    apiRequest('POST', '/auth/register', userData),
  
  refresh: () =>
    apiRequest('POST', '/auth/refresh'),
  
  logout: () =>
    apiRequest('POST', '/auth/logout'),
};

export const userApi = {
  getProfile: () =>
    apiRequest('GET', '/users/profile'),
  
  updateProfile: (userData: any) =>
    apiRequest('PUT', '/users/profile', userData),
  
  getUsers: (params?: any) =>
    apiRequest('GET', '/users', null, { params }),
  
  getUser: (userId: string) =>
    apiRequest('GET', `/users/${userId}`),
  
  updateUser: (userId: string, userData: any) =>
    apiRequest('PUT', `/users/${userId}`, userData),
  
  deleteUser: (userId: string) =>
    apiRequest('DELETE', `/users/${userId}`),

  assignCertification: (userId: string, assignment: any) =>
    apiRequest('POST', `/users/${userId}/assign-certification`, assignment),

  assignPathway: (userId: string, pathwayData: any) =>
    apiRequest('POST', `/users/${userId}/assign-pathway`, pathwayData),

  updateUserCertification: (userId: string, certId: string, certData: any) =>
    apiRequest('PUT', `/users/${userId}/certifications/${certId}`, certData),

  deleteUserCertification: (userId: string, certId: string) =>
    apiRequest('DELETE', `/users/${userId}/certifications/${certId}`),

  getUserPathways: (userId: string) =>
    apiRequest('GET', `/users/${userId}/pathways`),
};

export const certificationApi = {
  getUserCertifications: (params?: any) =>
    apiRequest('GET', '/certifications', null, { params }),
  
  addCertification: (certData: FormData) =>
    apiRequest('POST', '/certifications', certData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  updateCertification: (certId: string, certData: FormData) =>
    apiRequest('PUT', `/certifications/${certId}`, certData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  deleteCertification: (certId: string) =>
    apiRequest('DELETE', `/certifications/${certId}`),
  
  getCatalog: (params?: any) =>
    apiRequest('GET', '/certifications/catalog', null, { params }),
};

export const adminApi = {
  getPendingCertifications: () =>
    apiRequest('GET', '/admin/pending-certifications'),
  
  getApprovalHistory: () =>
    apiRequest('GET', '/admin/approval-history'),
  
  approveCertification: (submissionId: string, adminComments?: string) =>
    apiRequest('PUT', `/admin/certifications/${submissionId}/status`, {
      status: 'APPROVED',
      adminComments
    }),
  
  rejectCertification: (submissionId: string, rejectionReason: string, adminComments?: string) =>
    apiRequest('PUT', `/admin/certifications/${submissionId}/status`, {
      status: 'REJECTED',
      rejectionReason,
      adminComments
    }),
  
  getDashboardStats: () =>
    apiRequest('GET', '/admin/dashboard-stats'),
};

export const vendorApi = {
  getVendors: () =>
    apiRequest('GET', '/vendors'),
  
  getRequirements: () =>
    apiRequest('GET', '/vendors/requirements'),
  
  createVendor: (vendorData: any) =>
    apiRequest('POST', '/vendors', vendorData),
};

export const searchApi = {
  globalSearch: (query: string, type?: string) =>
    apiRequest('GET', '/search', null, { params: { q: query, type } }),
  
  advancedSearch: (filters: any) =>
    apiRequest('POST', '/search/advanced', filters),
};

export const reportApi = {
  getExpiringCertifications: (days?: number) =>
    apiRequest('GET', '/reports/expiring', null, { params: { days } }),
  
  getBonusEligible: () =>
    apiRequest('GET', '/reports/bonuses'),
};

export const notificationApi = {
  getConfig: () =>
    apiRequest('GET', '/notifications/config'),
  
  updateConfig: (config: any) =>
    apiRequest('PUT', '/notifications/config', config),
  
  getLogs: (params?: { page?: number; limit?: number }) =>
    apiRequest('GET', '/notifications/logs', null, { params }),
  
  getExpiringCertifications: (params?: { days?: number }) =>
    apiRequest('GET', '/notifications/expiring-certifications', null, { params }),
  
  testEmail: (data: { email: string; type?: string }) =>
    apiRequest('POST', '/notifications/test-email', data),
  
  snoozeReminder: (certId: string, days: number) =>
    apiRequest('POST', `/notifications/snooze/${certId}`, { days }),
  
  getStats: () =>
    apiRequest('GET', '/notifications/stats'),
  
  triggerReminders: () =>
    apiRequest('POST', '/notifications/trigger-reminders'),
};

export const pathwayApi = {
  getPathways: () =>
    apiRequest('GET', '/pathways'),
  
  getUserPathways: (userId: string) =>
    apiRequest('GET', `/users/${userId}/pathways`),
  
  assignPathway: (userId: string, pathwayId: string) =>
    apiRequest('POST', `/users/${userId}/assign-pathway`, { pathwayId }),
};

export const certificationMasterApi = {
  getCertifications: (params?: any) =>
    apiRequest('GET', '/admin/certifications', null, { params }),
  
  addCertification: (certData: any) =>
    apiRequest('POST', '/admin/certifications', certData),
  
  updateCertification: (certId: string, certData: any) =>
    apiRequest('PUT', `/admin/certifications/${certId}`, certData),
  
  deleteCertification: (certId: string) =>
    apiRequest('DELETE', `/admin/certifications/${certId}`),
  
  getCertification: (certId: string) =>
    apiRequest('GET', `/admin/certifications/${certId}`),

  // Master catalog browsing
  getMasterCatalog: (params?: any) =>
    apiRequest('GET', '/certifications/master-catalog', null, { params }),

  // Validation endpoints
  validateCertificationAssignment: (userId: string, certificationId: string) =>
    apiRequest('POST', '/certifications/validate-assignment', { userId, certificationId }),

  // Assignment endpoints with master data
  assignCertificationToUser: (userId: string, assignment: any) =>
    apiRequest('POST', `/users/${userId}/assign-certification`, assignment),

  // Bulk operations
  bulkAssignCertifications: (assignments: any[]) =>
    apiRequest('POST', '/certifications/bulk-assign', { assignments }),
};

// File upload utility
export const uploadFile = async (file: File, endpoint: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data.url;
};

export default api;