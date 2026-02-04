'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { OnboardingProfile } from '@/types/onboarding'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, User } from 'lucide-react'

interface ProfileSetupStepProps {
  profile: OnboardingProfile
  onUpdateProfile: (profile: OnboardingProfile) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

const experienceLevels = [
  {
    value: 'beginner',
    label: 'Beginner',
    emoji: '🌱',
    description: 'Just starting my quiz journey'
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    emoji: '🌿',
    description: 'I enjoy quizzes regularly'
  },
  {
    value: 'advanced',
    label: 'Advanced',
    emoji: '🌳',
    description: 'Quiz master in the making'
  }
] as const

const avatarOptions = [
  '👤',
  '👩',
  '👨',
  '🧑',
  '👧',
  '👦',
  '🦊',
  '🐱',
  '🐶',
  '🐼',
  '🦁',
  '🐨',
  '🤖',
  '👽',
  '🎭',
  '🦄',
  '🐲',
  '🦋'
]

export function ProfileSetupStep({
  profile,
  onUpdateProfile,
  onNext,
  onBack
}: ProfileSetupStepProps) {
  const updateField = <K extends keyof OnboardingProfile>(
    field: K,
    value: OnboardingProfile[K]
  ) => {
    onUpdateProfile({ ...profile, [field]: value })
  }

  const canProceed = profile.displayName.trim().length >= 2

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='text-center space-y-2'>
        <h2 className='text-2xl md:text-3xl font-bold text-foreground'>
          Set up your profile 👋
        </h2>
        <p className='text-muted-foreground'>
          Tell us a bit about yourself to personalize your experience
        </p>
      </div>

      <div className='space-y-6'>
        {/* Avatar Selection */}
        <div className='space-y-3'>
          <Label className='text-sm font-medium'>Choose an avatar</Label>
          <div className='flex flex-wrap gap-2 justify-center p-4 rounded-xl border border-border bg-card'>
            {avatarOptions.map((avatar) => (
              <button
                key={avatar}
                onClick={() => updateField('avatar', avatar)}
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all',
                  'hover:scale-110 hover:bg-default/10',
                  profile.avatar === avatar
                    ? 'bg-default/20 ring-2 ring-default ring-offset-2 ring-offset-background'
                    : 'bg-muted'
                )}
              >
                {avatar}
              </button>
            ))}
          </div>
          {!profile.avatar && (
            <p className='text-xs text-muted-foreground text-center'>
              Select an avatar or we&apos;ll use a default one
            </p>
          )}
        </div>

        {/* Display Name */}
        <div className='space-y-2'>
          <Label htmlFor='displayName' className='text-sm font-medium'>
            Display Name <span className='text-destructive'>*</span>
          </Label>
          <div className='relative'>
            <User className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
            <Input
              id='displayName'
              placeholder='Enter your display name'
              value={profile.displayName}
              onChange={(e) => updateField('displayName', e.target.value)}
              className='pl-10'
              maxLength={30}
            />
          </div>
          <p className='text-xs text-muted-foreground'>
            This is how other players will see you ({profile.displayName.length}
            /30)
          </p>
        </div>

        {/* Bio */}
        <div className='space-y-2'>
          <Label htmlFor='bio' className='text-sm font-medium'>
            Bio (optional)
          </Label>
          <Textarea
            id='bio'
            placeholder='Tell us something about yourself...'
            value={profile.bio}
            onChange={(e) => updateField('bio', e.target.value)}
            rows={3}
            maxLength={200}
            className='resize-none'
          />
          <p className='text-xs text-muted-foreground text-right'>
            {profile.bio.length}/200
          </p>
        </div>

        {/* Experience Level */}
        <div className='space-y-3'>
          <Label className='text-sm font-medium'>Quiz experience level</Label>
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
            {experienceLevels.map((level) => (
              <button
                key={level.value}
                onClick={() => updateField('experienceLevel', level.value)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  'hover:border-default/50',
                  profile.experienceLevel === level.value
                    ? 'border-default bg-default/10'
                    : 'border-border bg-card'
                )}
              >
                <div className='text-2xl mb-2'>{level.emoji}</div>
                <div className='font-medium text-foreground text-sm'>
                  {level.label}
                </div>
                <div className='text-xs text-muted-foreground'>
                  {level.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className='flex justify-between items-center pt-4'>
        <Button
          variant='outline'
          onClick={onBack}
          className='flex items-center gap-2'
        >
          <ArrowLeft className='w-4 h-4' />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className='bg-default hover:bg-default-hover text-white flex items-center gap-2'
        >
          Continue
          <ArrowRight className='w-4 h-4' />
        </Button>
      </div>
    </div>
  )
}
