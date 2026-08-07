'use client';

/**
 * `features/admin/ranking-admin/hooks/useRecalculateRanking.ts`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.C1.
 *
 * ## What this hook owns
 *
 * Wraps `recalculateRanking` (TKT-7.1.E7 / `ranking-admin.service.ts`) with:
 *   - typed-confirm integration (via `useAuditAction` / `AuditActionShell`);
 *   - cooldown awareness — `OPERATION_COOLDOWN` surfaces `cooldownRemaining`
 *     and disables the trigger;
 *   - `OPERATION_RUNNING` awareness — surfaces a notice and disables the
 *     trigger without retrying;
 *   - scope-filter validation — invalid scope values are rejected locally
 *     before the service call;
 *   - SWR cache invalidation on success;
 *   - Sentry audit breadcrumbs.
 *
 * The hook never retries blindly. All error branches surface the typed
 * `ApiError.code` without automatic retry.
 *
 * ## Job-status polling
 *
 * At this commit (A1 §2.3) the backend does expose `jobId` in the
 * `RankingRecalculateResponseDto`. Until a dedicated `useAsyncJobStatus`
 * is wired, the hook derives `jobStatus` from the in-flight promise state:
 * `idle` → `pending` → `running` → `completed | failed`. When the
 * `useAsyncJobStatus` hook (TKT-7.8.C1) is available it can be integrated
 * for live polling of the returned `jobId`.
 *
 * ## Cooldown format
 *
 * The exact `OPERATION_COOLDOWN` extension shape is not documented
 * (known gap from A1 §2.5). `parseCooldownFrom` handles multiple formats
 * and normalises to seconds.
 */

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseRecalculateRankingAudit {
  /** Snapshot captured at the start of the mutation (null for recalculate). */
  before: null;
  /** Server response on success. */
  after: RankingRecalculateResponseDto | null;
}

export interface UseRecalculateRankingResult {
  /**
   * Trigger a ranking recalculation.
   *
   * Resolves with the server response on success.
   * Rejects with `ApiError` on failure.
   * Concurrent calls while a request is in flight return the same promise.
   */
  readonly trigger: (options?: {
    /** Optional scope filter value. Pass `undefined` to use the default scope. */
    scopeFilter?: string;
    /**
     * Optional before snapshot for the audit. Always `null` for recalculate
     * (no pre-existing state to capture).
     */
    before?: null;
  }) => Promise<RankingRecalculateResponseDto>;
  /**
   * The current async-job status.
   * `null` before any trigger; `'pending'` while the request is being sent;
   * `'running'` while polling; `'completed'` on success; `'failed'` on error.
   */
  readonly jobStatus: RankingJobStatus | null;
  /**
   * Affected user count. Always `null` for recalculate — the backend does not
   * return this field (confirmed in A1 §2.3).
   */
  readonly affectedUserCount: null;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /** True while a request is in flight. */
  readonly isRunning: boolean;
  /**
   * Seconds remaining until the cooldown expires. `null` when no cooldown
   * is active.
   */
  readonly cooldownRemaining: number | null;
  /** Audit snapshot for `AuditActionShell`. */
  readonly audit: UseRecalculateRankingAudit;
  /** Clear error, job status, and audit state. */
  readonly reset: () => void;
}

// ─── Imports ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api/core/ApiError';
import { addRankingAdminBreadcrumb, addAdminAuditBreadcrumb } from '@/lib/admin/phase7_admin_sentry';

import {
  recalculateRanking,
  type RankingRecalculateResponseDto,
} from '../../services/ranking-admin.service';
import type {
  RankingJobStatus,
} from '../ranking-admin-types';
import { parseCooldownFrom } from '../ranking-admin-types';

import {
  invalidateRankingCaches,
} from '../ranking-admin-cache';

// ─── Constants ───────────────────────────────────────────────────────────

const RANKING_ACTION = 'ranking.recalculate';
const RANKING_ROUTE = 'rankings.recalculate';

/**
 * Documented valid scope filter values. Invalid values are rejected
 * locally before the service call, surfacing `INVALID_PERIOD` without
 * making an HTTP request.
 */
const VALID_SCOPES: readonly string[] = ['current_period', 'last_period', 'all'];

// ─── Synthetic error factory ────────────────────────────────────────────────

/**
 * Build a synthetic `ApiError` for hook-boundary rejections
 * (invalid scope) so callers handle them uniformly via `error.code`.
 *
 * The ApiError constructor reads from `response.data.extensions.code` (RFC 7807).
 *
 * Phase 3 (P1-22): rewritten on top of `ApiError.fromInput`.
 */
