'use client';

/**
 * `features/admin/achievement-admin/hooks/useReevaluateUserAchievements.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.C4.
 *
 * ## What this hook owns
 *
 * - Wrap `reevaluateUserAchievements` (TKT-7.1.E6 / `achievement-admin.service.ts`)
 *   with local lifecycle tracking, typed-code propagation, SWR invalidation,
 *   and audit breadcrumbs.
 * - Expose `{ reevaluate, lifecycle, isPending, error, audit, jobInfo, reset }`.
 *
 * ## Lifecycle
 *
 * The re-evaluation is synchronous at this commit (A1 §2.4: no `jobId` exposed).
 * The `'running'` state is derived from the in-flight promise; there is no polling.
 * On success the lifecycle flips to `'completed'`; on error it flips to `'failed'`.
 * `reset()` returns to `'idle'`.
 *
 * ## Error handling
 *
 * - `REVAL_RUNNING` → surfaces the typed code without retry; lifecycle stays `'running'`
 *   (the in-flight request from another tab/admin is the owner); a second `reevaluate()`
 *   call while one is in flight is a no-op (returns the in-flight promise).
 * - `ACHIEVEMENT_NOT_FOUND`, `PERMISSION_DENIED`, `ADMIN_FORBIDDEN` → surfaces without retry.
 * - Every error emits a `phase7:admin` breadcrumb with `requestId` for `RequestIdBanner`.
 *
 * ## SWR invalidation
 *
 * On success, the hook invalidates:
 *   - `['admin', 'achievement', 'user-badges', userId]`  (C1)
 *   - `['admin', 'achievement', 'user-history', userId, ...]` (C2 — all pages)
 *
 * ## Audit
 *
 * The hook emits the `phase7:admin` audit breadcrumb on success and failure
 * via `addAchievementAdminBreadcrumb`. The `audit` handle exposes the
 * `before` snapshot (captured when the mutation starts) so
 * `AuditActionShell` can render the before/after diff without re-implementing
 * the capture logic.
 */

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api/core/ApiError';
import { addAchievementAdminBreadcrumb } from '@/lib/admin/phase7_admin_sentry';

import {
  reevaluateUserAchievements,
  type AchievementReevaluateResponseDto,
} from '@/features/admin/services/achievement-admin.service';
import { isReevalTerminal,
  REEVAL_LIFECYCLE_COMPLETED,
  REEVAL_LIFECYCLE_FAILED,
  REEVAL_LIFECYCLE_IDLE,
  REEVAL_LIFECYCLE_RUNNING,
  type ReevalLifecycle,
  type ReevalJobInfo,
} from '../achievement-admin-types';

import {
  invalidateAchievementAdmin,
} from '../cache-keys';

import {
  broadcastAchievementAdminMutation,
} from '../broadcast';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseReevaluateUserAchievementsAudit {
  /** The response payload captured at the start of the mutation. */
  before: AchievementReevaluateResponseDto | null;
  /** The response payload returned by the server on success. */
  after: AchievementReevaluateResponseDto | null;
}

