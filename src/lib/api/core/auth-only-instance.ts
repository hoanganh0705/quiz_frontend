/**
 * Auth-specific Axios instance for login/register/refresh endpoints.
 * Does NOT attach auth token (users aren't authenticated yet).
 * Does NOT trigger token refresh on 401 (would cause infinite loops).
 * Automatically unwraps { data, meta } response envelope.
 */

import axios, { AxiosInstance } from 'axios';

import { unwrapEnvelope, isEnvelopeResult, isNullResult } from './unwrap';

/**
 * Legacy-compatible unwrap: returns the inner payload when the
 * response carries `{ data, meta }`, the primitive when the response
 * is a primitive, or the original payload when there is no envelope.
 * Mirrors the original flat-return `unwrapEnvelope` behaviour so the
 * response interceptor's `response.data = ...` assignment stays
 * type-stable regardless of the wire shape.
 */
function unwrapResponseData(payload: unknown): unknown {
  const result = unwrapEnvelope(payload);
  if (isEnvelopeResult(result)) return result.value;
  if (isNullResult(result)) return null;
  return result.value;
}

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
  response.data = unwrapResponseData(response.data);
  return response;
});
