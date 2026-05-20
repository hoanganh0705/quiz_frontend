// Users domain types — request/response contracts for the users API

export type EditProfileRequest = {
  displayName?: string
  bio?: string
}

export type EditSettingsRequest = {
  settings: Record<string, unknown>
}

export type CurrentUserResponse = {
  id?: string
  userId?: string
  username?: string
  email?: string
  displayName?: string
  avatarUrl?: string
  country?: string
  rank?: number
  streak?: number
  level?: number
  quizzes?: number
  quizzesCreated?: number
  followers?: string | number
  following?: string | number
  bio?: string
  settings?: Record<string, unknown>
}