export interface UseReevaluateUserAchievementsResult {
  /**
   * Trigger a re-evaluation for `userId`.
   * Resolves to the server response on success.
   * Rejects with `ApiError` on failure.
   * Concurrent calls while a request is in flight return the same promise.
   */
  readonly reevaluate: () => Promise<AchievementReevaluateResponseDto>;
  /** The current lifecycle state. */
  readonly lifecycle: ReevalLifecycle;
  /** True while a re-evaluation is in flight. */
  readonly isPending: boolean;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /** Audit snapshot for `AuditActionShell`. */
  readonly audit: UseReevaluateUserAchievementsAudit;
  /**
   * Job information. Always `{ isJobIdExposed: false, lifecycle }`
   * at this commit (A1 §2.4).
   */
  readonly jobInfo: ReevalJobInfo;
  /** Clear error and audit state; reset lifecycle to `'idle'`. */
  readonly reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Re-evaluate a user's achievements for the achievement admin surface.
 */
export function useReevaluateUserAchievements(
  userId: string,
): UseReevaluateUserAchievementsResult {
  const [lifecycle, setLifecycle] = useState<ReevalLifecycle>(REEVAL_LIFECYCLE_IDLE);
  const [error, setError] = useState<ApiError | null>(null);
  const [audit, setAudit] = useState<UseReevaluateUserAchievementsAudit>({
    before: null,
    after: null,
  });

  // The in-flight promise — returned by concurrent calls so the mutation
  // fires exactly once per reevaluate() cycle.
  const inFlightRef = useRef<Promise<AchievementReevaluateResponseDto> | null>(null);

  const invalidate = useCallback(() => {
    void invalidateAchievementAdmin(userId, globalMutate);
  }, [userId]);

  const reevaluate = useCallback((): Promise<AchievementReevaluateResponseDto> => {
    // If a request is already in flight, return it (no duplicate requests).
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    // Capture the start time for the breadcrumb.
    const startedAt = Date.now();

    setLifecycle(REEVAL_LIFECYCLE_RUNNING);
    setError(null);

    // Emit "started" breadcrumb.
    addAchievementAdminBreadcrumb({
      action: 'achievement.reevaluate',
      route: 'achievements.reevaluateUserBadges',
      targetId: userId,
      status: 'started',
      durationMs: 0,
      before: null,
    });

    const promise = reevaluateUserAchievements(userId)
      .then((result) => {
        const durationMs = Date.now() - startedAt;

        setLifecycle(REEVAL_LIFECYCLE_COMPLETED);
        setAudit((prev) => ({ ...prev, after: result }));

        // Emit "success" breadcrumb.
        addAchievementAdminBreadcrumb({
          action: 'achievement.reevaluate',
          route: 'achievements.reevaluateUserBadges',
          targetId: userId,
          status: 'success',
          durationMs,
          before: audit.before,
          after: result,
        });

        // Invalidate SWR caches so badge list reflects new state.
        invalidate();

        // Broadcast to other tabs so they revalidate too.
        broadcastAchievementAdminMutation({
          action: 'reevaluate',
          userId,
          requestId: (result as unknown as { requestId?: string }).requestId ?? '',
        });

        return result;
      })
      .catch((err: ApiError) => {
        const durationMs = Date.now() - startedAt;
        const apiError = err as ApiError;

        // Determine terminal lifecycle state from the error code.
        const isTerminal = isReevalTerminal(apiError.code as ReevalLifecycle);

        if (apiError.code === 'REVAL_RUNNING') {
          // Another admin already has a re-evaluation running. Do NOT transition
          // to 'failed' — stay in 'running' so the UI remains stable. The
          // running indicator stays visible and the admin can retry after the
          // concurrent request finishes.
          setError(apiError);
        } else {
          setLifecycle(isTerminal ? (apiError.code as ReevalLifecycle) : REEVAL_LIFECYCLE_FAILED);
          setError(apiError);
        }

        // Emit "failure" breadcrumb.
        addAchievementAdminBreadcrumb({
          action: 'achievement.reevaluate',
          route: 'achievements.reevaluateUserBadges',
          targetId: userId,
          status: 'failure',
          durationMs,
          code: apiError.code,
          requestId: apiError.extensions?.requestId as string | undefined,
          correlationId: apiError.extensions?.correlationId as string | undefined,
        });

        return Promise.reject(apiError);
      })
      .finally(() => {
        inFlightRef.current = null;
      });

    inFlightRef.current = promise;
    return promise;
  }, [userId, invalidate, audit.before]);

  const reset = useCallback(() => {
    setLifecycle(REEVAL_LIFECYCLE_IDLE);
    setError(null);
    setAudit({ before: null, after: null });
    inFlightRef.current = null;
  }, []);

  return {
    reevaluate,
    lifecycle,
    isPending: lifecycle === REEVAL_LIFECYCLE_RUNNING,
    error,
    audit,
    jobInfo: {
      isJobIdExposed: false,
      lifecycle,
    },
    reset,
  };
}
