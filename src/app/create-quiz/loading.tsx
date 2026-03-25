import { Skeleton } from '@/components/ui/skeleton'

export default function CreateQuizLoading() {
  return (
    <div className='min-h-screen p-4 md:p-6 space-y-6'>
      <Skeleton className='h-10 w-full' />
      <Skeleton className='h-80 w-full rounded-xl' />
      <div className='flex gap-3'>
        <Skeleton className='h-10 w-28' />
        <Skeleton className='h-10 w-28' />
        <Skeleton className='h-10 w-28' />
      </div>
      <Skeleton className='h-64 w-full' />
    </div>
  )
}
