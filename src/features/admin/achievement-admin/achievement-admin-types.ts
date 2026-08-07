/**
 * `features/admin/achievement-admin/achievement-admin-types.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.B1.
 *
 * ## What this module owns
 *
 * The local type surface for the achievement admin surface — DTO shapes,
 * the re-evaluation lifecycle discriminated union, and the re-export
 * surface for Phase 5 achievement types that this epic reuses.
 *
 * ## Type philosophy
 *
 * Types are feature-level projections of the verified service wrapper
 * outputs from `achievement-admin.service.ts` (TKT-7.1.E6) and the
 * Phase 5 achievement types from `features/achievements/types/achievement.types.ts`.
 * Components consume types exclusively through this module so the DTO
 * boundary is a single-edit point.
 *
 * ## Re-evaluation lifecycle (TKT-7.8.B1 verdict)
 *
 * The backend `reevaluateUserBadges` SDK function returns `ReevaluateUserBadges200`
 * (mapped to `ReevaluateUserResponseDto`). The response does NOT include a `jobId`
 * field at this commit — confirmed by inspecting `achievement-admin.service.ts`
 * line 52–58 which passes the raw response through. The "running" state in the
 * UI is a local derivative of the in-flight `fetch` promise; there is no polling.
 *
 * The lifecycle states are:
 *
 *   - `'idle'`       — no re-evaluation in progress
 *   - `'running'`    — a re-evaluation is in flight
 *   - `'completed'`  — the last re-evaluation succeeded and the badge list refreshed
 *   - `'failed'`     — the last re-evaluation failed with a typed error
 *
 * The lifecycle resets to `'idle'` when `reset()` is called or when the
 * admin navigates away and back.
 *
 * ## Badge revoke response (TKT-7.8.B1 verdict)
 *
 * The `revokeUserBadge` SDK function (`DELETE /api/v1/achievements/users/:userId/badges/:badgeId`)
 * returns `unknown` (no body). The existing `achievement-admin.service.ts` constructs
 * `AchievementBadgeRevokeResponseDto` client-side from `{ userId, badgeId, revokedAt: new Date().toISOString() }`.
 * This module records that contract.
 */

// ─── Re-export Phase 5 achievement types ────────────────────────────────────

export type {
  UserBadgeProfile,
  AchievementHistoryEntry,
  AchievementHistoryFilters,
  DEFAULT_ACHIEVEMENT_HISTORY_FILTERS,
  ACHIEVEMENT_CACHE_KEYS,
  AchievementErrorCode,
} from '@/features/achievements/types';

export type { NormalizedBadge } from '@/lib/realtime/dto-adapters';

// Phase 5 badge types used directly in admin surfaces
export type { BadgeCatalogItemResponseDto as BadgeDto } from '@/lib/api/generated/schemas';

// UserBadgeDto is the Phase 5 earned-badge type (MyBadgeItemDto).
// Used by the revoke hook's audit snapshot (before/after).
export type { MyBadgeItemDto as UserBadgeDto } from '@/lib/api/generated/schemas';

// Admin user badge — a projected type for the admin badge list.
// Wraps FeaturedBadgeResponseDto (from getUserBadges) with the name
// field that RevokeBadgeDialog needs.
export interface AdminUserBadgeDto {
  readonly badgeId: string;
  readonly badgeName: string;
  readonly rarity: string;
  readonly earnedAt?: string;
}

export type { AdminAchievementHistoryItemDto as UserAchievementHistoryDto } from '@/lib/api/generated/schemas';
export type { OffsetPaginationMetaDto } from '@/lib/api/generated/schemas';
export type { GetUserAchievementHistory200 } from '@/lib/api/generated/schemas';

// ─── Re-export service types ───────────────────────────────────────────────

export type {
  ReevaluateUserResponseDto as AchievementReevaluateResponseDto,
} from '@/lib/api/generated/schemas/reevaluateUserResponseDto';

export {
  // re-export the service-constructed type (not in generated schemas)
} from '@/features/admin/services/achievement-admin.service';

// ─── Badge revoke response DTO ────────────────────────────────────────────

/**
 * The badge revoke response DTO.
 *
 * The backend DELETE returns no body — the service constructs this
 * client-side from `{ userId, badgeId, revokedAt: new Date().toISOString() }`.
 * Confirmed by `achievement-admin.service.ts` lines 68–78.
 *
 * @see achievement-admin.service.ts:68
 */
