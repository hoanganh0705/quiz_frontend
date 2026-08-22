'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/Card'

import { cn } from '@/shared/utils/merge-class-names'

export interface DailyChallengeCardSkeletonProps {
  className?: string
}

export function DailyChallengeCardSkeleton({
  className,
}: DailyChallengeCardSkeletonProps) {
  return (
    <Card
      data-testid='daily-challenge-card-skeleton'
      role='region'
      aria-busy={true}
      aria-label='Loading daily challenge'
      className={cn(
        'min-h-40 border bg-background text-foreground py-6',
        className,
      )}
    >
      <CardHeader>
        <div className='flex justify-between items-start gap-2'>
          <div className='flex-1 space-y-2'>
            <div className='h-5 w-44 rounded bg-muted motion-safe:animate-pulse' />
            <div className='h-3 w-72 max-w-full rounded bg-muted motion-safe:animate-pulse' />
          </div>
          <div className='h-5 w-16 rounded bg-muted motion-safe:animate-pulse' />
        </div>
        <div className='flex items-center gap-4 pt-2'>
          <div className='h-3 w-28 rounded bg-muted motion-safe:animate-pulse' />
          <div className='h-3 w-20 rounded bg-muted motion-safe:animate-pulse' />
          <div className='h-3 w-16 rounded bg-muted motion-safe:animate-pulse' />
        </div>
      </CardHeader>
      <CardContent>
        <div className='h-3 w-72 max-w-full rounded bg-muted motion-safe:animate-pulse' />
      </CardContent>
    </Card>
  )
}

export interface DailyChallengeHistorySkeletonProps {
  rows?: number
  className?: string
}

export function DailyChallengeHistorySkeleton({
  rows = 3,
  className,
}: DailyChallengeHistorySkeletonProps) {
  return (
    <Card
      data-testid='daily-challenge-history-skeleton'
      role='region'
      aria-busy={true}
      aria-label='Loading challenge history'
      className={cn(
        'border bg-background text-foreground py-6',
        className,
      )}
    >
      <CardHeader>
        <div className='h-5 w-44 rounded bg-muted motion-safe:animate-pulse' />
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {Array.from({ length: rows }).map((_, idx) => (
            <div
              key={idx}
              className='flex items-center justify-between gap-2 p-4 border-b border-border last:border-b-0'
            >
              <div className='flex-1 space-y-2'>
                <div className='h-3 w-32 rounded bg-muted motion-safe:animate-pulse' />
                <div className='flex items-center gap-3'>
                  <div className='h-4 w-16 rounded-full bg-muted motion-safe:animate-pulse' />
                  <div className='h-4 w-12 rounded-full bg-muted motion-safe:animate-pulse' />
                </div>
              </div>
              <div className='text-right space-y-2'>
                <div className='h-4 w-10 rounded bg-muted motion-safe:animate-pulse' />
                <div className='h-3 w-14 rounded bg-muted motion-safe:animate-pulse' />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
