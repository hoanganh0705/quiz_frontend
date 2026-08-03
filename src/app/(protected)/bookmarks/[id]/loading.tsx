'use client';

/**
 * Loading state for the collection detail page.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B4-1.
 */

export default function CollectionDetailLoading() {
  return (
    <div className='min-h-screen text-foreground'>
      <div className='max-w-7xl mx-auto px-4 py-6 space-y-8'>
        {/* Header skeleton */}
        <div className='space-y-4'>
          <div className='animate-pulse'>
            <div className='h-4 w-32 bg-muted rounded mb-4' />
            <div className='flex items-start gap-3'>
              <div className='h-12 w-12 rounded-lg bg-muted' />
              <div className='space-y-2'>
                <div className='h-8 w-48 bg-muted rounded' />
                <div className='h-4 w-64 bg-muted rounded' />
                <div className='h-4 w-24 bg-muted rounded' />
              </div>
            </div>
          </div>
        </div>

        {/* Grid skeleton */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className='animate-pulse rounded-lg border bg-card overflow-hidden'>
              <div className='h-40 bg-muted' />
              <div className='p-3 space-y-2'>
                <div className='h-4 w-3/4 bg-muted rounded' />
                <div className='h-3 w-1/2 bg-muted rounded' />
              </div>
            </div>
          ))}
        </div>

        {/* Analytics skeleton */}
        <div className='animate-pulse rounded-lg border bg-card p-4'>
          <div className='h-6 w-32 bg-muted rounded mb-4' />
          <div className='grid grid-cols-2 gap-4'>
            <div className='h-20 rounded-lg bg-muted' />
            <div className='h-20 rounded-lg bg-muted' />
          </div>
        </div>
      </div>
    </div>
  );
}
