import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor: attach access token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor: single-flight token refresh
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) throw new Error('No refresh token available');
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      const { access_token, refresh_token: newRefresh } = data.data;
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', newRefresh);
      return access_token;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function handleAuthFailure() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    // If another request (or another tab) already refreshed the token, just retry.
    const staleAuth = originalRequest.headers?.Authorization;
    const current = localStorage.getItem('access_token');
    if (current && `Bearer ${current}` !== staleAuth) {
      originalRequest.headers.Authorization = `Bearer ${current}`;
      return api(originalRequest);
    }

    if (!localStorage.getItem('refresh_token')) {
      handleAuthFailure();
      return Promise.reject(error);
    }

    try {
      const access_token = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${access_token}`;
      return api(originalRequest);
    } catch {
      handleAuthFailure();
      return Promise.reject(error);
    }
  },
);
