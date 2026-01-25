import { Skeleton } from '@/components/ui/skeleton'
import {
  StatsCardSkeleton,
  ProfileHeaderSkeleton
} from '@/components/ui/loading-states'

export default function ProfileLoading() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Profile Header Skeleton */}
      <div className='max-w-4xl mx-auto mb-8'>
        <ProfileHeaderSkeleton />
      </div>

      {/* Stats Cards Skeleton */}
      <div className='max-w-4xl mx-auto mb-8'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className='max-w-4xl mx-auto'>
        <div className='flex gap-2 mb-6'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-10 w-24 rounded-md' />
          ))}
        </div>

        {/* Content Area Skeleton */}
        <div className='space-y-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='p-4 border border-gray-300 dark:border-slate-700 rounded-lg'
            >
              <div className='flex items-center gap-4'>
                <Skeleton className='h-12 w-12 rounded-lg' />
                <div className='flex-1'>
                  <Skeleton className='h-5 w-48 mb-2' />
                  <Skeleton className='h-4 w-32' />
                </div>
                <Skeleton className='h-8 w-20 rounded-md' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
