import { apiClient } from './client'
import type {
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  LoginResponse,
  RegisterResponse,
  LogoutResponse,
  RefreshTokenResponse,
  VerifyEmailResponse
} from './types'

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
