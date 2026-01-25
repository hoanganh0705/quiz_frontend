import { Skeleton } from '@/components/ui/skeleton'

export default function DailyChallengeLoading() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Header with Timer Skeleton */}
      <div className='text-center mb-12'>
        <Skeleton className='h-10 w-64 mx-auto mb-4' />
        <Skeleton className='h-6 w-96 mx-auto mb-6' />

        {/* Timer Skeleton */}
        <div className='flex justify-center gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='flex flex-col items-center'>
              <Skeleton className='h-16 w-16 rounded-lg mb-2' />
              <Skeleton className='h-4 w-12' />
            </div>
          ))}
        </div>
      </div>

      {/* Challenge Card Skeleton */}
      <div className='max-w-2xl mx-auto'>
        <div className='border border-gray-300 dark:border-slate-700 rounded-xl overflow-hidden'>
          {/* Image */}
          <Skeleton className='h-64 w-full' />

          {/* Content */}
          <div className='p-6'>
            <div className='flex items-center justify-between mb-4'>
              <Skeleton className='h-6 w-48' />
              <Skeleton className='h-6 w-20 rounded-full' />
            </div>

            <Skeleton className='h-4 w-full mb-2' />
            <Skeleton className='h-4 w-3/4 mb-6' />

            {/* Stats */}
            <div className='grid grid-cols-3 gap-4 mb-6'>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className='text-center p-3 bg-gray-50 dark:bg-slate-800 rounded-lg'
                >
                  <Skeleton className='h-6 w-12 mx-auto mb-1' />
                  <Skeleton className='h-4 w-16 mx-auto' />
                </div>
              ))}
            </div>

            {/* Rewards */}
            <div className='mb-6'>
              <Skeleton className='h-5 w-24 mb-3' />
              <div className='flex gap-2'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className='h-8 w-24 rounded-full' />
                ))}
              </div>
            </div>

            {/* Button */}
            <Skeleton className='h-12 w-full rounded-md' />
          </div>
        </div>
      </div>

      {/* Leaderboard Preview Skeleton */}
      <div className='max-w-2xl mx-auto mt-8'>
        <Skeleton className='h-7 w-40 mb-4' />
        <div className='space-y-3'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='flex items-center gap-4 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg'
            >
              <Skeleton className='h-8 w-8 rounded-full' />
              <Skeleton className='h-10 w-10 rounded-full' />
              <div className='flex-1'>
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-3 w-20 mt-1' />
              </div>
              <Skeleton className='h-6 w-16' />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
