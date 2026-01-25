import { Skeleton } from '@/components/ui/skeleton'
import {
  SkeletonGrid,
  QuizCardDetailSkeleton,
  FeaturedQuizSkeleton
} from '@/components/ui/loading-states'

export default function QuizzesLoading() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Header Skeleton */}
      <div className='mb-8'>
        <Skeleton className='h-9 w-48 mb-2' />
        <Skeleton className='h-5 w-80' />
      </div>

      {/* Search Bar Skeleton */}
      <div className='relative mb-8'>
        <Skeleton className='h-8 w-full rounded-full' />
      </div>

      {/* Category Tabs Skeleton */}
      <div className='mb-12 hidden sm:flex gap-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className='h-9 w-24 rounded-full' />
        ))}
      </div>

      {/* Featured Quizzes Section Skeleton */}
      <div className='mb-15'>
        <div className='flex items-center justify-between mb-5'>
          <div>
            <Skeleton className='h-8 w-48 mb-2' />
            <Skeleton className='h-4 w-72' />
          </div>
          <div className='hidden xl:flex gap-2'>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className='h-9 w-20' />
            ))}
          </div>
        </div>

        {/* Featured Quiz Grid */}
        <div className='grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <FeaturedQuizSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className='flex xl:flex-row flex-col gap-7'>
        {/* Sidebar Skeleton */}
        <div className='xl:w-[16rem] w-full mb-3 xl:mb-0'>
          <Skeleton className='h-7 w-16 mb-6' />
          <div className='border border-gray-300 dark:border-slate-700 rounded-md p-4'>
            {/* Filter sections */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='mb-6'>
                <Skeleton className='h-5 w-24 mb-3' />
                <div className='space-y-2'>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className='flex items-center gap-2'>
                      <Skeleton className='h-4 w-4 rounded-full' />
                      <Skeleton className='h-4 w-20' />
                    </div>
                  ))}
                </div>
                {i < 2 && <Skeleton className='h-px w-full my-4' />}
              </div>
            ))}
          </div>
        </div>

        {/* Quiz Grid Skeleton */}
        <div className='flex-1'>
          <SkeletonGrid count={8} columns={3} type='quizDetail' />
        </div>
      </div>
    </div>
  )
}
