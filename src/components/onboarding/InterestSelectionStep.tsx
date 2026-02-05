'use client'

import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { categories } from '@/constants/categories'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

interface InterestSelectionStepProps {
  selectedInterests: string[]
  onUpdateInterests: (interests: string[]) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export const InterestSelectionStep = memo(function InterestSelectionStep({
  selectedInterests,
  onUpdateInterests,
  onNext,
  onBack
}: InterestSelectionStepProps) {
  // Filter out the "All Categories" option
  const selectableCategories = categories.filter(
    (cat) => cat.id !== 'all-categories'
  )

  // Use useCallback for event handlers (rerender-functional-setstate)
  const toggleInterest = useCallback(
    (categoryId: string) => {
      onUpdateInterests(
        selectedInterests.includes(categoryId)
          ? selectedInterests.filter((id) => id !== categoryId)
          : [...selectedInterests, categoryId]
      )
    },
    [selectedInterests, onUpdateInterests]
  )

  const isSelected = (categoryId: string) =>
    selectedInterests.includes(categoryId)

  const canProceed = selectedInterests.length >= 1

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='text-center space-y-2'>
        <h2 className='text-2xl md:text-3xl font-bold text-foreground'>
          What topics interest you? 🎯
        </h2>
        <p className='text-muted-foreground'>
          Select at least 1 category to personalize your quiz recommendations
        </p>
      </div>

      {/* Categories Grid */}
      <div
        className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
        role='group'
        aria-label='Select your interests'
      >
        {selectableCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => toggleInterest(category.id)}
            className={cn(
              'relative p-4 rounded-xl border-2 transition-all duration-200 text-left',
              'hover:scale-[1.02] hover:shadow-md',
              isSelected(category.id)
                ? 'border-default bg-default/10 shadow-sm'
                : 'border-border hover:border-default/50 bg-card'
            )}
            aria-label={`${category.name} - ${isSelected(category.id) ? 'selected' : 'not selected'}`}
            aria-pressed={isSelected(category.id)}
          >
            {/* Selection Indicator */}
            {isSelected(category.id) && (
              <div
                className='absolute top-2 right-2 w-5 h-5 rounded-full bg-default flex items-center justify-center'
                aria-hidden='true'
              >
                <Check className='w-3 h-3 text-white' />
              </div>
            )}

            {/* Category Content */}
            <div className='space-y-2'>
              <span className='text-2xl' aria-hidden='true'>
                {category.icon}
              </span>
              <h3 className='font-medium text-foreground text-sm'>
                {category.name}
              </h3>
              <p className='text-xs text-muted-foreground line-clamp-2'>
                {category.count} quizzes
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Selection Counter */}
      <div className='text-center'>
        <span
          className={cn(
            'inline-flex items-center px-3 py-1 rounded-full text-sm',
            canProceed
              ? 'bg-default/10 text-default'
              : 'bg-muted text-muted-foreground'
          )}
          role='status'
          aria-live='polite'
        >
          {selectedInterests.length} selected
          {!canProceed && ' (select at least 1)'}
        </span>
      </div>

      {/* Navigation */}
      <nav
        className='flex justify-between items-center pt-4'
        aria-label='Step navigation'
      >
        <Button
          variant='outline'
          onClick={onBack}
          className='flex items-center gap-2'
          aria-label='Go back to previous step'
        >
          <ArrowLeft className='w-4 h-4' aria-hidden='true' />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className='bg-default hover:bg-default-hover text-white flex items-center gap-2'
          aria-label='Continue to next step'
        >
          Continue
          <ArrowRight className='w-4 h-4' aria-hidden='true' />
        </Button>
      </nav>
    </div>
  )
})
