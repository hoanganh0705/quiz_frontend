export interface OnboardingProfile {
  displayName: string
  bio: string
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
  avatar: string
}

export interface OnboardingData {
  interests: string[]
  profile: OnboardingProfile
  completedAt: string | null
}
