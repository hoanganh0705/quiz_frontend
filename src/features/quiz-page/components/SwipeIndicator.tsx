'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeIndicatorProps {
  currentQuestion: number
  totalQuestions: number
  className?: string
}

/**
 * Mobile swipe indicator - shows dots for questions and swipe arrows.
 * Only visible on mobile devices.
 */
export function SwipeIndicator({
  currentQuestion,
  totalQuestions,
  className
}: SwipeIndicatorProps) {
  const canGoPrev = currentQuestion > 0
  const canGoNext = currentQuestion < totalQuestions - 1

  // Show max 7 dots, centered around current question
  const maxDots = 7
  let startDot = 0
  let endDot = totalQuestions

  if (totalQuestions > maxDots) {
    startDot = Math.max(0, currentQuestion - Math.floor(maxDots / 2))
    endDot = Math.min(totalQuestions, startDot + maxDots)
    if (endDot - startDot < maxDots) {
      startDot = Math.max(0, endDot - maxDots)
    }
  }

  const dots = Array.from({ length: endDot - startDot }, (_, i) => startDot + i)

  return (
    <div
      className={cn(
        'md:hidden flex items-center justify-center gap-2 py-3',
        className
      )}
      aria-hidden='true'
    >
      <ChevronLeft
        className={cn(
          'w-4 h-4 transition-opacity',
          canGoPrev ? 'text-muted-foreground opacity-100' : 'opacity-0'
        )}
      />

      <div className='flex items-center gap-1.5'>
        {startDot > 0 && (
          <span className='w-1 h-1 rounded-full bg-muted-foreground/40' />
        )}
        {dots.map((dotIndex) => (
          <span
            key={dotIndex}
            className={cn(
              'rounded-full transition-all duration-200',
              dotIndex === currentQuestion
                ? 'w-2.5 h-2.5 bg-primary'
                : 'w-1.5 h-1.5 bg-muted-foreground/40'
            )}
          />
        ))}
        {endDot < totalQuestions && (
          <span className='w-1 h-1 rounded-full bg-muted-foreground/40' />
        )}
      </div>

      <ChevronRight
        className={cn(
          'w-4 h-4 transition-opacity',
          canGoNext ? 'text-muted-foreground opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}
