'use client'

import { ReactNode } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { ErrorState } from './ErrorState'
import { cn } from '@/shared/utils/merge-class-names'

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