function makeSyntheticError(code: string, message: string): ApiError {
  return ApiError.fromInput({
    status: 400,
    code,
    message,
    title: code,
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Trigger a ranking recalculation with cooldown awareness, scope-filter
 * validation, and typed-confirm integration.
 *
 * @param options.scopeFilter — optional scope value (`'current_period'`,
 *   `'last_period'`, `'all'`). Invalid values surface `INVALID_PERIOD`
 *   without calling the service.
 */
export function useRecalculateRanking(
  options?: { scopeFilter?: string },
): UseRecalculateRankingResult {
  const [jobStatus, setJobStatus] = useState<RankingJobStatus | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  const [audit, setAudit] = useState<UseRecalculateRankingAudit>({
    before: null,
    after: null,
  });
  // Local mirror of `isRunning`. Declared before `trigger` so the
  // closure can reference `setIsRunningLocal` immediately.
  const [isRunningLocal, setIsRunningLocal] = useState(false);

  // The in-flight promise — concurrent calls return the same promise.
  const inFlightRef = useRef<Promise<RankingRecalculateResponseDto> | null>(
    null,
  );

  // Cooldown interval handle — cleared on reset / new trigger.
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const invalidate = useCallback(() => {
    void invalidateRankingCaches();
  }, []);

  const clearCooldown = useCallback(() => {
    if (cooldownIntervalRef.current !== null) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
    setCooldownRemaining(null);
  }, []);

  const startCooldownCountdown = useCallback(
    (seconds: number) => {
      clearCooldown();
      let remaining = seconds;

      setCooldownRemaining(remaining);
      cooldownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearCooldown();
        } else {
          setCooldownRemaining(remaining);
        }
      }, 1000);
    },
    [clearCooldown],
  );

  const trigger = useCallback(
    async (
      opts?: { scopeFilter?: string; before?: null },
    ): Promise<RankingRecalculateResponseDto> => {
      // ── Concurrent call guard ──────────────────────────────────────
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // ── Scope-filter validation ───────────────────────────────────
      const scope = opts?.scopeFilter ?? options?.scopeFilter;
      if (scope !== undefined && !VALID_SCOPES.includes(scope)) {
        const err = makeSyntheticError(
          'INVALID_PERIOD',
          `Invalid scope filter "${scope}". Valid values are: ${VALID_SCOPES.join(', ')}.`,
        );
        setError(err);
        setJobStatus('failed');
        return Promise.reject(err);
      }

      const startedAt = Date.now();
      setJobStatus('pending');
      setError(null);
      setIsRunningLocal(true);

      // Emit "started" breadcrumb.
      addRankingAdminBreadcrumb({
        action: RANKING_ACTION,
        route: RANKING_ROUTE,
        status: 'started',
        durationMs: 0,
      });

      // Set inFlightRef BEFORE calling the service so concurrent calls
      // synchronously see it as non-null.
      let resolvePromise: (value: RankingRecalculateResponseDto) => void;
      let rejectPromise: (reason: unknown) => void;
      const promise = new Promise<RankingRecalculateResponseDto>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      inFlightRef.current = promise;

      recalculateRanking({ periodId: scope })
        .then((result) => {
          const durationMs = Date.now() - startedAt;

          setJobStatus('completed');
          setAudit((prev) => ({ ...prev, after: result }));
          setIsRunningLocal(false);

          // Emit "success" breadcrumb using audit variant for before/after snapshots.
          addAdminAuditBreadcrumb({
            action: RANKING_ACTION,
            route: RANKING_ROUTE,
            status: 'success',
            durationMs,
            before: null,
            after: result,
          });

          // Invalidate SWR caches so leaderboard reflects new state.
          invalidate();

          resolvePromise(result);
        })
        .catch((err: unknown) => {
          const durationMs = Date.now() - startedAt;
          const apiError = err as ApiError;

          // ── Handle specific error codes ────────────────────────────
          if (apiError.code === 'OPERATION_RUNNING') {
            // Another admin has a recalculation in flight. Stay in
            // 'running' state so the UI remains stable.
            setJobStatus('running');
            setError(apiError);
            setIsRunningLocal(false);
          } else if (apiError.code === 'OPERATION_COOLDOWN') {
            // Parse cooldown duration and start countdown.
            const cooldownSeconds = parseCooldownFrom(
              (apiError['data'] as { extensions?: { retryAfter?: string | number } } | undefined)
                ?.extensions?.retryAfter,
            );
            if (cooldownSeconds !== null) {
              startCooldownCountdown(cooldownSeconds);
            }
            setJobStatus('failed');
            setError(apiError);
            setIsRunningLocal(false);
          } else {
            setJobStatus('failed');
            setError(apiError);
            setIsRunningLocal(false);
          }

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

          rejectPromise(apiError);
        })
        .finally(() => {
          inFlightRef.current = null;
        });

      return promise;
    },
    [options?.scopeFilter, invalidate, startCooldownCountdown],
  );

  const reset = useCallback(() => {
    setJobStatus(null);
    setError(null);
    clearCooldown();
    setAudit({ before: null, after: null });
    inFlightRef.current = null;
    setIsRunningLocal(false);
  }, [clearCooldown]);

  // Clear cooldown interval on unmount.
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current !== null) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, []);

  return {
    trigger,
    jobStatus,
    // `affectedUserCount` is always null for recalculate (backend does not return it).
    affectedUserCount: null,
    error,
    isRunning: isRunningLocal,
    cooldownRemaining,
    audit,
    reset,
  };
}
