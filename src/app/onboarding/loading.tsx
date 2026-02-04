import { Skeleton } from '@/components/ui/skeleton'

export default function OnboardingLoading() {
  return (
    <div className='min-h-screen bg-background flex flex-col'>
      {/* Progress Header */}
      <div className='w-full px-4 py-6 border-b border-border'>
        <div className='max-w-2xl mx-auto'>
          <div className='flex items-center justify-between mb-3'>
            <Skeleton className='h-4 w-24' />
            <Skeleton className='h-4 w-20' />
          </div>
          <Skeleton className='h-2 w-full' />
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 flex items-center justify-center px-4 py-8'>
        <div className='w-full max-w-2xl space-y-8'>
          <div className='text-center space-y-4'>
            <Skeleton className='h-20 w-20 rounded-full mx-auto' />
            <Skeleton className='h-8 w-64 mx-auto' />
            <Skeleton className='h-4 w-80 mx-auto' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className='h-40 rounded-xl' />
            ))}
          </div>
          <div className='flex justify-center'>
            <Skeleton className='h-12 w-40' />
          </div>
        </div>
      </div>
    </div>
  )
}
