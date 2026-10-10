import axios, { AxiosError } from 'axios';

const baseURL = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '/api';

export const TOKEN_KEY = 'wastelink.token';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Extracts a readable message from an API error. */
export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<{ message?: string; details?: { field: string; message: string }[] }>;
    const data = err.response?.data;
    if (data?.details?.length) {
      return data.details.map((d) => `${d.field}: ${d.message}`).join(', ');
    }
    if (data?.message) return data.message;
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
    return err.message;
  }
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

// --- Auth ---------------------------------------------------------------
export const authApi = {
  register: (body: { name: string; email: string; password: string; phone?: string; role: string }) =>
    api.post('/auth/register', body),
  login: (body: { email: string; password: string }) => api.post('/auth/login', body),
  google: (body: { idToken: string; role?: string }) => api.post('/auth/google', body),
  me: () => api.get('/auth/me'),
  updateProfile: (body: { name?: string; phone?: string; password?: string }) => api.put('/auth/profile', body),
  logout: () => api.post('/auth/logout'),
};

// --- Categories ---------------------------------------------------------
export const categoryApi = {
  list: () => api.get('/categories'),
};

// --- Listings -----------------------------------------------------------
export const listingApi = {
  create: (body: { categoryId: number; quantity: number; unit: string; location: string; description?: string }) =>
    api.post('/listings', body),
  mine: (params?: Record<string, unknown>) => api.get('/listings/mine', { params }),
  available: (params?: Record<string, unknown>) => api.get('/listings/available', { params }),
  get: (id: number) => api.get(`/listings/${id}`),
  update: (id: number, body: Record<string, unknown>) => api.put(`/listings/${id}`, body),
  cancel: (id: number) => api.patch(`/listings/${id}/cancel`),
  remove: (id: number) => api.delete(`/listings/${id}`),
};

// --- Collectors ---------------------------------------------------------
export const collectorApi = {
  me: () => api.get('/collectors/me'),
  update: (body: Record<string, unknown>) => api.put('/collectors/me', body),
  recommendations: () => api.get('/collectors/recommendations'),
};

// --- Pickups ------------------------------------------------------------
export const pickupApi = {
  create: (body: { listingId: number; message?: string }) => api.post('/pickups/requests', body),
  forProducer: (params?: Record<string, unknown>) => api.get('/pickups/requests/producer', { params }),
  forCollector: (params?: Record<string, unknown>) => api.get('/pickups/requests/collector', { params }),
  get: (id: number) => api.get(`/pickups/requests/${id}`),
  accept: (id: number) => api.patch(`/pickups/requests/${id}/accept`),
  reject: (id: number) => api.patch(`/pickups/requests/${id}/reject`),
  schedule: (id: number, body: { scheduledDate: string; notes?: string }) =>
    api.post(`/pickups/requests/${id}/schedule`, body),
  updateStatus: (id: number, status: string) => api.patch(`/pickups/requests/${id}/status`, { status }),
  history: () => api.get('/pickups/history'),
  feedback: (body: { pickupId: number; rating: number; comment?: string }) => api.post('/pickups/feedback', body),
  feedbackFor: (pickupId: number) => api.get(`/pickups/feedback/${pickupId}`),
};

// --- Organizations ------------------------------------------------------
export const organizationApi = {
  me: () => api.get('/organizations/me'),
  update: (body: Record<string, unknown>) => api.put('/organizations/me', body),
  listings: () => api.get('/organizations/listings'),
  stats: () => api.get('/organizations/stats'),
};

// --- Admin --------------------------------------------------------------
export const adminApi = {
  stats: () => api.get('/admin/stats'),
  users: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  setUserActive: (id: number, isActive: boolean) => api.patch(`/admin/users/${id}/active`, { isActive }),
  collectors: (params?: Record<string, unknown>) => api.get('/admin/collectors', { params }),
  verifyCollector: (id: number, status: string) => api.patch(`/admin/collectors/${id}/verify`, { status }),
  listings: () => api.get('/admin/listings'),
  categories: () => api.get('/admin/categories'),
  createCategory: (body: { categoryName: string; description?: string }) => api.post('/admin/categories', body),
  updateCategory: (id: number, body: { categoryName: string; description?: string }) =>
    api.put(`/admin/categories/${id}`, body),
  deleteCategory: (id: number) => api.delete(`/admin/categories/${id}`),
  pickups: () => api.get('/admin/pickups'),
  activities: (limit = 100) => api.get('/admin/activities', { params: { limit } }),
};

// --- Notifications ------------------------------------------------------
export const notificationApi = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};
