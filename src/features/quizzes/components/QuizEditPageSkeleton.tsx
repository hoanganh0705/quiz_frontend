/**
 * `QuizEditPageSkeleton` — loading skeleton for the quiz edit page.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9.8 (skeleton for loading.tsx).
 *
 * Renders animated skeleton blocks that mirror the layout of `QuizEditPage`:
 *   - Header (title + back link)
 *   - Tabs
 *   - Version list
 *   - Edit form
 *
 * Used by `app/(protected)/my-quizzes/[id]/edit/loading.tsx` as the loading state.
 */

'use client';

import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Skeleton loader for the quiz edit page.
 * Rendered by `loading.tsx` while the page is streaming/hydrating.
 */
export function QuizEditPageSkeleton(): React.ReactElement {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading quiz edit page">
      {/* Header skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-8 w-64" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex items-center gap-4 border-b border-border">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Layout: sidebar + main content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Version list (sidebar) */}
        <div className="lg:col-span-1 space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>

        {/* Form (main content) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Version info */}
          <Skeleton className="h-20 w-full rounded-lg" />

          {/* Difficulty */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* Passing score */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-4 w-8" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-4 pt-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    </div>
  );
}
