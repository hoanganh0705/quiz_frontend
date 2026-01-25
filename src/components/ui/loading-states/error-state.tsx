'use client'

import {
  AlertCircle,
  RefreshCw,
  WifiOff,
  ServerCrash,
  FileQuestion
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryText?: string
  variant?: 'default' | 'network' | 'server' | 'notFound' | 'empty'
  className?: string
  showIcon?: boolean
  fullHeight?: boolean
}

const iconMap = {
  default: AlertCircle,
  network: WifiOff,
  server: ServerCrash,
  notFound: FileQuestion,
  empty: FileQuestion
}

const defaultMessages = {
  default: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.'
  },
  network: {
    title: 'Connection Lost',
    message: 'Please check your internet connection and try again.'
  },
  server: {
    title: 'Server Error',
    message: 'Our servers are experiencing issues. Please try again later.'
  },
  notFound: {
    title: 'Not Found',
    message: "The resource you're looking for doesn't exist."
  },
  empty: {
    title: 'No Data',
    message: 'There is nothing to display at the moment.'
  }
}

export function ErrorState({
  title,
  message,
  onRetry,
  retryText = 'Try Again',
  variant = 'default',
  className,
  showIcon = true,
  fullHeight = false
}: ErrorStateProps) {
  const Icon = iconMap[variant]
  const defaultContent = defaultMessages[variant]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8',
        fullHeight && 'min-h-[400px]',
        className
      )}
    >
      {showIcon && (
        <div className='mb-4 p-3 rounded-full bg-red-100 dark:bg-red-900/20'>
          <Icon className='w-8 h-8 text-red-500 dark:text-red-400' />
        </div>
      )}
      <h3 className='text-lg font-semibold text-foreground mb-2'>
        {title || defaultContent.title}
      </h3>
      <p className='text-sm text-foreground/70 max-w-md mb-6'>
        {message || defaultContent.message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant='outline'
          className='gap-2 hover:bg-default hover:text-white transition-colors'
        >
          <RefreshCw className='w-4 h-4' />
          {retryText}
        </Button>
      )}
    </div>
  )
}

// Inline error message
interface InlineErrorProps {
  message: string
  onRetry?: () => void
  className?: string
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg',
        className
      )}
    >
      <div className='flex items-center gap-2'>
        <AlertCircle className='w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0' />
        <p className='text-sm text-red-700 dark:text-red-300'>{message}</p>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          size='sm'
          variant='ghost'
          className='text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
        >
          <RefreshCw className='w-3 h-3' />
        </Button>
      )}
    </div>
  )
}

// Error boundary fallback component
interface ErrorBoundaryFallbackProps {
  error: Error
  resetErrorBoundary?: () => void
}

export function ErrorBoundaryFallback({
  error,
  resetErrorBoundary
}: ErrorBoundaryFallbackProps) {
  return (
    <div className='min-h-screen bg-background flex items-center justify-center p-4'>
      <div className='max-w-md w-full text-center'>
        <div className='mb-6 p-4 rounded-full bg-red-100 dark:bg-red-900/20 inline-flex'>
          <AlertCircle className='w-12 h-12 text-red-500 dark:text-red-400' />
        </div>
        <h1 className='text-2xl font-bold text-foreground mb-2'>
          Oops! Something went wrong
        </h1>
        <p className='text-foreground/70 mb-4'>
          We&apos;re sorry, but something unexpected happened. Please try again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className='text-left text-xs bg-gray-100 dark:bg-slate-800 p-4 rounded-lg mb-4 overflow-auto max-h-40'>
            {error.message}
          </pre>
        )}
        {resetErrorBoundary && (
          <Button
            onClick={resetErrorBoundary}
            className='bg-default hover:bg-default-hover text-white gap-2'
          >
            <RefreshCw className='w-4 h-4' />
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}

// Toast-style error notification
interface ErrorToastProps {
  message: string
  onDismiss?: () => void
  onRetry?: () => void
  className?: string
}

export function ErrorToast({
  message,
  onDismiss,
  onRetry,
  className
}: ErrorToastProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg shadow-lg',
        className
      )}
    >
      <AlertCircle className='w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0' />
      <p className='flex-1 text-sm text-red-700 dark:text-red-300'>{message}</p>
      <div className='flex gap-2'>
        {onRetry && (
          <Button
            onClick={onRetry}
            size='sm'
            variant='ghost'
            className='text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 h-8 px-2'
          >
            Retry
          </Button>
        )}
        {onDismiss && (
          <Button
            onClick={onDismiss}
            size='sm'
            variant='ghost'
            className='text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 h-8 px-2'
          >
            Dismiss
          </Button>
        )}
      </div>
    </div>
  )
}
