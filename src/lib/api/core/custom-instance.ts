/**
 * Custom Axios instance with auth interceptors.
 * Handles token refresh, cross-tab sync, and response envelope unwrapping.
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';

import { unwrapEnvelope } from './unwrap';
import { ApiError } from './ApiError';

const fromAxios = ApiError.fromAxios.bind(ApiError);

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

type CustomConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * Module-level Promise-share for the refresh endpoint.
 *
 * Source ticket: TKT-1.4.2.3 (Epic 1.4, US-1.4.2).
 *
 * When the first concurrent 401 hits the interceptor, this is set to a
 * Promise<string> wrapping the refresh call. Subsequent concurrent 401s
 * `await inFlightRefresh` instead of firing a second refresh call. The
 * Promise is reset to `null` in a `finally` block so a later (legitimate)
 * refresh can fire fresh.
 */
let inFlightRefresh: Promise<string> | null = null;

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
    response.data = unwrapEnvelope(response.data);
    return response;
  },

  // Error: handle 401 token refresh
  async (error) => {
    const originalRequest = error.config as CustomConfig;
    const requestPath = originalRequest?.url;

    // Not a 401, or an auth endpoint → reject immediately
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(fromAxios(error));
    }

    if (requestPath && AUTH_PATHS.some((path) => requestPath.includes(path))) {
      return Promise.reject(fromAxios(error));
    }

    // Prevent the same retried request from triggering a second refresh.
    if (originalRequest._retry) {
      clearAuthToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(fromAxios(error));
    }

    originalRequest._retry = true;

    try {
      // Reuse an in-flight refresh (concurrent 401s) or kick off a fresh one.
      const accessToken = await (inFlightRefresh ??= doRefresh());

      // Retry original request with new token
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return customInstance(originalRequest);
    } catch {
      clearAuthToken();

      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('auth').postMessage({ type: 'LOGGED_OUT' });
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    } finally {
      // Reset the in-flight slot so a later request (e.g. 5 minutes after
      // the refresh resolves) can fire a fresh refresh.
      inFlightRefresh = null;
    }

    return Promise.reject(fromAxios(error));
  }
);

/**
 * Run the refresh-token flow exactly once. Returns the new access token on
 * success, throws on failure. Captured in a module-level Promise by
 * `inFlightRefresh` so concurrent 401s share the same network call.
 */
async function doRefresh(): Promise<string> {
  const refreshResponse = await axios.post(
    `${API_BASE_URL}/api/v1/auth/refresh-token`,
    {},
    { withCredentials: true }
  );

  const { accessToken } = refreshResponse.data.data;

  if (typeof accessToken !== 'string' || accessToken.length === 0) {
    throw new Error('Refresh token response missing accessToken');
  }

  setAuthToken(accessToken);

  // Broadcast refresh to other tabs
  if (typeof BroadcastChannel !== 'undefined') {
    new BroadcastChannel('auth').postMessage({
      type: 'TOKEN_REFRESHED',
      accessToken,
      timestamp: Date.now(),
    });
  }

  return accessToken;
}

export { doRefresh as refreshAccessToken };

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
