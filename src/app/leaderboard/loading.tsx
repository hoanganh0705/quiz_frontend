import { Skeleton } from '@/components/ui/skeleton'
import { LeaderboardRowSkeleton } from '@/components/ui/loading-states'

export default function LeaderboardLoading() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Header Skeleton */}
      <div className='mb-8 text-center'>
        <Skeleton className='h-10 w-48 mx-auto mb-2' />
        <Skeleton className='h-5 w-72 mx-auto' />
      </div>

      {/* Top 3 Players Skeleton */}
      <div className='flex justify-center items-end gap-4 mb-12'>
        {/* 2nd Place */}
        <div className='flex flex-col items-center'>
          <Skeleton className='w-20 h-20 rounded-full mb-2' />
          <Skeleton className='h-5 w-24 mb-1' />
          <Skeleton className='h-4 w-16' />
        </div>

        {/* 1st Place */}
        <div className='flex flex-col items-center -mt-8'>
          <Skeleton className='w-24 h-24 rounded-full mb-2' />
          <Skeleton className='h-6 w-28 mb-1' />
          <Skeleton className='h-5 w-20' />
        </div>

        {/* 3rd Place */}
        <div className='flex flex-col items-center'>
          <Skeleton className='w-20 h-20 rounded-full mb-2' />
          <Skeleton className='h-5 w-24 mb-1' />
          <Skeleton className='h-4 w-16' />
        </div>
      </div>

      {/* Leaderboard Table Skeleton */}
      <div className='max-w-4xl mx-auto'>
        <div className='bg-card border border-gray-300 dark:border-slate-700 rounded-lg overflow-hidden'>
          {/* Table Header */}
          <div className='flex items-center gap-4 p-4 border-b border-gray-300 dark:border-slate-700'>
            <Skeleton className='h-4 w-12' />
            <Skeleton className='h-4 w-32' />
            <Skeleton className='h-4 w-20 ml-auto' />
            <Skeleton className='h-4 w-16' />
          </div>

          {/* Table Rows */}
          <div className='space-y-1 p-2'>
            {Array.from({ length: 10 }).map((_, i) => (
              <LeaderboardRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
