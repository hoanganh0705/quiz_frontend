/**
 * @deprecated Import directly from feature modules instead:
 *   Auth types:  '@/features/auth/types'
 *   User types:  '@/features/users/types'
 *
 * This file is kept as a backward-compat re-export shim.
 */
export type {
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  TokenResponse,
  LoginResponse,
  RegisterResponse,
  LogoutResponse,
  RefreshTokenResponse,
  VerifyEmailResponse
} from '@/features/auth/types'

export type {
  EditProfileRequest,
  EditSettingsRequest,
  CurrentUserResponse
} from '@/features/users/types'
