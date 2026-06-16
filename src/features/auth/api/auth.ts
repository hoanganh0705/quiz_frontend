/**
 * Auth API layer.
 *
 * @deprecated Use wrappers instead:
 * - import { login, register, logout, ... } from '@/features/auth/wrappers/auth.wrapper'
 */

import {
  register as registerApi,
  login,
  verifyEmail as verifyEmailApi,
  resendVerificationEmail as resendVerificationEmailApi,
  logout,
  logoutAll,
} from '@/features/auth/wrappers/auth.wrapper';
import type {
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
} from '@/features/auth/types';

export const authApi = {
  register: registerApi,
  login,
  verifyEmail: verifyEmailApi,
  resendVerificationEmail: resendVerificationEmailApi,
  logout,
  logoutAll,
};

export async function registerUser(payload: RegisterRequest) {
  return registerApi(payload);
}

export async function loginUser(payload: LoginRequest) {
  return login(payload);
}

export async function refreshToken() {
  throw new Error(
    'refreshToken() is deprecated. Token refresh is handled automatically by the API client.'
  );
}

export async function logoutUser() {
  return logout();
}

export async function logoutAllSessions() {
  return logoutAll();
}

export async function verifyEmail(payload: VerifyEmailRequest) {
  return verifyEmailApi(payload);
}

export async function resendVerificationEmail(payload: ResendVerificationRequest) {
  return resendVerificationEmailApi(payload);
}

export async function forgotPassword(_payload: { email: string }) {
  throw new Error('forgotPassword is not implemented. Backend does not support this endpoint.');
}

export async function resetPassword(_payload: { token: string; password: string }) {
  throw new Error('resetPassword is not implemented. Backend does not support this endpoint.');
}

export async function getSocialAuthUrl(_provider: string) {
  throw new Error('getSocialAuthUrl is not implemented. Backend does not support OAuth yet.');
}
