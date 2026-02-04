'use client'

import { useLocalStorage } from './use-local-storage'
import { OnboardingData } from '@/types/onboarding'

const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  interests: [],
  profile: {
    displayName: '',
    bio: '',
    experienceLevel: 'beginner',
    avatar: ''
  },
  completedAt: null
}

/**
 * Custom hook for managing onboarding state
 * @returns Object with onboarding state and helper functions
 */
export function useOnboarding() {
  const [onboardingData, setOnboardingData] = useLocalStorage<OnboardingData>(
    'onboarding-data',
    DEFAULT_ONBOARDING_DATA
  )
  const [hasCompleted, setHasCompleted] = useLocalStorage(
    'onboarding-completed',
    false
  )

  const resetOnboarding = () => {
    setOnboardingData(DEFAULT_ONBOARDING_DATA)
    setHasCompleted(false)
  }

  const completeOnboarding = () => {
    setOnboardingData({
      ...onboardingData,
      completedAt: new Date().toISOString()
    })
    setHasCompleted(true)
  }

  return {
    onboardingData,
    hasCompleted,
    resetOnboarding,
    completeOnboarding,
    setOnboardingData
  }
}
