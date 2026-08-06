'use client';

/**
 * `features/admin/category-admin/components/CategoryAdminErrorState.tsx`
 *
 * Source epic:   Epic 7.4 — Category admin CRUD + restore.
 * Source ticket: TKT-7.4.D3.
 *
 * Error state for the category admin list. Renders the `ErrorState`
 * primitive with `requestId` banner correlation and a retry affordance.
 *
 * No data fetching; purely presentational.
 */

import type { ApiError } from '@/lib/api';

import { ErrorState } from '@/components/ui/loading-states/ErrorState';

export interface CategoryAdminErrorStateProps {
  /** The typed `ApiError` from the failed fetch. */
  error: ApiError;
  /** Triggers a re-fetch of the admin category list. */
  onRetry: () => void;
}

export function CategoryAdminErrorState({
  error,
  onRetry,
}: CategoryAdminErrorStateProps) {
  return (
    <div className='space-y-4'>
      <ErrorState
        title='Failed to load categories'
        message={error.detail || 'An unexpected error occurred. Please try again.'}
        onRetry={onRetry}
        retryText='Try Again'
        variant='server'
      />
    </div>
  );
}