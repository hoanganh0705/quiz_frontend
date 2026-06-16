/**
 * Auth-specific Axios instance for login/register/refresh endpoints.
 * Does NOT attach auth token (users aren't authenticated yet).
 * Does NOT trigger token refresh on 401 (would cause infinite loops).
 * Automatically unwraps { data, meta } response envelope.
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const authOnlyInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor: unwrap { data, meta } → T
authOnlyInstance.interceptors.response.use((response) => {
  const payload = response.data;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    response.data = payload.data;
  }
  return response;
});
