/**
 * `features/admin/ranking-admin/ranking-admin-types.ts`
 *
 * Source epic:   Epic 7.9 — Ranking Admin: Recalculate, Consistency Check, Period Reset.
 * Source ticket: TKT-7.9.B1.
 *
 * ## What this module owns
 *
 * The local type surface for the ranking admin feature. This module:
 *
 *   1. Re-exports the DTO types from `ranking-admin.service.ts`.
 *   2. Adds locally-derived types where the SDK / service does not expose them.
 *   3. Defines the `RankingJobStatus` discriminated union for the async job
 *      lifecycle.
 *   4. Defines the `RankingAdminErrorCode` subset for typed error branching.
 *   5. Documents the Phase 5 SWR cache key factory patterns.
 *
 * ## Shape pinned from A1 evidence
 *
 * - `RankingRecalculateResponseDto.jobId` → confirmed present (async with polling).
 * - `RankingRecalculateResponseDto.affectedUserCount` → **absent**; the service
 *   does not return `affectedUserCount` for recalculate. The `affectedUserCount`
 *   field on the return value of `useRecalculateRanking` is `null` for recalculate.
 * - `RankingPeriodResetResponseDto.affectedUsers` → confirmed present. Normalised
 *   to `affectedUserCount` in the local type surface.
 * - `RankingConsistencyCheckResponseDto` → confirmed summary shape:
 *   `{ status, severity, issueCount, primaryIssue?, checkedAt }`. No per-item
 *   `inconsistencies[]` array is returned at this commit.
 * - `RankingInconsistencyDto` → placeholder shape defined here for future use
 *   when the backend exposes the per-item inconsistency list.
 *
 * ## Error codes pinned from A1 evidence
 *
 * - `OPERATION_RUNNING` → absent from `ErrorCode`; B1 adds it.
 * - `OPERATION_COOLDOWN` → absent from `ErrorCode`; B1 adds it.
 * - `INVALID_PERIOD` → absent from `ErrorCode`; B1 adds it.
 * - `IRREVERSIBLE_CONFIRM_REQUIRED` → already present (Epic 7.1).
 *
 * ## Cooldown format (placeholder — TKT-7.9.A1 §2.5)
 *
 * The cooldown duration format in `OPERATION_COOLDOWN` is not documented in the
 * service file. Until the backend team confirms, the helper `parseCooldownFrom`
 * accepts `string | number | undefined` and returns `number | null` (seconds).
 */

// ─── Service DTOs (re-exported) ────────────────────────────────────────────────

export type {
  RankingRecalculateRequestDto,
  RankingRecalculateResponseDto,
  RankingPeriodResetRequestDto,
  RankingPeriodResetResponseDto,
  RankingConsistencyCheckResponseDto,
} from '../services/ranking-admin.service';

// ─── RankingJobStatus — discriminated union for async job lifecycle ─────────────

/**
 * Lifecycle states for a ranking admin async job (recalculate or period reset).
 *
 * Used by `useRecalculateRanking` and `useResetRankingPeriod` to surface
 * the job's current state in `RankingJobStatusPanel`.
 *
 * The `pending` state represents "no job has been triggered yet".
 * `running` represents "job is in flight or polling".
 * `completed` represents "job finished successfully".
 * `failed` represents "job finished with an error".
 */
export type RankingJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';

/**
 * The full job status document returned by `useAsyncJobStatus` (Epic 7.8).
 * Mirrors the interface consumed by `RankingJobStatusPanel`.
 */
