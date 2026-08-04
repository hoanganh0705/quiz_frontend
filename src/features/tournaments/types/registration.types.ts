/**
 * `registration.types.ts` — Story 5.3 registration types and cache key factories.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.3 — Tournament registration and participant-state mutations.
 * Source ticket: TKT-5.3.A1.
 *
 * ## Purpose
 *
 * Single source of truth for the tournament registration domain types,
 * mutation result shapes, error codes, and SWR cache-key factories
 * consumed by every Story 5.3 hook and component.
 *
 * ## Type philosophy
 *
 * Types are feature-level projections of the verified service wrapper
 * outputs from Story 5.1 (tournaments.service.ts). Types extend the
 * generated SDK DTOs to add domain-specific shapes for participation state,
 * mutation status, and error codes.
 *
 * ## Server authority
 *
 * Registration and withdrawal controls are shown or hidden based solely on
 * server-provided status, window, and capacity flags. No client-side
 * gating is performed.
 *
 * ## SWR cache key factories
 *
 * Each factory returns a frozen tuple so equal inputs produce equal keys.
 * The `makeRegistrationKeys` function returns all three invalidation keys
 * (detail, participants, leaderboard) so SWR can invalidate them in one
 * pass after a successful mutation.
 */

import {
  TOURNAMENT_CACHE_KEYS,
} from "./tournament.types";

// ─── Registration status ────────────────────────────────────────────────────

/**
 * Registration status for a tournament.
 *
 * Covers all states from the server's perspective:
 * - `registered`: user is registered and not withdrawn
 * - `eligible`: user is not registered but is eligible to register
 * - `not_eligible`: user is not eligible to register
 * - `closed`: registration window is closed
 * - `full`: tournament has reached maximum capacity
 * - `unknown`: insufficient data to determine status (e.g., no auth)
 */
export type RegistrationStatus =
  | "registered"
  | "eligible"
  | "not_eligible"
  | "closed"
  | "full"
  | "unknown";

// ─── Registration error codes ────────────────────────────────────────────────

/**
 * Error codes specific to tournament registration and withdrawal mutations.
 *
 * These codes are returned by the backend when registration or withdrawal
 * fails. Components should branch on these codes using `getUserCopy`
 * from Epic 5.1 D3 — never on HTTP status codes.
 *
 * Note: `UNAUTHORIZED` and `FORBIDDEN` are shared codes that may overlap
 * with the general `USER_COPY` table from Epic 5.1 D3.
 */
export type RegistrationErrorCode =
  | "ALREADY_REGISTERED"
  | "NOT_REGISTERED"
  | "TOURNAMENT_REGISTRATION_CLOSED"
  | "TOURNAMENT_FULL"
  | "TOURNAMENT_INELIGIBLE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "THROTTLED";

// ─── Participation state ──────────────────────────────────────────────────────

/**
 * The current user's participation state for a tournament.
 *
 * Derived from the tournament detail and participant list data in SWR cache.
 * No extra fetch is needed — participation is deduced from existing reads.
 */
export interface ParticipationState {
  tournamentId: string;
  userId: string;
  isRegistered: boolean;
  registrationStatus: RegistrationStatus;
  registeredAt: string | null;
  /** True when the user can withdraw (registered and server allows withdrawal). */
  canWithdraw: boolean;
}

// ─── Mutation result shapes ──────────────────────────────────────────────────

/**
 * Result of a successful tournament registration.
 */
export interface RegistrationResult {
  tournamentId: string;
  isRegistered: boolean;
  registeredAt: string;
}

/**
 * Result of a successful tournament withdrawal.
 */
export interface WithdrawalResult {
  tournamentId: string;
  withdrawnAt: string;
}

// ─── Mutation state ──────────────────────────────────────────────────────────

/**
 * Local mutation state machine for registration and withdrawal CTAs.
 *
 * Follows the same pattern as `useOptimisticToggle` from Phase 3 and
 * `useOptimisticMutation` from Phase 4.
 *
 * State transitions:
 *   idle → pending (on mutation call)
 *   pending → success (on success)
 *   pending → error (on failure)
 *   success → idle (after 2 s or on next interaction)
 *   error → idle (when user resets or retries)
 */
export type RegistrationMutationState =
  | "idle"
  | "pending"
  | "success"
  | "error";

// ─── SWR cache keys ─────────────────────────────────────────────────────────

/**
 * SWR cache keys for the Story 5.3 registration surfaces.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal keys.
 * The factories are pure (no clock, no random) so they are safe to call
 * inside `useMemo` and `useEffect` dependency arrays.
 *
 * ## Invalidation strategy
 *
 * After a successful registration or withdrawal, all three keys must be
 * invalidated:
 *   1. Tournament detail (participant count, capacity, eligibility flags)
 *   2. Participants list (user appears/disappears from the list)
 *   3. Leaderboard (user appears/disappears from the leaderboard)
 *
 * Use `makeRegistrationKeys` to get all three keys at once.
 */
export const TOURNAMENT_REGISTRATION_CACHE_KEYS = {
  /**
   * SWR key for the current user's participation state in a tournament.
   *
   * This key is derived from the tournament detail and participant list,
   * not a separate endpoint. It is used to track the user's registration
   * status in SWR cache.
   */
  participation(tournamentId: string, userId: string) {
    return ["tournaments", "participation", tournamentId, userId] as const;
  },

  /**
   * Returns all three invalidation keys for a tournament mutation.
   *
   * Use this to invalidate all tournament-related keys after a successful
   * registration or withdrawal:
   *   - Tournament detail (participant count, capacity, eligibility)
   *   - Participants list
   *   - Leaderboard
   *
   * @example
   *   const keys = makeRegistrationKeys(tournamentId);
   *   await Promise.all([
   *     mutate(keys.detail),
   *     mutate(keys.participants),
   *     mutate(keys.leaderboard),
   *   ]);
   */
  all(tournamentId: string) {
    return {
      detail: TOURNAMENT_CACHE_KEYS.detail(tournamentId),
      participants: TOURNAMENT_CACHE_KEYS.participants(tournamentId, {}),
      leaderboard: TOURNAMENT_CACHE_KEYS.leaderboard(tournamentId, {}),
    } as const;
  },
} as const;

/**
 * Type helper for `TOURNAMENT_REGISTRATION_CACHE_KEYS.all()` return value.
 */
export type RegistrationInvalidationKeys = ReturnType<
  (typeof TOURNAMENT_REGISTRATION_CACHE_KEYS)["all"]
>;
