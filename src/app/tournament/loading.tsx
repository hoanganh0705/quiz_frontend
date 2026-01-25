import { Skeleton } from '@/components/ui/skeleton'

export default function TournamentLoading() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Header Skeleton */}
      <div className='mb-8'>
        <Skeleton className='h-10 w-56 mb-2' />
        <Skeleton className='h-5 w-80' />
      </div>

      {/* Featured Tournament Banner Skeleton */}
      <div className='mb-12'>
        <div className='relative h-64 md:h-80 rounded-2xl overflow-hidden'>
          <Skeleton className='h-full w-full' />
          <div className='absolute inset-0 flex flex-col justify-end p-6'>
            <Skeleton className='h-6 w-32 mb-2' />
            <Skeleton className='h-8 w-64 mb-2' />
            <Skeleton className='h-4 w-96 mb-4' />
            <div className='flex gap-4'>
              <Skeleton className='h-10 w-32 rounded-md' />
              <Skeleton className='h-10 w-28 rounded-md' />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className='flex flex-wrap gap-4 mb-8'>
        <Skeleton className='h-10 w-40 rounded-md' />
        <Skeleton className='h-10 w-36 rounded-md' />
        <Skeleton className='h-10 w-44 rounded-md' />
      </div>

      {/* Tournament Cards Grid Skeleton */}
      <div className='grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className='border border-gray-300 dark:border-slate-700 rounded-xl overflow-hidden'
          >
            {/* Tournament Image */}
            <Skeleton className='h-40 w-full' />

            {/* Content */}
            <div className='p-4'>
              <div className='flex items-center justify-between mb-3'>
                <Skeleton className='h-5 w-24 rounded-full' />
                <Skeleton className='h-5 w-20 rounded-full' />
              </div>

              <Skeleton className='h-6 w-3/4 mb-2' />
              <Skeleton className='h-4 w-full mb-4' />

              {/* Stats */}
              <div className='grid grid-cols-3 gap-2 mb-4'>
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className='text-center'>
                    <Skeleton className='h-5 w-10 mx-auto mb-1' />
                    <Skeleton className='h-3 w-14 mx-auto' />
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className='mb-4'>
                <div className='flex justify-between mb-1'>
                  <Skeleton className='h-4 w-20' />
                  <Skeleton className='h-4 w-16' />
                </div>
                <Skeleton className='h-2 w-full rounded-full' />
              </div>

              {/* Button */}
              <Skeleton className='h-10 w-full rounded-md' />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
