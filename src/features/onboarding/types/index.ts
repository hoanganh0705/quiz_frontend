// Onboarding domain types

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export interface OnboardingProfile {
  displayName: string
  bio: string
  experienceLevel: ExperienceLevel
  avatar: string
}

export interface OnboardingData {
  interests: string[]
  profile: OnboardingProfile
  completedAt: string | null
}
