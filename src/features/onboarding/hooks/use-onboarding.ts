'use client'

import { useLocalStorage } from '@/shared/hooks/use-local-storage'
import { OnboardingData } from '@/features/onboarding/types'

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
