'use client'

import { useState, useEffect, memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { WelcomeStep } from '@/components/onboarding/WelcomeStep'
import { InterestSelectionStep } from '@/components/onboarding/InterestSelectionStep'
import { ProfileSetupStep } from '@/components/onboarding/ProfileSetupStep'
import { QuizRecommendationsStep } from '@/components/onboarding/QuizRecommendationsStep'
import { Progress } from '@/components/ui/progress'
import { OnboardingData } from '@/types/onboarding'

// Hoist constant outside component (data-hoisting)
const TOTAL_STEPS = 4

const OnboardingPage = memo(function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [onboardingData, setOnboardingData] = useLocalStorage<OnboardingData>(
    'onboarding-data',
    {
      interests: [],
      profile: {
        displayName: '',
        bio: '',
        experienceLevel: 'beginner',
        avatar: ''
      },
      completedAt: null
    }
  )
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useLocalStorage(
    'onboarding-completed',
    false
  )

  // Redirect if already completed onboarding
  useEffect(() => {
    if (hasCompletedOnboarding) {
      router.push('/')
    }
  }, [hasCompletedOnboarding, router])

  const progressPercentage = (currentStep / TOTAL_STEPS) * 100

  // Use useCallback for event handlers (rerender-functional-setstate)
  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1)
    }
  }, [currentStep])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }, [currentStep])

  const handleSkip = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleComplete()
    }
  }, [currentStep])

  const handleComplete = useCallback(() => {
    setOnboardingData((prev) => ({
      ...prev,
      completedAt: new Date().toISOString()
    }))
    setHasCompletedOnboarding(true)
    router.push('/')
  }, [setOnboardingData, setHasCompletedOnboarding, router])

  const updateInterests = useCallback(
    (interests: string[]) => {
      setOnboardingData((prev) => ({ ...prev, interests }))
    },
    [setOnboardingData]
  )

  const updateProfile = useCallback(
    (profile: OnboardingData['profile']) => {
      setOnboardingData((prev) => ({ ...prev, profile }))
    },
    [setOnboardingData]
  )

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeStep onNext={handleNext} />
      case 2:
        return (
          <InterestSelectionStep
            selectedInterests={onboardingData.interests}
            onUpdateInterests={updateInterests}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        )
      case 3:
        return (
          <ProfileSetupStep
            profile={onboardingData.profile}
            onUpdateProfile={updateProfile}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
          />
        )
      case 4:
        return (
          <QuizRecommendationsStep
            selectedInterests={onboardingData.interests}
            onComplete={handleComplete}
            onBack={handleBack}
          />
        )
      default:
        return null
    }
  }

  return (
    <main className='min-h-screen bg-background flex flex-col'>
      {/* Progress Header */}
      <header className='w-full px-4 py-6 border-b border-border'>
        <div className='max-w-2xl mx-auto'>
          <div className='flex items-center justify-between mb-3'>
            <span className='text-sm text-muted-foreground' aria-live='polite'>
              Step {currentStep} of {TOTAL_STEPS}
            </span>
            {currentStep > 1 && currentStep < TOTAL_STEPS && (
              <button
                onClick={handleSkip}
                className='text-sm text-muted-foreground hover:text-foreground transition-colors'
                aria-label='Skip this step'
              >
                Skip for now
              </button>
            )}
          </div>
          <Progress
            value={progressPercentage}
            className='h-2'
            aria-label={`Onboarding progress: ${progressPercentage.toFixed(0)}%`}
          />
        </div>
      </header>

      {/* Step Content */}
      <section
        className='flex-1 flex items-center justify-center px-4 py-8'
        aria-label='Onboarding step content'
      >
        <div className='w-full max-w-2xl'>{renderStep()}</div>
      </section>
    </main>
  )
})

export default OnboardingPage
