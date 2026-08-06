'use client';

/**
 * `features/admin/tag-admin/components/TagAdminErrorState.tsx`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.D3.
 *
 * ## Purpose
 *
 * Error state for the tag admin list. Renders the `ErrorState` primitive
 * with `requestId` banner correlation and a retry affordance.
 *
 * No data fetching; purely presentational.
 */

import type { ApiError } from '@/lib/api';

import { ErrorState } from '@/components/ui/loading-states/ErrorState';

export interface TagAdminErrorStateProps {
  /** The typed `ApiError` from the failed fetch. */
  error: ApiError;
  /** Triggers a re-fetch of the admin tag list. */
  onRetry: () => void;
}

export function TagAdminErrorState({ error, onRetry }: TagAdminErrorStateProps) {
  return (
    <div className='space-y-4'>
      <ErrorState
        title='Failed to load tags'
        message={error.detail || 'An unexpected error occurred. Please try again.'}
        onRetry={onRetry}
        retryText='Try Again'
        variant='server'
      />
    </div>
  );
}
