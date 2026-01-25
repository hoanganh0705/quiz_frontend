'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'primary' | 'secondary'
  text?: string
  className?: string
  fullScreen?: boolean
}

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-10 h-10',
  xl: 'w-16 h-16'
}

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg'
}

const variantMap = {
  default: 'text-foreground/70',
  primary: 'text-default',
  secondary: 'text-muted-foreground'
}

export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  text,
  className,
  fullScreen = false
}: LoadingSpinnerProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2',
        className
      )}
    >
      <Loader2
        className={cn(sizeMap[size], variantMap[variant], 'animate-spin')}
      />
      {text && (
        <p className={cn(textSizeMap[size], 'text-foreground/70')}>{text}</p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        {content}
      </div>
    )
  }

  return content
}

interface RefreshSpinnerProps {
  isRefreshing?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function RefreshSpinner({
  isRefreshing = false,
  size = 'md',
  className
}: RefreshSpinnerProps) {
  return (
    <RefreshCw
      className={cn(
        sizeMap[size],
        'text-foreground/70 transition-transform',
        isRefreshing && 'animate-spin',
        className
      )}
    />
  )
}

// Inline loading for buttons
interface ButtonLoadingProps {
  isLoading?: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
}

export function ButtonLoading({
  isLoading = false,
  children,
  loadingText,
  className
}: ButtonLoadingProps) {
  if (isLoading) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)}>
        <Loader2 className='w-4 h-4 animate-spin' />
        {loadingText || 'Loading...'}
      </span>
    )
  }

  return <>{children}</>
}

// Dots loading animation
interface DotsLoadingProps {
  className?: string
}

export function DotsLoading({ className }: DotsLoadingProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className='w-2 h-2 rounded-full bg-default animate-bounce [animation-delay:-0.3s]' />
      <span className='w-2 h-2 rounded-full bg-default animate-bounce [animation-delay:-0.15s]' />
      <span className='w-2 h-2 rounded-full bg-default animate-bounce' />
    </div>
  )
}

// Pulse loading
interface PulseLoadingProps {
  className?: string
}

export function PulseLoading({ className }: PulseLoadingProps) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className='relative'>
        <div className='w-8 h-8 rounded-full bg-default/30 animate-ping absolute' />
        <div className='w-8 h-8 rounded-full bg-default' />
      </div>
    </div>
  )
}
