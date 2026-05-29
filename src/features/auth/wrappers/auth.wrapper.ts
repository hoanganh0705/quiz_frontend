/**
 * Auth wrapper — wraps API calls with auth-specific logic.
 *
 * This layer handles:
 * - Setting tokens after login/register
 * - Cross-tab auth state sync
 * - Redirects on auth errors
 */

import { authOnlyInstance } from '@/lib/api/core/auth-only-instance';
import { customInstance } from '@/lib/api/core/custom-instance';
import {
  setAuthToken,
  clearAuthToken,
} from '@/features/auth/utils/auth-cookies';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationRequest,
  LogoutResponse,
} from '@/features/auth/types';

// ─── Auth Endpoints (no Bearer token needed) ────────────────────────────────────

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  const response = await authOnlyInstance.post<RegisterResponse>(
    '/auth/register',
    payload
  );
  return response.data;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await authOnlyInstance.post<LoginResponse>(
    '/auth/login',
    payload
  );
  const data = response.data;

  setAuthToken(data.accessToken);

  if (typeof BroadcastChannel !== 'undefined') {
    new BroadcastChannel('auth').postMessage({
      type: 'TOKEN_REFRESHED',
      accessToken: data.accessToken,
    });
  }

  return data;
}

export async function verifyEmail(
  payload: VerifyEmailRequest
): Promise<VerifyEmailResponse> {
  const response = await authOnlyInstance.post<VerifyEmailResponse>(
    '/auth/verify-email',
    payload
  );
  return response.data;
}

export async function resendVerificationEmail(
  payload: ResendVerificationRequest
): Promise<VerifyEmailResponse> {
  const response = await authOnlyInstance.post<VerifyEmailResponse>(
    '/auth/resend-verification-email',
    payload
  );
  return response.data;
}

export async function logout(): Promise<LogoutResponse> {
  try {
    const response = await customInstance.post<LogoutResponse>(
      '/auth/logout'
    );
    return response.data;
  } finally {
    clearAuthToken();

    if (typeof BroadcastChannel !== 'undefined') {
      new BroadcastChannel('auth').postMessage({ type: 'LOGGED_OUT' });
    }
  }
}

export async function logoutAll(): Promise<LogoutResponse> {
  try {
    const response = await customInstance.post<LogoutResponse>(
      '/auth/logout-all'
    );
    return response.data;
  } finally {
    clearAuthToken();

    if (typeof BroadcastChannel !== 'undefined') {
      new BroadcastChannel('auth').postMessage({ type: 'LOGGED_OUT' });
    }
  }
}
