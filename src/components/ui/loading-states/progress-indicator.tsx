'use client'

import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'

interface ProgressIndicatorProps {
  value: number
  showLabel?: boolean
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error'
  className?: string
}

const heightMap = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3'
}

const variantColors = {
  default: 'bg-default',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  error: 'bg-red-500'
}

export function ProgressIndicator({
  value,
  showLabel = true,
  label,
  size = 'md',
  variant = 'default',
  className
}: ProgressIndicatorProps) {
  const getVariantFromValue = () => {
    if (variant !== 'default') return variant
    if (value >= 100) return 'success'
    if (value >= 75) return 'default'
    if (value >= 50) return 'warning'
    return 'default'
  }

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className='flex justify-between items-center mb-2'>
          <span className='text-sm text-foreground/70'>
            {label || 'Progress'}
          </span>
          <span className='text-sm font-medium text-foreground'>
            {Math.round(value)}%
          </span>
        </div>
      )}
      <div
        className={cn(
          'bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden',
          heightMap[size]
        )}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantColors[getVariantFromValue()]
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

// Circular progress indicator
interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  className?: string
}

export function CircularProgress({
  value,
  size = 80,
  strokeWidth = 8,
  showLabel = true,
  className
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
    >
      <svg width={size} height={size} className='transform -rotate-90'>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke='currentColor'
          strokeWidth={strokeWidth}
          className='text-gray-200 dark:text-slate-700'
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill='none'
          stroke='currentColor'
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap='round'
          className='text-default transition-all duration-300 ease-out'
        />
      </svg>
      {showLabel && (
        <span className='absolute text-sm font-medium text-foreground'>
          {Math.round(value)}%
        </span>
      )}
    </div>
  )
}

// Step progress indicator
interface Step {
  label: string
  description?: string
}

interface StepProgressProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function StepProgress({
  steps,
  currentStep,
  className
}: StepProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className='flex items-center justify-between'>
        {steps.map((step, index) => (
          <div key={index} className='flex flex-col items-center flex-1'>
            <div className='flex items-center w-full'>
              {index > 0 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 transition-colors',
                    index <= currentStep
                      ? 'bg-default'
                      : 'bg-gray-200 dark:bg-slate-700'
                  )}
                />
              )}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all',
                  index < currentStep
                    ? 'bg-default border-default text-white'
                    : index === currentStep
                      ? 'border-default text-default bg-background'
                      : 'border-gray-300 dark:border-slate-600 text-foreground/50'
                )}
              >
                {index < currentStep ? (
                  <CheckCircle className='w-5 h-5' />
                ) : index === currentStep ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Circle className='w-4 h-4' />
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 transition-colors',
                    index < currentStep
                      ? 'bg-default'
                      : 'bg-gray-200 dark:bg-slate-700'
                  )}
                />
              )}
            </div>
            <div className='mt-2 text-center'>
              <p
                className={cn(
                  'text-xs font-medium',
                  index <= currentStep
                    ? 'text-foreground'
                    : 'text-foreground/50'
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className='text-xs text-foreground/50 mt-0.5'>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Indeterminate loading bar
interface IndeterminateBarProps {
  className?: string
}

export function IndeterminateBar({ className }: IndeterminateBarProps) {
  return (
    <div
      className={cn(
        'w-full h-1 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden',
        className
      )}
    >
      <div className='h-full w-1/3 bg-default rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]' />
      <style jsx>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  )
}
