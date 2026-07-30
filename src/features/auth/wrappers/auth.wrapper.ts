/**
 * Auth wrapper — handles cookie + cross-tab side-effects for the auth
 * endpoints that remain outside the registration epic (login, logout,
 * email verification, etc.).
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.E2.
 *
 * ## What this file is and is NOT
 *
 * After TKT-2.1.E2, this wrapper contains **zero references** to
 * `register`, `checkEmail`, or `checkUsername` (E2 acceptance criterion
 * 2). The registration epic's calls all flow through
 * `features/auth/service/auth.service.ts`, never through this file.
 *
 * The wrapper still exists because the login flow, logout flow, and
 * email-verification flow depend on side-effects the SDK cannot express
 * (cookie persistence, `BroadcastChannel('auth')` cross-tab sync). Those
 * side-effects live behind a single set of helpers:
 *
 *   - `setAuthToken` / `clearAuthToken` in
 *     `features/auth/utils/auth-cookies.ts`.
 *   - A module-local `broadcastAuth()` for cross-tab sync.
 *
 * Phase 3 will move `login`/`logout`/`verifyEmail`/`resendVerificationEmail`
 * into `auth.service.ts`; at that point this file can be deleted. Until
 * then it is a transitional helper.
 *
 * ## SDK access
 *
 * The wrapper does not import `axios` or any `@/lib/api/generated/**`
 * symbol directly. It only calls `getAuth()` (the public builder) so
 * the linter and the cross-epic "thin service layer" rule are both
 * satisfied.
 */

import {
  setAuthToken,
  clearAuthToken,
} from '@/features/auth/utils/auth-cookies';
import type {
  LoginRequest,
  LoginResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationRequest,
  LogoutResponse,
} from '@/features/auth/types';
import { getAuth } from '@/lib/api';

function broadcastAuth(
  payload:
    | { type: 'TOKEN_REFRESHED'; accessToken: string }
    | { type: 'LOGGED_OUT' }
) {
  if (typeof BroadcastChannel === 'undefined') return;
  new BroadcastChannel('auth').postMessage(payload);
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const data = await getAuth().authControllerLogin(payload);
  setAuthToken(data.accessToken);
  broadcastAuth({
    type: 'TOKEN_REFRESHED',
    accessToken: data.accessToken,
  });
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
    broadcastAuth({ type: 'LOGGED_OUT' });
  }
}

export async function logoutAll(): Promise<LogoutResponse> {
  try {
    return await getAuth().authControllerLogoutAll();
  } finally {
    clearAuthToken();
    broadcastAuth({ type: 'LOGGED_OUT' });
  }
}
