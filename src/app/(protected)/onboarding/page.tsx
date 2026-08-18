'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLocalStorage } from '@/shared/hooks/use-local-storage'
import {
  WelcomeStep,
  InterestSelectionStep,
  ProfileSetupStep,
  QuizRecommendationsStep
} from '@/features/onboarding'
import { Progress } from '@/components/ui/Progress'
import { Button } from '@/components/ui/Button'
import { OnboardingData } from '@/features/onboarding/types'

const TOTAL_STEPS = 4

const OnboardingPage = function OnboardingPage() {
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

useEffect(() => {
if (hasCompletedOnboarding) {
router.push('/')
    }
  }, [hasCompletedOnboarding, router])

const progressPercentage = (currentStep / TOTAL_STEPS) * 100

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

const handleComplete = useCallback(() => {
setOnboardingData((prev) => ({
...prev,
completedAt: new Date().toISOString()
    }))
setHasCompletedOnboarding(true)
router.push('/')
  }, [setOnboardingData, setHasCompletedOnboarding, router])

const handleSkip = useCallback(() => {
if (currentStep < TOTAL_STEPS) {
setCurrentStep((prev) => prev + 1)
    } else {
handleComplete()
    }
  }, [currentStep, handleComplete])

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
  if (currentStep < 1 || currentStep > TOTAL_STEPS) {
    return (
      <div
        role='alert'
        className='text-center space-y-4 p-8'
      >
        <h2 className='text-xl font-semibold text-foreground'>
          Let&apos;s start over
        </h2>
        <p className='text-sm text-muted-foreground'>
          Your onboarding state looks out of sync. Restart to pick up where
          you left off.
        </p>
        <Button
          type='button'
          onClick={() => setCurrentStep(1)}
        >
          Restart onboarding
        </Button>
      </div>
    )
  }
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
              type='button'
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
}

export default OnboardingPage
