/**
 * Internal shared helpers for the tournament admin mutation hooks
 * (`useCreateTournament`, `useUpdateTournament`, `useDeleteTournament`).
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source tickets: TKT-7.7.C2 / C3 / C4.
 *
 * ## What this module owns
 *
 * - The SWR cache-key matchers (`adminTournamentsKeyMatcher`,
 *   `publicTournamentsKeyMatcher`, `publicTournamentDetailKeyMatcher`)
 *   used by every mutation hook to invalidate the right cache
 *   namespaces after a destructive action.
 * - The `coerceToApiError` helper that turns an arbitrary thrown
 *   value into a typed `ApiError` so the dialog's typed-code
 *   branching is total.
 * - The `nowMs` breadcrumb-duration helper.
 *
 * The module is internal (`./internal/`) and is only imported from
 * the sibling hooks; nothing else in the codebase should depend on
 * these helpers.
 */

import { ApiError } from '@/lib/api';

// ─── SWR cache-key matchers ────────────────────────────────────────────────

/**
 * Match every admin-tournament SWR key (`['admin', 'tournaments', ...]`).
 *
 * Re-exported from `useTournamentAdminList.ts` as
 * `tournamentAdminListKeyMatcher` (TKT-7.7.C1). This local alias
 * makes the matcher discoverable from the mutation hooks without
 * creating a circular import.
 */
export function adminTournamentsKeyMatcher(key: unknown): boolean {
  return (
    Array.isArray(key) &&
    key[0] === 'admin' &&
    key[1] === 'tournaments'
  );
}

/**
 * Match every public tournament-list key (`['tournaments', 'list', ...]`).
 * Mirrors `TOURNAMENT_CACHE_KEYS.list` (TKT-5.2.A1).
 */
export function publicTournamentsKeyMatcher(key: unknown): boolean {
  return (
    Array.isArray(key) &&
    key[0] === 'tournaments' &&
    key[1] === 'list'
  );
}

/**
 * Match the public tournament-detail key for a given id
 * (`['tournaments', 'detail', <id>]`).
 */
export function publicTournamentDetailKeyMatcher(
  key: unknown,
  tournamentId: string,
): boolean {
  return (
    Array.isArray(key) &&
    key[0] === 'tournaments' &&
    key[1] === 'detail' &&
    key[2] === tournamentId
  );
}

// ─── Time helper ───────────────────────────────────────────────────────────

/**
 * Per-call start time captured for the breadcrumb duration metric.
 * Uses `performance.now()` when available (browser); falls back to
 * `Date.now()` so SSR / jsdom tests don't crash on the missing
 * `performance` global.
 */
export function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

// ─── Note: error coercion ──────────────────────────────────────────────────
//
// `coerceToApiError` was hoisted to `@/lib/api/error-coercion.ts` in
// Phase 3 (P1-23). Tournament-admin mutation hooks now import the
// canonical helper directly. This module used to export its own
// `coerceToApiError` — it has been removed.