export interface AchievementBadgeRevokeResponseDto {
  readonly userId: string;
  readonly badgeId: string;
  readonly revokedAt: string; // ISO 8601
}

// ─── Re-evaluation lifecycle ───────────────────────────────────────────────

/** Re-evaluation has not been triggered. */
export const REEVAL_LIFECYCLE_IDLE = 'idle' as const;

/** A re-evaluation is in flight. */
export const REEVAL_LIFECYCLE_RUNNING = 'running' as const;

/** The last re-evaluation succeeded and the badge list has been refreshed. */
export const REEVAL_LIFECYCLE_COMPLETED = 'completed' as const;

/** The last re-evaluation failed with a typed error. */
export const REEVAL_LIFECYCLE_FAILED = 'failed' as const;

/**
 * The re-evaluation lifecycle states.
 *
 * The `'running'` state is derived locally from the in-flight fetch promise
 * (there is no `jobId` polling at this commit — confirmed by A1 §2.4).
 * The `'completed'` state fires when the fetch resolves successfully.
 * The `'failed'` state fires when the fetch rejects with a typed error.
 * The `'idle'` state is the initial state and the state after `reset()`.
 */
export type ReevalLifecycle =
  | typeof REEVAL_LIFECYCLE_IDLE
  | typeof REEVAL_LIFECYCLE_RUNNING
  | typeof REEVAL_LIFECYCLE_COMPLETED
  | typeof REEVAL_LIFECYCLE_FAILED;

// ─── Lifecycle helpers ─────────────────────────────────────────────────────

/**
 * Whether the lifecycle is in a terminal state.
 *
 * `'completed'` and `'failed'` are terminal — no more transitions
 * are expected from the server without another admin action.
 * `'idle'` and `'running'` are non-terminal.
 *
 * @param lifecycle - the current lifecycle
 * @returns `true` for `'completed'` or `'failed'`
 */
export function isReevalTerminal(lifecycle: ReevalLifecycle): boolean {
  return (
    lifecycle === REEVAL_LIFECYCLE_COMPLETED ||
    lifecycle === REEVAL_LIFECYCLE_FAILED
  );
}

/**
 * Whether the lifecycle is `'running'`.
 *
 * Useful for disabling the Re-evaluate button while a request is in flight.
 *
 * @param lifecycle - the current lifecycle
 * @returns `true` when `'running'`
 */
export function isReevalRunning(lifecycle: ReevalLifecycle): boolean {
  return lifecycle === REEVAL_LIFECYCLE_RUNNING;
}

// ─── Exhaustive lifecycle switch helper ───────────────────────────────────

/**
 * Exhaustive lifecycle label for display.
 *
 * Returns a human-readable label for each lifecycle state.
 * Adding a new state to `ReevalLifecycle` without updating this
 * function produces a TypeScript error.
 *
 * @param lifecycle - the current lifecycle
 * @returns a display label string
 */
export function getReevalLifecycleLabel(lifecycle: ReevalLifecycle): string {
  switch (lifecycle) {
    case REEVAL_LIFECYCLE_IDLE:
      return 'Re-evaluate achievements';
    case REEVAL_LIFECYCLE_RUNNING:
      return 'Re-evaluation running…';
    case REEVAL_LIFECYCLE_COMPLETED:
      return 'Re-evaluate again';
    case REEVAL_LIFECYCLE_FAILED:
      return 'Retry re-evaluation';
    default: {
      // Exhaustive check — this line is unreachable if all states are covered.
      const _exhaustive: never = lifecycle;
      return _exhaustive;
    }
  }
}

// ─── Re-evaluation job info (placeholder for future jobId polling) ────────

/**
 * Re-evaluation job information.
 *
 * Placeholder type for future `jobId`-bearing responses.
 * At this commit the backend does NOT expose a `jobId` (confirmed by A1 §2.4).
 * When the backend adds job tracking, this type is extended with:
 *   - `jobId: string`
 *   - `status: ReevalLifecycle`
 *   - `startedAt: string`
 *   - `completedAt?: string`
 *
 * TKT-7.8.C6 (useAsyncJobStatus) ships as a noop stub until this is confirmed.
 *
 * @see TKT-7.8.C6
 * @see EPIC_7_8_A1.md §2.4
 */
export interface ReevalJobInfo {
  /** True when a `jobId` has been exposed by the backend. */
  readonly isJobIdExposed: false;
  /** The re-evaluation lifecycle at the time this info was captured. */
  readonly lifecycle: ReevalLifecycle;
}
