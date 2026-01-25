'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ==========================================
// Quiz Card Skeleton
// ==========================================
interface QuizCardSkeletonProps {
  className?: string
}

export function QuizCardSkeleton({ className }: QuizCardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Image placeholder */}
      <Skeleton className='h-48 w-full rounded-none' />

      {/* Bottom section */}
      <div className='p-4 flex justify-between items-center'>
        <Skeleton className='h-6 w-20 rounded-full' />
        <Skeleton className='h-9 w-24 rounded-md' />
      </div>
    </div>
  )
}

// ==========================================
// Quiz Card Detail Skeleton (More detailed card)
// ==========================================
export function QuizCardDetailSkeleton({ className }: QuizCardSkeletonProps) {
  return (
    <div
      className={cn(
        'border border-gray-300 dark:border-slate-700 rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Image with badges */}
      <div className='relative h-48'>
        <Skeleton className='h-full w-full rounded-none' />
        <div className='absolute top-3 left-3'>
          <Skeleton className='h-5 w-16 rounded-full' />
        </div>
        <div className='absolute top-3 right-3'>
          <Skeleton className='h-5 w-12 rounded-full' />
        </div>
      </div>

      {/* Content */}
      <div className='p-4'>
        <Skeleton className='h-6 w-3/4 mb-3' />

        {/* Creator info */}
        <div className='flex items-center gap-3 mb-3'>
          <Skeleton className='h-8 w-8 rounded-full' />
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-5 w-16 rounded-full' />
        </div>

        {/* Rating and reward */}
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-1'>
            <Skeleton className='h-4 w-4' />
            <Skeleton className='h-4 w-8' />
            <Skeleton className='h-4 w-20' />
          </div>
          <Skeleton className='h-5 w-16' />
        </div>

        {/* Players and spots */}
        <div className='flex items-center justify-between gap-4 mb-4'>
          <Skeleton className='h-4 w-24' />
          <div className='flex items-center gap-2'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-2 w-16' />
          </div>
        </div>

        {/* Button */}
        <Skeleton className='h-10 w-full rounded-md' />
      </div>
    </div>
  )
}

// ==========================================
// Featured Quiz Skeleton
// ==========================================
export function FeaturedQuizSkeleton({ className }: QuizCardSkeletonProps) {
  return (
    <div
      className={cn(
        'border border-gray-300 dark:border-slate-700 rounded-xl overflow-hidden',
        className
      )}
    >
      {/* Image */}
      <div className='relative h-50'>
        <Skeleton className='h-full w-full rounded-none' />
        <div className='absolute top-3 left-3 flex gap-2'>
          <Skeleton className='h-5 w-24 rounded-full' />
        </div>
        <div className='absolute top-3 right-3'>
          <Skeleton className='h-5 w-16 rounded-full' />
        </div>
      </div>

      {/* Content */}
      <div className='p-4'>
        <Skeleton className='h-6 w-3/4 mb-2' />
        <Skeleton className='h-4 w-full mb-2' />
        <Skeleton className='h-4 w-2/3 mb-4' />

        {/* Footer */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-6 w-6 rounded-full' />
            <Skeleton className='h-4 w-20' />
          </div>
          <Skeleton className='h-9 w-20 rounded-md' />
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Category Card Skeleton
// ==========================================
export function CategoryCardSkeleton({ className }: QuizCardSkeletonProps) {
  return (
    <div
      className={cn(
        'border bg-card text-card-foreground overflow-hidden rounded-lg',
        className
      )}
    >
      <div className='relative h-48 w-full'>
        <Skeleton className='h-full w-full rounded-none' />
        <div className='absolute top-2 right-2'>
          <Skeleton className='h-6 w-6 rounded-full' />
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Player Card Skeleton
// ==========================================
export function PlayerCardSkeleton({ className }: QuizCardSkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg bg-main dark:bg-slate-900 border border-gray-300 dark:border-slate-700 h-full',
        className
      )}
    >
      {/* Background image */}
      <Skeleton className='h-32 w-full rounded-none' />

      {/* Avatar and content */}
      <div className='relative -mt-12 flex flex-col items-center px-4 pb-4'>
        <Skeleton className='h-20 w-20 rounded-full border-4 border-background' />
        <Skeleton className='h-5 w-32 mt-2' />
        <Skeleton className='h-4 w-24 mt-1' />

        {/* Stats */}
        <div className='mt-4 grid w-full grid-cols-3 gap-2'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='flex flex-col items-center'>
              <Skeleton className='h-5 w-10' />
              <Skeleton className='h-3 w-8 mt-1' />
            </div>
          ))}
        </div>

        {/* Followers/Following */}
        <div className='mt-4 flex w-full justify-around gap-2'>
          {[1, 2].map((i) => (
            <div
              key={i}
              className='flex flex-1 flex-col items-center rounded-md dark:bg-main bg-gray-100 p-2'
            >
              <Skeleton className='h-4 w-4' />
              <Skeleton className='h-4 w-8 mt-1' />
              <Skeleton className='h-3 w-16 mt-1' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Leaderboard Row Skeleton
// ==========================================
export function LeaderboardRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 bg-slate-800/30 rounded-lg',
        className
      )}
    >
      <div className='flex items-center gap-3'>
        <Skeleton className='w-8 h-8 rounded-full' />
        <Skeleton className='w-10 h-10 rounded-full' />
        <div>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-3 w-20 mt-1' />
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <Skeleton className='h-5 w-12 rounded-full' />
        <Skeleton className='h-5 w-8 rounded-full' />
      </div>
    </div>
  )
}

// ==========================================
// Table Row Skeleton
// ==========================================
interface TableRowSkeletonProps {
  columns?: number
  className?: string
}

export function TableRowSkeleton({
  columns = 5,
  className
}: TableRowSkeletonProps) {
  return (
    <div className={cn('flex items-center gap-4 p-3', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className={cn('h-4', i === 0 ? 'w-8' : 'flex-1')} />
      ))}
    </div>
  )
}

// ==========================================
// Comment/Discussion Skeleton
// ==========================================
export function CommentSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-3', className)}>
      <Skeleton className='h-10 w-10 rounded-full shrink-0' />
      <div className='flex-1'>
        <div className='flex items-center gap-2 mb-2'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-3 w-16' />
        </div>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-3/4 mt-1' />
        <div className='flex gap-4 mt-2'>
          <Skeleton className='h-4 w-12' />
          <Skeleton className='h-4 w-12' />
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Profile Header Skeleton
// ==========================================
export function ProfileHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex flex-col md:flex-row items-center gap-6', className)}
    >
      <Skeleton className='w-32 h-32 rounded-full' />
      <div className='flex-1 text-center md:text-left'>
        <Skeleton className='h-8 w-48 mx-auto md:mx-0' />
        <Skeleton className='h-4 w-32 mt-2 mx-auto md:mx-0' />
        <Skeleton className='h-4 w-64 mt-2 mx-auto md:mx-0' />
        <div className='flex gap-4 mt-4 justify-center md:justify-start'>
          <Skeleton className='h-10 w-24 rounded-md' />
          <Skeleton className='h-10 w-24 rounded-md' />
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Stats Card Skeleton
// ==========================================
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-4 border border-gray-300 dark:border-slate-700 rounded-lg',
        className
      )}
    >
      <div className='flex items-center justify-between mb-2'>
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-8 w-8 rounded-full' />
      </div>
      <Skeleton className='h-8 w-16' />
      <Skeleton className='h-3 w-20 mt-1' />
    </div>
  )
}

