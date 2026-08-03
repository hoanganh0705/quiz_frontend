'use client';

/**
 * `CreateQuizFormSkeleton` — loading skeleton that matches the form layout.
 *
 * Source epic:   Epic 4.8 — Quiz create form.
 * Source ticket: TKT-4.8-C4.
 *
 * Renders animated skeleton blocks that mirror the layout of
 * `CreateQuizForm`:
 *   - Cover image area
 *   - Title + slug row
 *   - Description
 *   - Category + tags row
 *   - Quiz settings section (difficulty, duration, passing score, XP)
 *   - Acknowledgements
 *   - Submit button
 *
 * Used by `app/(protected)/create-quiz/loading.tsx` as the loading state.
 */

import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Skeleton loader for the quiz creation form.
 * Rendered by `loading.tsx` while the page is streaming/hydrating.
 */
export function CreateQuizFormSkeleton(): React.ReactElement {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading quiz form">
      {/* Cover image */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-48 w-full rounded-md" />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-32 w-full" />
      </div>

      {/* Category + Tags row */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Quiz Settings section */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>

      {/* Acknowledgements */}
      <div className="flex items-start gap-3">
        <Skeleton className="size-4 shrink-0 rounded" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center gap-4 pt-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-4 w-36" />
      </div>
    </div>
  );
}
