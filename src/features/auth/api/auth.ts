import { apiClient } from '@/shared/lib/api/client'
import type {
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SocialProvider,
  LoginResponse,
  RegisterResponse,
  LogoutResponse,
  RefreshTokenResponse,
  VerifyEmailResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
  SocialAuthResponse
} from '@/features/auth/types'

export async function registerUser(payload: RegisterRequest) {
  const response = await apiClient.post<RegisterResponse>('/auth/register', payload)
  return response.data
}

export async function loginUser(payload: LoginRequest) {
  const response = await apiClient.post<LoginResponse>('/auth/login', payload)
  return response.data
}

export async function refreshToken() {
  const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh-token')
  return response.data
}

export async function logout() {
  const response = await apiClient.post<LogoutResponse>('/auth/logout')
  return response.data
}

export async function logoutAll() {
  const response = await apiClient.post<LogoutResponse>('/auth/logout-all')
  return response.data
}

export async function verifyEmail(payload: VerifyEmailRequest) {
  const response = await apiClient.post<VerifyEmailResponse>('/auth/verify-email', payload)
  return response.data
}

export async function resendVerificationEmail(payload: ResendVerificationRequest) {
  const response = await apiClient.post<VerifyEmailResponse>(
    '/auth/resend-verification-email',
    payload
  )
  return response.data
}

export async function forgotPassword(payload: ForgotPasswordRequest) {
  const response = await apiClient.post<ForgotPasswordResponse>(
    '/auth/forgot-password',
    payload
  )
  return response.data
}

export async function resetPassword(payload: ResetPasswordRequest) {
  const response = await apiClient.post<ResetPasswordResponse>(
    '/auth/reset-password',
    payload
  )
  return response.data
}

// Get social auth URL for OAuth providers
export async function getSocialAuthUrl(provider: SocialProvider) {
  const response = await apiClient.get<SocialAuthResponse>(
    `/auth/social/${provider}/url`
  )
  return response.data
}
