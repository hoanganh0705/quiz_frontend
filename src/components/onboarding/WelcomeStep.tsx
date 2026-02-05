'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Brain, Trophy, Users } from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
}

// Hoist features data outside component (data-hoisting)
const features = [
  {
    icon: Brain,
    title: 'Learn & Grow',
    description:
      'Challenge yourself with thousands of quizzes across various topics'
  },
  {
    icon: Trophy,
    title: 'Compete & Win',
    description: 'Climb the leaderboards and earn badges for your achievements'
  },
  {
    icon: Users,
    title: 'Connect & Share',
    description: 'Join a community of quiz enthusiasts and share your knowledge'
  }
]

export const WelcomeStep = memo(function WelcomeStep({
  onNext
}: WelcomeStepProps) {
  return (
    <div className='text-center space-y-8'>
      {/* Hero Section */}
      <div className='space-y-4'>
        <div
          className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-default/10 mb-4'
          aria-hidden='true'
        >
          <Sparkles className='w-10 h-10 text-default' />
        </div>
        <h1 className='text-3xl md:text-4xl font-bold text-foreground'>
          Welcome to QuizHub! 🎉
        </h1>
        <p className='text-lg text-muted-foreground max-w-md mx-auto'>
          Your journey to becoming a quiz champion starts here. Let&apos;s set
          up your account in just a few steps.
        </p>
      </div>

      {/* Features Grid */}
      <div
        className='grid grid-cols-1 md:grid-cols-3 gap-6 py-8'
        role='list'
        aria-label='Platform features'
      >
        {features.map((feature) => (
          <div
            key={feature.title}
            className='p-6 rounded-xl border border-border bg-card hover:border-default/50 transition-colors'
            role='listitem'
          >
            <div
              className='inline-flex items-center justify-center w-12 h-12 rounded-lg bg-default/10 mb-4'
              aria-hidden='true'
            >
              <feature.icon className='w-6 h-6 text-default' />
            </div>
            <h3 className='font-semibold text-foreground mb-2'>
              {feature.title}
            </h3>
            <p className='text-sm text-muted-foreground'>
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className='space-y-4'>
        <Button
          onClick={onNext}
          size='lg'
          className='bg-default hover:bg-default-hover text-white px-8 py-6 text-lg'
          aria-label='Start onboarding process'
        >
          Get Started
          <Sparkles className='w-5 h-5 ml-2' aria-hidden='true' />
        </Button>
        <p className='text-sm text-muted-foreground'>
          This will only take about 2 minutes
        </p>
      </div>
    </div>
  )
})
