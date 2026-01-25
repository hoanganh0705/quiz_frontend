import { Skeleton } from '@/components/ui/skeleton'
import { CommentSkeleton } from '@/components/ui/loading-states'

export default function DiscussionsLoading() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Header Skeleton */}
      <div className='mb-8'>
        <Skeleton className='h-9 w-48 mb-2' />
        <Skeleton className='h-5 w-72' />
      </div>

      {/* Filters Skeleton */}
      <div className='flex gap-4 mb-8'>
        <Skeleton className='h-10 w-32 rounded-md' />
        <Skeleton className='h-10 w-40 rounded-md' />
        <Skeleton className='h-10 w-28 rounded-md ml-auto' />
      </div>

      {/* Discussion Cards Skeleton */}
      <div className='space-y-4'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className='p-6 border border-gray-300 dark:border-slate-700 rounded-lg'
          >
            {/* Discussion Header */}
            <div className='flex items-start gap-4 mb-4'>
              <Skeleton className='h-12 w-12 rounded-full flex-shrink-0' />
              <div className='flex-1'>
                <Skeleton className='h-6 w-3/4 mb-2' />
                <div className='flex items-center gap-2'>
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-4 w-4 rounded-full' />
                  <Skeleton className='h-4 w-32' />
                </div>
              </div>
              <Skeleton className='h-6 w-16 rounded-full' />
            </div>

            {/* Discussion Content */}
            <Skeleton className='h-4 w-full mb-2' />
            <Skeleton className='h-4 w-5/6 mb-4' />

            {/* Tags */}
            <div className='flex gap-2 mb-4'>
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className='h-6 w-16 rounded-full' />
              ))}
            </div>

            {/* Actions */}
            <div className='flex items-center gap-4'>
              <Skeleton className='h-8 w-16' />
              <Skeleton className='h-8 w-20' />
              <Skeleton className='h-8 w-16' />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
