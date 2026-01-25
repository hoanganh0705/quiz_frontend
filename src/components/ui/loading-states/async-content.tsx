'use client'

import { ReactNode } from 'react'
import { LoadingSpinner } from './loading-spinner'
import { ErrorState } from './error-state'
import { cn } from '@/lib/utils'

interface AsyncContentProps {
  isLoading: boolean
  isError: boolean
  error?: Error | null
  onRetry?: () => void
  children: ReactNode
  loadingComponent?: ReactNode
  errorComponent?: ReactNode
  loadingText?: string
  emptyState?: ReactNode
  isEmpty?: boolean
  className?: string
  minHeight?: string
}

/**
 * A wrapper component for handling async content states
 * Automatically shows loading, error, or empty states based on props
 */
export function AsyncContent({
  isLoading,
  isError,
  error,
  onRetry,
  children,
  loadingComponent,
  errorComponent,
  loadingText = 'Loading...',
  emptyState,
  isEmpty = false,
  className,
  minHeight = '200px'
}: AsyncContentProps) {
  if (isLoading) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ minHeight }}
      >
        {loadingComponent || <LoadingSpinner size='lg' text={loadingText} />}
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn(className)} style={{ minHeight }}>
        {errorComponent || (
          <ErrorState
            title='Failed to load content'
            message={
              error?.message || 'Something went wrong. Please try again.'
            }
            onRetry={onRetry}
            fullHeight
          />
        )}
      </div>
    )
  }

  if (isEmpty && emptyState) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ minHeight }}
      >
        {emptyState}
      </div>
    )
  }

  return <>{children}</>
}

/**
 * A skeleton wrapper that shows skeleton content while loading
 */
interface SkeletonContentProps {
  isLoading: boolean
  skeleton: ReactNode
  children: ReactNode
  className?: string
}

export function SkeletonContent({
  isLoading,
  skeleton,
  children,
  className
}: SkeletonContentProps) {
  if (isLoading) {
    return <div className={className}>{skeleton}</div>
  }

  return <>{children}</>
}

/**
 * Suspense-like loading boundary
 */
interface LoadingBoundaryProps {
  isLoading: boolean
  fallback: ReactNode
  children: ReactNode
}

export function LoadingBoundary({
  isLoading,
  fallback,
  children
}: LoadingBoundaryProps) {
  return isLoading ? <>{fallback}</> : <>{children}</>
}
