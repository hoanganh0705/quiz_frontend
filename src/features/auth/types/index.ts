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

export type TokenResponse = {
  accessToken: string
}

export type LoginResponse = {
  userId: string
  username: string
  email: string
  token: TokenResponse
}

export type RegisterResponse = {
  message: string
}

export type LogoutResponse = {
  message: string
}

export type RefreshTokenResponse = {
  token: TokenResponse
}

export type VerifyEmailResponse = {
  message: string
}
