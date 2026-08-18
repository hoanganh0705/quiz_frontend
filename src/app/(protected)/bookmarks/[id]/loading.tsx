import { Skeleton } from '@/components/ui/Skeleton';

export default function CollectionDetailLoading() {
  return (
    <div className='min-h-screen text-foreground'>
      <div className='max-w-7xl mx-auto px-4 py-6 space-y-8'>
        {/* Header skeleton */}
        <div className='space-y-4'>
          <Skeleton className='h-4 w-32 rounded mb-4' />
          <div className='flex items-start gap-3'>
            <Skeleton className='h-12 w-12 rounded-lg' />
            <div className='space-y-2'>
              <Skeleton className='h-8 w-48 rounded' />
              <Skeleton className='h-4 w-64 rounded' />
              <Skeleton className='h-4 w-24 rounded' />
            </div>
          </div>
        </div>

        {/* Grid skeleton */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className='rounded-lg border bg-card overflow-hidden space-y-2'
            >
              <Skeleton className='h-40 rounded-none' />
              <div className='p-3 space-y-2'>
                <Skeleton className='h-4 w-3/4' />
                <Skeleton className='h-3 w-1/2' />
              </div>
            </div>
          ))}
        </div>

        {/* Analytics skeleton */}
        <div className='rounded-lg border bg-card p-4 space-y-4'>
          <Skeleton className='h-6 w-32 rounded' />
          <div className='grid grid-cols-2 gap-4'>
            <Skeleton className='h-20 rounded-lg' />
            <Skeleton className='h-20 rounded-lg' />
          </div>
        </div>
      </div>
    </div>
  );
}