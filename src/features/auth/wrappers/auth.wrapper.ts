/**
 * Auth wrapper — handles cookie + cross-tab side-effects for the auth
 * endpoints that remain outside the registration epic (login, logout).
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.E2.
 *
 * After TKT-2.2.E2, this wrapper contains **zero references** to
 * `register`, `checkEmail`, `checkUsername`, `verifyEmail`, or
 * `resendVerificationEmail`. All of those calls flow through
 * `features/auth/service/auth.service.ts`. The wrapper is reserved
 * for the side-effecting endpoints that the SDK cannot express:
 * `login` (sets cookie + broadcasts), `logout` (clears cookie +
 * broadcasts), and `logoutAll` (same).
 *
 * Phase 3 will move `login`/`logout`/`logoutAll` into
 * `auth.service.ts`; at that point this file can be deleted. Until
 * then it is a transitional helper.
 *
 * ## SDK access
 *
 * The wrapper does not import `axios` or any
 * `@/lib/api/generated/**` symbol directly. It only calls
 * `getAuth()` (the public builder) so the linter and the
 * cross-epic "thin service layer" rule are both satisfied.
 */

import {
  setAuthToken,
  clearAuthToken,
} from '@/features/auth/utils/auth-cookies';
import type {
  LoginRequest,
  LoginResponse,
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
