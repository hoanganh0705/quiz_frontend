import { Skeleton } from '@/components/ui/skeleton'

export default function FriendsLoading() {
  return (
    <div className='min-h-screen p-4 md:p-8 lg:p-12 space-y-6'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-56' />
        <Skeleton className='h-4 w-96' />
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
        <Skeleton className='h-80 w-full' />
        <Skeleton className='h-80 w-full xl:col-span-2' />
        <Skeleton className='h-96 w-full xl:col-span-2' />
        <Skeleton className='h-96 w-full' />
      </div>
    </div>
  )
}
