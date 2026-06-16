// Auth domain types — request/response contracts for the auth API

export type RegisterRequest = {
  username: string
  email: string
  password: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type VerifyEmailRequest = {
  token: string
}

export type ResendVerificationRequest = {
  email: string
}

// ─── Response Types (matching backend DTOs) ────────────────────────────────────

export type LoginResponse = {
  userId: string
  username: string
  email: string
  accessToken: string
}

export type RegisterResponse = {
  message: string
}

export type LogoutResponse = {
  message: string
}

export type RefreshTokenResponse = {
  accessToken: string
}

export type VerifyEmailResponse = {
  message: string
}

// ─── Legacy types (deprecated — for backward compat only) ──────────────────────

/** @deprecated Use LoginResponse.accessToken instead */
export type TokenResponse = {
  accessToken: string
}

/** @deprecated Use LoginResponse instead */
export type LoginResponseLegacy = {
  userId: string
  username: string
  email: string
  token: TokenResponse
}

/** @deprecated Use RefreshTokenResponse instead */
export type RefreshTokenResponseLegacy = {
  token: TokenResponse
}

// ─── Unimplemented (backend doesn't support yet) ───────────────────────────────

export type ForgotPasswordRequest = {
  email: string
}

export type ForgotPasswordResponse = {
  message: string
}

export type ResetPasswordRequest = {
  token: string
  password: string
}

export type ResetPasswordResponse = {
  message: string
}

export type SocialProvider = 'google' | 'facebook' | 'github'

export type SocialAuthResponse = {
  url: string
}