// ==========================================
// Grid Skeleton Loader
// ==========================================
interface SkeletonGridProps {
  count?: number
  columns?: 1 | 2 | 3 | 4
  type?:
    | 'quiz'
    | 'quizDetail'
    | 'featured'
    | 'category'
    | 'player'
    | 'leaderboard'
  className?: string
}

const skeletonComponents = {
  quiz: QuizCardSkeleton,
  quizDetail: QuizCardDetailSkeleton,
  featured: FeaturedQuizSkeleton,
  category: CategoryCardSkeleton,
  player: PlayerCardSkeleton,
  leaderboard: LeaderboardRowSkeleton
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
}

export function SkeletonGrid({
  count = 8,
  columns = 4,
  type = 'quiz',
  className
}: SkeletonGridProps) {
  const SkeletonComponent = skeletonComponents[type]

  // For leaderboard, don't use grid
  if (type === 'leaderboard') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonComponent key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-6', columnClasses[columns], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  )
}

// ==========================================
// Text Content Skeleton
// ==========================================
interface TextSkeletonProps {
  lines?: number
  className?: string
}

export function TextSkeleton({ lines = 3, className }: TextSkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  )
}

// ==========================================
// Notification Item Skeleton
// ==========================================
export function NotificationSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 p-3', className)}>
      <Skeleton className='h-10 w-10 rounded-full shrink-0' />
      <div className='flex-1'>
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-3 w-2/3 mt-1' />
        <Skeleton className='h-3 w-16 mt-2' />
      </div>
    </div>
  )
}
