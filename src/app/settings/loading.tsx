import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      <div className='max-w-4xl mx-auto'>
        {/* Header Skeleton */}
        <div className='mb-8'>
          <Skeleton className='h-9 w-32 mb-2' />
          <Skeleton className='h-5 w-64' />
        </div>

        {/* Tabs Skeleton */}
        <div className='flex gap-2 mb-8 border-b border-gray-300 dark:border-slate-700 pb-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-10 w-28 rounded-md' />
          ))}
        </div>

        {/* Settings Sections */}
        <div className='space-y-8'>
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <div
              key={sectionIndex}
              className='p-6 border border-gray-300 dark:border-slate-700 rounded-lg'
            >
              <Skeleton className='h-6 w-40 mb-4' />

              <div className='space-y-6'>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className='flex items-center justify-between'>
                    <div className='flex-1'>
                      <Skeleton className='h-5 w-32 mb-1' />
                      <Skeleton className='h-4 w-48' />
                    </div>
                    <Skeleton className='h-6 w-12 rounded-full' />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Action Buttons */}
          <div className='flex gap-4 pt-4'>
            <Skeleton className='h-10 w-32 rounded-md' />
            <Skeleton className='h-10 w-24 rounded-md' />
          </div>
        </div>
      </div>
    </div>
  )
}
