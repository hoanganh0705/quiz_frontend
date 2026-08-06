'use client';

/**
 * `features/admin/tag-admin/components/TagAdminSkeleton.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.D3.
 *
 * ## Purpose
 *
 * Skeleton placeholder matching the active / soft-deleted tab layout.
 * No data fetching; purely presentational.
 */

import { Skeleton } from '@/components/ui/Skeleton';

export interface TagAdminSkeletonProps {
  /** Which tab layout to mirror. */
  tab: 'active' | 'deleted';
}

export function TagAdminSkeleton({ tab }: TagAdminSkeletonProps) {
  return (
    <div className='space-y-4'>
      {/* Tab headers */}
      <div className='flex gap-1 border-b border-border'>
        <Skeleton className='h-9 w-20 rounded-none rounded-t-md' />
        <Skeleton className='h-9 w-32 rounded-none rounded-t-md' />
      </div>

      {/* Tag cards grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className='rounded-lg border border-border p-4 space-y-3'
          >
            <div className='flex items-center gap-2'>
              <Skeleton className='h-6 w-24 rounded-md' />
              {tab === 'deleted' && (
                <Skeleton className='h-5 w-16 rounded-md' />
              )}
            </div>
            <Skeleton className='h-3 w-16 rounded' />
            {tab === 'deleted' && (
              <Skeleton className='h-3 w-24 rounded' />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
