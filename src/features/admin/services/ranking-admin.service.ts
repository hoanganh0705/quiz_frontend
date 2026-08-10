/**
 * `features/admin/services/ranking-admin.service.ts` — Ranking admin service.
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.E5.
 *
 * Thin service layer that wraps the ranking admin SDK functions for
 * the destructive admin operations. The service is the only layer
 * under `features/admin/**` that touches the ranking admin endpoints.
 *
 * ## Functions
 *
 *   - `recalculateRanking(input)`        — wraps `POST /admin/ranking/recalculate`.
 *   - `resetRankingPeriod(input)`        — wraps `POST /admin/ranking/reset`.
 *   - `checkRankingConsistency()`        — wraps `GET /admin/ranking/consistency-check`.
 *
 * ## Retry semantics
 *
 * The service NEVER retries on:
 *
 *   - `OPERATION_RUNNING`     — another recalculation is in flight.
 *   - `OPERATION_COOLDOWN`    — the operation is in cooldown.
 *   - `IRREVERSIBLE_CONFIRM_REQUIRED` — the typed-confirm payload was
 *     missing or malformed.
 *
 * These are forwarded to the caller for surface-level handling. The
 * `useSingleWithRetry` helper is NOT used for ranking admin operations
 * because the operations are non-idempotent by design.
 *
 * ## SDK evolution
 *
 * The ranking admin endpoints are not yet in the generated SDK; the
 * service uses `orvalCustomInstance` directly. When the SDK lands,
 * the functions replace the direct calls with generated SDK calls
 * (no public API change).
 */

import { orvalCustomInstance } from '@/lib/api/core/custom-instance';

// ─── DTOs ───────────────────────────────────────────────────────────────

/** Body for `recalculateRanking`. */
export interface RankingRecalculateRequestDto {
  /** Optional period id; when omitted, recalculates the current period. */
  periodId?: string;
  /** Whether to include archived periods in the recalculation. */
  includeArchived?: boolean;
}

/** Response for `recalculateRanking`. */
export interface RankingRecalculateResponseDto {
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt: string;
  estimatedDurationMs?: number;
}

/** Body for `resetRankingPeriod`. */
export interface RankingPeriodResetRequestDto {
  periodId: string;
  /** Whether to send the typed-confirm phrase (irreversible operation). */
  confirmString: string;
}

/** Response for `resetRankingPeriod`. */
export interface RankingPeriodResetResponseDto {
  periodId: string;
  resetAt: string;
  affectedUsers: number;
}

/** Response for `checkRankingConsistency`. */
export interface RankingConsistencyCheckResponseDto {
  /** Consistency check status. */
  status: 'ok' | 'warning' | 'error';
  /** Severity bucket. */
  severity: 'low' | 'medium' | 'high';
  /** Number of issues detected. */
  issueCount: number;
  /** Description of the worst issue. */
  primaryIssue?: string;
  /** The user's role at the time of the report (audit field). */
  checkedAt: string;
}

// ─── Service functions ─────────────────────────────────────────────────

/**
 * Recalculate the ranking for one or all periods.
 *
 * @throws `ApiError<ErrorCode>` with `code: OPERATION_RUNNING` when
 *         another recalculation is already in flight.
 * @throws `ApiError<ErrorCode>` with `code: OPERATION_COOLDOWN` when
 *         the operation is in cooldown.
 * @throws `ApiError<ErrorCode>` with `code: IRREVERSIBLE_CONFIRM_REQUIRED`
 *         when the typed-confirm payload is missing.
 */
export async function recalculateRanking(
  input: RankingRecalculateRequestDto = {},
): Promise<RankingRecalculateResponseDto> {
  const wire = await orvalCustomInstance<{ data: RankingRecalculateResponseDto }>({
    url: '/api/v1/admin/ranking/recalculate',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: input,
  });
  return (wire as { data: RankingRecalculateResponseDto }).data;
}

/**
 * Reset a ranking period. This is an irreversible operation.
 *
 * @throws `ApiError<ErrorCode>` with `code: OPERATION_RUNNING` when
 *         another reset is already in flight.
 * @throws `ApiError<ErrorCode>` with `code: OPERATION_COOLDOWN` when
 *         the operation is in cooldown.
 * @throws `ApiError<ErrorCode>` with `code: IRREVERSIBLE_CONFIRM_REQUIRED`
 *         when the typed-confirm payload is missing or wrong.
 */
export async function resetRankingPeriod(
  input: RankingPeriodResetRequestDto,
): Promise<RankingPeriodResetResponseDto> {
  const wire = await orvalCustomInstance<{ data: RankingPeriodResetResponseDto }>({
    url: '/api/v1/admin/ranking/reset',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data: input,
  });
  return (wire as { data: RankingPeriodResetResponseDto }).data;
}

/**
 * Run a read-only ranking consistency check.
 *
 * The service does NOT retry on 5xx. The check is read-mostly; the
 * caller surfaces the error directly.
 */
export async function checkRankingConsistency(): Promise<RankingConsistencyCheckResponseDto> {
  const wire = await orvalCustomInstance<{ data: RankingConsistencyCheckResponseDto }>({
    url: '/api/v1/admin/ranking/consistency-check',
    method: 'GET',
  });
  return (wire as { data: RankingConsistencyCheckResponseDto }).data;
}
