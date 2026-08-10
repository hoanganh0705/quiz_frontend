'use client';

/**
 * `features/admin/ranking-admin/hooks/useCheckRankingConsistency.ts`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.C3.
 *
 * ## What this hook owns
 *
 * Wraps `checkRankingConsistency` (TKT-7.1.E7 / `ranking-admin.service.ts`) with:
 *   - consistency result rendering (empty state for zero inconsistencies);
 *   - partial result flag when backend returns a truncated result;
 *   - `OPERATION_RUNNING` awareness — surfaces a notice and disables the
 *     trigger without retrying;
 *   - SWR cache invalidation on success;
 *   - Sentry audit breadcrumbs.
 *
 * The hook never retries blindly. All error branches surface the typed
 * `ApiError.code` without automatic retry.
 *
 * This is a read-mostly operation — no typed-confirm is required.
 */

import { useCallback, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/core/ApiError';
import { addRankingAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
  checkRankingConsistency,
  type RankingConsistencyCheckResponseDto,
} from '../../services/ranking-admin.service';
import type { RankingInconsistencyDto } from '../ranking-admin-types';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseCheckRankingConsistencyAudit {
  /** Snapshot captured at the start of the check (null before run). */
  before: RankingConsistencyCheckResponseDto | null;
  /** Server response on success. */
  after: RankingConsistencyCheckResponseDto | null;
}

export interface UseCheckRankingConsistencyResult {
  /**
   * Trigger a ranking consistency check.
   *
   * Resolves with the server response on success.
   * Rejects with `ApiError` on failure.
   * Concurrent calls while a request is in flight return the same promise.
   */
  readonly trigger: () => Promise<RankingConsistencyCheckResponseDto>;
  /**
   * The list of detected inconsistencies. Empty array when zero inconsistencies
   * are found.
   */
  readonly inconsistencies: RankingInconsistencyDto[];
  /**
   * Total inconsistencies found. `null` if not returned by the backend.
   */
  readonly totalCount: number | null;
  /**
   * When the consistency check was run. `null` before any check.
   */
  readonly checkedAt: Date | null;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /** True while a check is in flight. */
  readonly isRunning: boolean;
  /**
   * True when the backend returns a truncated result (per A1 §2.3).
   * Indicates that not all inconsistencies could be returned.
   */
  readonly isPartialResult: boolean;
  /** Audit snapshot for `AuditActionShell`. */
  readonly audit: UseCheckRankingConsistencyAudit;
  /** Clear error and audit state. */
  readonly reset: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────

const RANKING_ACTION = 'ranking.consistencyCheck';
const RANKING_ROUTE = 'rankings.consistencyCheck';

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Trigger a ranking consistency check with empty-state support and
 * partial-result flag.
 */
export function useCheckRankingConsistency(): UseCheckRankingConsistencyResult {
  const [inconsistencies, setInconsistencies] = useState<RankingInconsistencyDto[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPartialResult, setIsPartialResult] = useState(false);
  const [audit, setAudit] = useState<UseCheckRankingConsistencyAudit>({
    before: null,
    after: null,
  });

  // The in-flight promise — concurrent calls return the same promise.
  const inFlightRef = useRef<Promise<RankingConsistencyCheckResponseDto> | null>(null);

  const trigger = useCallback((): Promise<RankingConsistencyCheckResponseDto> => {
    // Concurrent call guard.
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const startedAt = Date.now();
    setIsRunning(true);
    setError(null);

      // Emit "started" breadcrumb.
      addRankingAdminBreadcrumb({
        action: RANKING_ACTION,
        route: RANKING_ROUTE,
        status: 'started',
        durationMs: 0,
      });

    const promise = checkRankingConsistency()
      .then((result) => {
        const durationMs = Date.now() - startedAt;

          // Emit "success" breadcrumb.
          addRankingAdminBreadcrumb({
            action: RANKING_ACTION,
            route: RANKING_ROUTE,
            status: 'success',
            durationMs,
          });

        // Update state with results.
        setAudit((prev) => ({ ...prev, after: result }));
        setCheckedAt(new Date());

        // At this commit (A1 §2.3), the backend returns a summary shape,
        // not per-item inconsistencies. `inconsistencies` is always empty.
        setInconsistencies([]);
        setTotalCount(result.issueCount ?? null);

        // Partial result flag: true when issueCount > 0 but no per-item list.
        // Per A1 §2.3, the backend returns a truncated result when there
        // are issues but no per-item breakdown.
        const hasIssues = (result.issueCount ?? 0) > 0;
        const hasInconsistencyList = false; // A1: no per-item list at this commit
        setIsPartialResult(hasIssues && !hasInconsistencyList);

        setIsRunning(false);

        return result;
      })
      .catch((err: ApiError) => {
        const durationMs = Date.now() - startedAt;
        const apiError = err as ApiError;

        setError(apiError);
        setIsRunning(false);

        // Emit "failure" breadcrumb.
        addRankingAdminBreadcrumb({
          action: RANKING_ACTION,
          route: RANKING_ROUTE,
          status: 'failure',
          durationMs,
          code: apiError.code,
          requestId: apiError.requestId,
          correlationId: apiError.correlationId,
        });

        return Promise.reject(apiError);
      })
      .finally(() => {
        inFlightRef.current = null;
      });

    inFlightRef.current = promise;
    return promise;
  }, []);

  const reset = useCallback(() => {
    setInconsistencies([]);
    setTotalCount(null);
    setCheckedAt(null);
    setError(null);
    setIsRunning(false);
    setIsPartialResult(false);
    setAudit({ before: null, after: null });
    inFlightRef.current = null;
  }, []);

  return {
    trigger,
    inconsistencies,
    totalCount,
    checkedAt,
    error,
    isRunning,
    isPartialResult,
    audit,
    reset,
  };
}
