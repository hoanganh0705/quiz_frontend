'use client';

/**
 * `features/admin/achievement-admin/hooks/useAsyncJobStatus.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.C6.
 *
 * ## What this file ships
 *
 * A noop stub. A1 §2.4 confirms the backend does NOT expose a `jobId`
 * in the `reevaluateUserBadges` response. The re-evaluation is synchronous —
 * there is no polling endpoint to call and no job status to track.
 *
 * This file is the integration point: when the backend later adds
 * `jobId` support, replace this stub with the real polling implementation.
 * The consumer `useReevaluateUserAchievements` (TKT-7.8.C4) already wires
 * `jobInfo` from this hook; it is an optional field and remains backward-
 * compatible when this stub is replaced.
 *
 * ## Stub behaviour
 *
 * When `jobId` is `null` or when the stub is used:
 *   - `status` is always `'idle'`.
 *   - `isPolling` is always `false`.
 *   - No fetch is ever made.
 *
 * ## Real implementation contract (future)
 *
 * The real `useAsyncJobStatus(jobId)` will:
 *   - Call the achievement admin job-status endpoint on mount.
 *   - Poll with exponential backoff (1s → 2s → 4s → 8s, capped).
 *   - Stop polling on unmount or terminal status (`'completed'` / `'failed'`).
 *   - Expose `{ status: ReevalLifecycle, isPolling: boolean, error: ApiError | null }`.
 *
 * @see TKT-7.8.C4 — `useReevaluateUserAchievements` wires `jobInfo` from here
 * @see EPIC_7_8_A1.md §2.4 — "jobId not exposed at this commit"
 */

import { useMemo } from 'react';

import {
  REEVAL_LIFECYCLE_IDLE,
  type ReevalLifecycle,
} from '../achievement-admin-types';

import type { ApiError } from '@/lib/api/core/ApiError';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseAsyncJobStatusResult {
  /**
   * Always `'idle'` for the noop stub.
   * In the real implementation this reflects the polled job status.
   */
  readonly status: ReevalLifecycle;
  /** Always `false` for the noop stub. */
  readonly isPolling: boolean;
  /** Always `null` for the noop stub. */
  readonly error: ApiError | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Stub: job-status polling hook.
 *
 * Returns safe noop state since the backend does not expose a `jobId`
 * at this commit (A1 §2.4).
 *
 * Replace this with the real polling implementation when the backend
 * adds `jobId` support.
 */
export function useAsyncJobStatus(jobId: string | null): UseAsyncJobStatusResult {
  // The noop stub: always idle, never polling, no error.
  return useMemo<UseAsyncJobStatusResult>(
    () => ({
      status: REEVAL_LIFECYCLE_IDLE,
      isPolling: false,
      error: null,
    }),
    // No dependencies — the stub always returns the same values.
    [],
  );
}
