import { Skeleton } from '@/components/ui/skeleton'

export default function BookmarksLoading() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Header Skeleton */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <Skeleton className='h-8 w-8 rounded-md' />
          <Skeleton className='h-9 w-48' />
        </div>
        <Skeleton className='h-5 w-64' />
      </div>

      {/* Tabs Skeleton */}
      <div className='flex items-center justify-between mb-6'>
        <Skeleton className='h-10 w-64' />
        <div className='flex gap-2'>
          <Skeleton className='h-9 w-20' />
          <Skeleton className='h-9 w-36' />
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className='flex flex-col sm:flex-row gap-3 mb-6'>
        <Skeleton className='h-10 flex-1' />
        <div className='flex gap-2'>
          <Skeleton className='h-9 w-24' />
          <Skeleton className='h-9 w-20' />
          <Skeleton className='h-9 w-20' />
        </div>
        <Skeleton className='h-10 w-40' />
      </div>

      {/* Grid Skeleton */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className='rounded-lg border overflow-hidden'>
            <Skeleton className='h-40 w-full' />
            <div className='p-3 space-y-3'>
              <div className='flex gap-4'>
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-4 w-16' />
                <Skeleton className='h-5 w-20' />
              </div>
              <Skeleton className='h-4 w-32' />
              <Skeleton className='h-9 w-full' />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
