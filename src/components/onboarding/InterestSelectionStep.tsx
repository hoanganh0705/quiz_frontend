'use client'

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

export function InterestSelectionStep({
  selectedInterests,
  onUpdateInterests,
  onNext,
  onBack
}: InterestSelectionStepProps) {
  // Filter out the "All Categories" option
  const selectableCategories = categories.filter(
    (cat) => cat.id !== 'all-categories'
  )

  const toggleInterest = (categoryId: string) => {
    if (selectedInterests.includes(categoryId)) {
      onUpdateInterests(selectedInterests.filter((id) => id !== categoryId))
    } else {
      onUpdateInterests([...selectedInterests, categoryId])
    }
  }

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
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
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
          >
            {/* Selection Indicator */}
            {isSelected(category.id) && (
              <div className='absolute top-2 right-2 w-5 h-5 rounded-full bg-default flex items-center justify-center'>
                <Check className='w-3 h-3 text-white' />
              </div>
            )}

            {/* Category Content */}
            <div className='space-y-2'>
              <span className='text-2xl'>{category.icon}</span>
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
        >
          {selectedInterests.length} selected
          {!canProceed && ' (select at least 1)'}
        </span>
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
