'use client';

/**
 * `features/admin/ranking-admin/hooks/useResetRankingPeriod.ts`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.C2.
 *
 * ## What this hook owns
 *
 * Wraps `resetRankingPeriod` (TKT-7.1.E7 / `ranking-admin.service.ts`) with:
 *   - typed-confirm integration (the reset requires `confirmString`);
 *   - cooldown awareness — `OPERATION_COOLDOWN` surfaces `cooldownRemaining`
 *     and disables the trigger;
 *   - `OPERATION_RUNNING` awareness — surfaces a notice and disables the
 *     trigger without retrying;
 *   - period identifier validation — invalid period values are rejected locally
 *     before the service call;
 *   - cross-user impact warning signal (`showCrossUserWarning`);
 *   - SWR cache invalidation on success;
 *   - Sentry audit breadcrumbs.
 *
 * The hook never retries blindly. All error branches surface the typed
 * `ApiError.code` without automatic retry.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';
import { addRankingAdminBreadcrumb, addAdminAuditBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
  resetRankingPeriod,
  type RankingPeriodResetResponseDto,
} from '../../services/ranking-admin.service';
import type { RankingJobStatus } from '../ranking-admin-types';
import { parseCooldownFrom } from '../ranking-admin-types';

import {
  invalidateRankingCaches,
} from '../ranking-admin-cache';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseResetRankingPeriodAudit {
  /** Snapshot captured at the start of the mutation (null for reset). */
  before: null;
  /** Server response on success. */
  after: RankingPeriodResetResponseDto | null;
}

export interface UseResetRankingPeriodResult {
  /**
   * Trigger a ranking period reset.
   *
   * Resolves with the server response on success.
   * Rejects with `ApiError` on failure.
   * Concurrent calls while a request is in flight return the same promise.
   */
  readonly trigger: (options?: {
    /** Period identifier (e.g. 'current', '2025-W01'). */
    periodIdentifier?: string;
    /**
     * The typed-confirm string (from `useTypedConfirm`). Must match
     * the backend's expected string exactly.
     */
    confirmString?: string;
    /**
     * Optional before snapshot for the audit. Always `null` for reset
     * (no pre-existing state to capture).
     */
    before?: null;
  }) => Promise<RankingPeriodResetResponseDto>;
  /**
   * The current async-job status.
   * `null` before any trigger; `'pending'` while the request is being sent;
   * `'running'` while polling; `'completed'` on success; `'failed'` on error.
   */
  readonly jobStatus: RankingJobStatus | null;
  /**
   * Affected user count returned by the backend.
   */
  readonly affectedUserCount: number | null;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /** True while a request is in flight. */
  readonly isRunning: boolean;
  /**
   * Seconds remaining until the cooldown expires. `null` when no cooldown
   * is active.
   */
  readonly cooldownRemaining: number | null;
  /**
   * True when a valid period identifier is set. Consumed by the component
   * to render the non-dismissable cross-user impact warning before the
   * typed-confirm dialog.
   */
  readonly showCrossUserWarning: boolean;
  /**
   * Validate a period identifier against documented values.
   * Returns `{ valid: true }` for known periods, or `{ valid: false, error }`
   * for invalid ones.
   */
  readonly validatePeriod: (period: string) => { valid: boolean; error?: string };
  /** Audit snapshot for `AuditActionShell`. */
  readonly audit: UseResetRankingPeriodAudit;
  /** Clear error, job status, and audit state. */
  readonly reset: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────

const RANKING_ACTION = 'ranking.reset';
const RANKING_ROUTE = 'rankings.reset';

/**
 * Documented valid period identifiers. Invalid values are rejected
 * locally before the service call, surfacing `INVALID_PERIOD` without
 * making an HTTP request.
 *
 * Placeholder values until the backend confirms the canonical identifiers.
 */
const VALID_PERIODS: readonly string[] = ['current', 'last', 'all'];

// ─── Synthetic error factory ────────────────────────────────────────────────

/**
 * Build a synthetic `ApiError` for hook-boundary rejections
 * (invalid period) so callers handle them uniformly via `error.code`.
 *
 * Phase 3 (P1-22): rewritten on top of `ApiError.fromInput` so the
 * synthetic envelope uses the canonical structural factory instead
 * of the `as unknown as AxiosError` cast. The wire shape is
 * identical for the consumer — `code`, `status`, and `detail` all
 * return the same values.
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
 * Trigger a ranking period reset with cooldown awareness, period
 * validation, and typed-confirm integration.
 *
 * @param options — optional configuration.
 * @param options.periodIdentifier — period to reset. Defaults to 'current'.
 */
export function useResetRankingPeriod(
  options?: { periodIdentifier?: string },
): UseResetRankingPeriodResult {
  const [jobStatus, setJobStatus] = useState<RankingJobStatus | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  const [audit, setAudit] = useState<UseResetRankingPeriodAudit>({
    before: null,
    after: null,
  });
  // Local mirror of `isRunning`. Declared before `trigger` so the
  // closure can reference `setIsRunningLocal` immediately.
  const [isRunningLocal, setIsRunningLocal] = useState(false);

  // The in-flight promise — concurrent calls return the same promise.
  const inFlightRef = useRef<Promise<RankingPeriodResetResponseDto> | null>(null);

  // Cooldown interval handle — cleared on reset / new trigger.
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  /**
   * Validate a period identifier against documented values.
   */
  const validatePeriod = useCallback(
    (period: string): { valid: boolean; error?: string } => {
      if (VALID_PERIODS.includes(period)) {
        return { valid: true };
      }
      return {
        valid: false,
        error: `Invalid period identifier "${period}". Valid values are: ${VALID_PERIODS.join(', ')}.`,
      };
    },
    [],
  );

  const trigger = useCallback(
    async (
      opts?: {
        periodIdentifier?: string;
        confirmString?: string;
        before?: null;
      },
    ): Promise<RankingPeriodResetResponseDto> => {
      // ── Concurrent call guard ──────────────────────────────────────
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // ── Period validation ────────────────────────────────────────
      const period = opts?.periodIdentifier ?? options?.periodIdentifier;
      if (period !== undefined && !VALID_PERIODS.includes(period)) {
        const err = makeSyntheticError(
          'INVALID_PERIOD',
          `Invalid period identifier "${period}". Valid values are: ${VALID_PERIODS.join(', ')}.`,
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
      let resolvePromise: (value: RankingPeriodResetResponseDto) => void;
      let rejectPromise: (reason: unknown) => void;
      const promise = new Promise<RankingPeriodResetResponseDto>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });
      inFlightRef.current = promise;

      resetRankingPeriod({
        periodId: period ?? 'current',
        confirmString: opts?.confirmString ?? '',
      })
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
            setJobStatus('running');
            setError(apiError);
            setIsRunningLocal(false);
          } else if (apiError.code === 'OPERATION_COOLDOWN') {
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
    [options?.periodIdentifier, invalidate, startCooldownCountdown],
  );

  // Derived signal: show cross-user warning when a valid period is selected.
  const currentPeriod = options?.periodIdentifier;
  const showCrossUserWarning =
    currentPeriod !== undefined && VALID_PERIODS.includes(currentPeriod);

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
    affectedUserCount: null, // Will be populated from the response
    error,
    isRunning: isRunningLocal,
    cooldownRemaining,
    showCrossUserWarning,
    validatePeriod,
    audit,
    reset,
  };
}
