/**
 * Custom Axios instance with auth interceptors.
 * Handles token refresh, cross-tab sync, and response envelope unwrapping.
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

// Auth utilities (to be created in features/auth/utils)
import {
  getAuthToken,
  clearAuthToken,
  setAuthToken,
} from '@/features/auth/utils/auth-cookies';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Paths that should NOT trigger token refresh on 401
const AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh-token',
  '/auth/verify-email',
  '/auth/resend-verification-email',
];

const REFRESH_COOLDOWN_MS = 1000;
let lastRefreshAttempt = 0;

type CustomConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const customInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor: Attach Bearer Token ─────────────────────────────────

customInstance.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: Unwrap Envelope + Handle 401 ────────────────────────

customInstance.interceptors.response.use(
  // Success: unwrap { data, meta } → T
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload) {
      response.data = payload.data;
    }
    return response;
  },

  // Error: handle 401 token refresh
  async (error) => {
    const originalRequest = error.config as CustomConfig;
    const requestPath = originalRequest?.url;

    // Not a 401, or an auth endpoint → reject immediately
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (requestPath && AUTH_PATHS.some((path) => requestPath.includes(path))) {
      return Promise.reject(error);
    }

    // Prevent concurrent refresh attempts
    const now = Date.now();
    if (originalRequest._retry || now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    lastRefreshAttempt = now;

    try {
      // Call refresh endpoint with credentials to send cookie
      const refreshResponse = await axios.post(
        `${API_BASE_URL}/api/v1/auth/refresh-token`,
        {},
        { withCredentials: true }
      );

      const { accessToken } = refreshResponse.data.data.token;

      if (accessToken) {
        setAuthToken(accessToken);

        // Broadcast refresh to other tabs
        if (typeof BroadcastChannel !== 'undefined') {
          new BroadcastChannel('auth').postMessage({
            type: 'TOKEN_REFRESHED',
            accessToken,
          });
        }

        // Retry original request with new token
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return customInstance(originalRequest);
      }
    } catch (refreshError) {
      clearAuthToken();

      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('auth').postMessage({ type: 'LOGGED_OUT' });
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// ─── Cross-Tab Sync ───────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  const channel = new BroadcastChannel('auth');
  channel.onmessage = (event) => {
    if (event.data.type === 'TOKEN_REFRESHED') {
      setAuthToken(event.data.accessToken);
    }
    if (event.data.type === 'LOGGED_OUT') {
      clearAuthToken();
      window.location.href = '/login';
    }
  };
}

export type { CustomConfig };

export const orvalCustomInstance = async <T>(
  config: AxiosRequestConfig
): Promise<T> => {
  const response = await customInstance.request<T>(config);
  return response.data;
};
