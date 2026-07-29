/**
 * Auth wrapper — wraps API calls with auth-specific logic.
 *
 * This layer handles:
 * - Setting tokens after login/register
 * - Cross-tab auth state sync
 * - Redirects on auth errors
 *
 * All HTTP calls go through the generated SDK (TKT-1.2.2.2). The wrapper
 * owns the cross-cutting side-effects that the SDK itself cannot express:
 * cookie persistence on the client (`setAuthToken` / `clearAuthToken`) and
 * `BroadcastChannel('auth')` events for cross-tab synchronization.
 *
 * SDK access goes through `@/lib/api` (the barrel from TKT-1.2.1.1).
 * TKT-1.2.2.4 verified that all consumers of this file import from the
 * barrel path; this file itself follows the same rule.
 */

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
import { getAuth } from '@/lib/api';

// ─── Auth Endpoints (no Bearer token needed) ────────────────────────────────────

export async function register(payload: RegisterRequest): Promise<RegisterResponse> {
  return getAuth().authControllerRegister(payload);
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const data = await getAuth().authControllerLogin(payload);

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
  return getAuth().authControllerVerifyEmail(payload);
}

export async function resendVerificationEmail(
  payload: ResendVerificationRequest
): Promise<VerifyEmailResponse> {
  return getAuth().authControllerResendVerificationEmail(payload);
}

export async function logout(): Promise<LogoutResponse> {
  try {
    return await getAuth().authControllerLogout();
  } finally {
    clearAuthToken();

    if (typeof BroadcastChannel !== 'undefined') {
      new BroadcastChannel('auth').postMessage({ type: 'LOGGED_OUT' });
    }
  }
}

export async function logoutAll(): Promise<LogoutResponse> {
  try {
    return await getAuth().authControllerLogoutAll();
  } finally {
    clearAuthToken();

    if (typeof BroadcastChannel !== 'undefined') {
      new BroadcastChannel('auth').postMessage({ type: 'LOGGED_OUT' });
    }
  }
}