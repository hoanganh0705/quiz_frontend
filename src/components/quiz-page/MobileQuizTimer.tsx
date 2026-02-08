'use client'

import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileQuizTimerProps {
  timeLeft: number
  totalTime: number
  className?: string
}

/**
 * Mobile-optimized timer display with:
 * - Larger font for better readability
 * - Color-coded urgency (green → yellow → red)
 * - Animated pulse when time is critically low
 * - Circular progress indicator on mobile
 */
export function MobileQuizTimer({
  timeLeft,
  totalTime,
  className
}: MobileQuizTimerProps) {
  const percentage = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0
  const isWarning = percentage <= 25 && percentage > 10
  const isCritical = percentage <= 10

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
        .toString()
        .padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // SVG circle properties for the radial progress
  const size = 56
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      role='timer'
      aria-label={`Time remaining: ${formatTime(timeLeft)}`}
    >
      {/* Desktop: simple text timer */}
      <div
        className={cn(
          'hidden md:flex items-center gap-2 px-3 py-2 rounded-full border border-gray-300 dark:border-slate-700 bg-background',
          isWarning && 'border-yellow-500 dark:border-yellow-500',
          isCritical && 'border-red-500 dark:border-red-500'
        )}
      >
        <Clock
          className={cn(
            'w-4 h-4 text-foreground',
            isWarning && 'text-yellow-500',
            isCritical && 'text-red-500'
          )}
          aria-hidden='true'
        />
        <span
          className={cn(
            'font-mono text-sm font-semibold',
            isWarning && 'text-yellow-500',
            isCritical && 'text-red-500 animate-pulse'
          )}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* Mobile: circular progress timer */}
      <div
        className={cn(
          'md:hidden relative flex items-center justify-center',
          isCritical && 'animate-pulse'
        )}
      >
        <svg
          width={size}
          height={size}
          className='transform -rotate-90'
          aria-hidden='true'
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill='none'
            stroke='currentColor'
            strokeWidth={strokeWidth}
            className='text-muted/30'
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill='none'
            strokeWidth={strokeWidth}
            strokeLinecap='round'
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              'transition-all duration-1000 ease-linear',
              isCritical
                ? 'text-red-500'
                : isWarning
                  ? 'text-yellow-500'
                  : 'text-primary'
            )}
            stroke='currentColor'
          />
        </svg>
        <span
          className={cn(
            'absolute font-mono text-xs font-bold',
            isCritical
              ? 'text-red-500'
              : isWarning
                ? 'text-yellow-500'
                : 'text-foreground'
          )}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatTime(timeLeft)}
        </span>
      </div>
    </div>
  )
}
