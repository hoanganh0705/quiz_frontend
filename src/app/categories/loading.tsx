import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonGrid } from '@/components/ui/loading-states'

export default function CategoriesLoading() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      {/* Header Skeleton */}
      <div className='mb-8'>
        <Skeleton className='h-9 w-56 mb-2' />
        <Skeleton className='h-5 w-96' />
      </div>

      {/* Search Bar Skeleton */}
      <div className='relative mb-8'>
        <Skeleton className='h-10 w-full max-w-md rounded-md' />
      </div>

      {/* Categories Grid Skeleton */}
      <SkeletonGrid count={12} columns={4} type='category' />
    </div>
  )
}