export interface RankingJobState {
  jobId: string;
  status: RankingJobStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// ─── Normalised response types ──────────────────────────────────────────────────

/**
 * Normalised recalculate response for hook return types.
 *
 * `affectedUserCount` is always `null` for recalculate — the backend does not
 * return it (confirmed in A1 §2.3). Use `RankingPeriodResetResponseDto.affectedUsers`
 * for period reset instead.
 */
export interface NormalisedRecalculateResponse {
  jobId: string;
  status: RankingJobStatus;
  startedAt: string;
  completedAt?: string;
  /** Always null for recalculate (backend does not return this field). */
  affectedUserCount: null;
}

/**
 * Normalised period reset response for hook return types.
 *
 * `affectedUserCount` is the backend's `affectedUsers` field normalised to
 * `camelCase` for the local surface.
 */
export interface NormalisedResetResponse {
  periodId: string;
  resetAt: string;
  affectedUserCount: number;
}

// ─── Consistency check — summary shape (confirmed in A1 §2.3) ─────────────────

/**
 * Consistency check result severity levels.
 *
 * - `ok` — no issues found.
 * - `warning` — minor drift detected; review recommended.
 * - `error` — significant inconsistency; recalculation recommended.
 */
export type RankingConsistencyStatus = 'ok' | 'warning' | 'error';

/**
 * Severity levels for consistency check issues.
 */
export type RankingConsistencySeverity = 'low' | 'medium' | 'high';

/**
 * Normalised consistency check response.
 *
 * Confirmed shape from `ranking-admin.service.ts`:
 * `{ status, severity, issueCount, primaryIssue?, checkedAt }`.
 *
 * `inconsistencies` is always `[]` at this commit — the backend returns a summary,
 * not a per-item list. `RankingInconsistencyDto` is defined below for future use.
 */
export interface NormalisedConsistencyResponse {
  status: RankingConsistencyStatus;
  severity: RankingConsistencySeverity;
  issueCount: number;
  primaryIssue?: string;
  checkedAt: string;
  /** Always empty at this commit (backend returns summary, not per-item list). */
  inconsistencies: RankingInconsistencyDto[];
}

// ─── Inconsistency item (placeholder for future backend exposure) ───────────────

/**
 * Placeholder shape for a single ranking inconsistency.
 *
 * This type is defined for future use when the backend exposes the per-item
 * inconsistency list. At this commit, `RankingConsistencyCheckResponseDto`
 * returns a summary (`status`, `severity`, `issueCount`) rather than
 * individual items. `inconsistencies: []` is always returned.
 *
 * The exact fields below are derived from the source story:
 *   "RankingInconsistencyDto (the individual inconsistency item — shape from A1:
 *    userId, field, expected, actual, period, etc.)"
 *
 * When the backend exposes the per-item list, update this type and the
 * `RankingInconsistencyTable` component (TKT-7.9.D4).
 */
export interface RankingInconsistencyDto {
  /** The user whose ranking has the inconsistency. */
  userId: string;
  /** The ranking field that is inconsistent (e.g. 'totalXp', 'rank'). */
  field: string;
  /** The expected value after correct calculation. */
  expected: string | number;
  /** The actual value stored in the system. */
  actual: string | number;
  /** The ranking period in which the inconsistency was found. */
  period: string;
}

// ─── Error code subset ──────────────────────────────────────────────────────────

/**
 * Error codes that ranking admin operations surface.
 *
 * Consumed by `useRecalculateRanking`, `useResetRankingPeriod`, and
 * `useCheckRankingConsistency` for typed error branching.
 *
 * `OPERATION_RUNNING`, `OPERATION_COOLDOWN`, and `INVALID_PERIOD` are added
 * to `ErrorCode` by TKT-7.9.B1.
 */
export type RankingAdminErrorCode =
  | 'OPERATION_RUNNING'
  | 'OPERATION_COOLDOWN'
  | 'INVALID_PERIOD'
  | 'IRREVERSIBLE_CONFIRM_REQUIRED'
  | 'PERMISSION_DENIED';

// ─── Scope filter values ────────────────────────────────────────────────────────

/**
 * Placeholder scope filter values for the recalculate operation.
 *
 * These are defined as constants here so the form and the hook share the
 * same set of values. The actual valid period identifiers are backend-controlled.
 *
 * Until the backend team confirms the canonical values, the form allows free-form
 * input and the backend surfaces `INVALID_PERIOD` on rejection.
 *
 * Replace this tuple with the actual backend-confirmed values when available.
 */
export const RANKING_SCOPE_VALUES = ['current_period', 'last_period', 'all'] as const;

export type RankingScopeValue = (typeof RANKING_SCOPE_VALUES)[number];

// ─── Cooldown helper ────────────────────────────────────────────────────────────

/**
 * Parse the cooldown duration from an `OPERATION_COOLDOWN` error's extensions.
 *
 * The exact format is not documented in the service file (known gap from A1 §2.5).
 * This helper accepts multiple formats and normalises to seconds.
 *
 * Formats handled:
 *   - `retryAfter` (ISO timestamp or Unix epoch) → converted to seconds remaining.
 *   - `cooldownUntil` (ISO timestamp) → converted to seconds remaining.
 *   - `cooldownSeconds` (number) → returned as-is.
 *   - `number` → returned as-is (seconds).
 *   - `undefined` / `null` → returns `null`.
 *
 * @param value - The cooldown value from the error extensions.
 * @returns The cooldown in seconds, or `null` if not parseable.
 *
 * @example
 *   parseCooldownFrom('2026-08-07T12:10:00Z') // ~120 (if current time is 12:08)
 *   parseCooldownFrom(300)                       // 300
 *   parseCooldownFrom(undefined)                 // null
 */
export function parseCooldownFrom(
  value: string | number | undefined,
): number | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    // Assume seconds if the number is small (< 1 hour), otherwise treat as epoch ms
    if (value < 3600) {
      return value;
    }
    // Treat as epoch milliseconds
    const msRemaining = value - Date.now();
    return msRemaining > 0 ? Math.ceil(msRemaining / 1000) : 0;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) {
      // ISO timestamp or Unix epoch string
      const msRemaining = parsed - Date.now();
      return msRemaining > 0 ? Math.ceil(msRemaining / 1000) : 0;
    }
  }

  // Unparseable
  return null;
}
