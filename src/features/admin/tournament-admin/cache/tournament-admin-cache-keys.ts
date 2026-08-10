/**
 * `features/admin/tournament-admin/cache/tournament-admin-cache-keys.ts`
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.G1.
 *
 * ## Purpose
 *
 * Single source of truth for the SWR cache keys that every tournament admin
 * mutation hook (`useCreateTournament`, `useUpdateTournament`,
 * `useDeleteTournament`) invalidates on success. The keys cover:
 *
 *   - the admin list (`tournament-admin:list:<status>:<q>:<cursor>`)
 *   - the public tournament list keys (`tournaments:list:*`)
 *   - the per-tournament cache key (`tournaments:detail:<id>`)
 *
 * Every mutation hook imports the keys from here so the contract is
 * consistent across the three hooks. TKT-7.7.G2 builds on this file
 * to add cross-tab invalidation broadcasts.
 *
 * ## Cache key conventions
 *
 * The admin list uses a string key format for easier pattern matching
 * in invalidation helpers. The key encodes status, search, and cursor
 * in a deterministic way.
 *
 * ## Public tournament cache convergence
 *
 * SWR's `mutate(matcher)` form accepts a function predicate that
 * iterates every cache entry and revalidates matches. The matcher
 * in `invalidatePublicTournamentCaches` captures both the string-form
 * and array-form keys used by Phase 5 tournament hooks.
 */

import { mutate as globalMutate, type ScopedMutator } from 'swr';

import {
  TOURNAMENT_CACHE_KEYS,
  type TournamentListFilters,
} from '@/features/tournaments/types/tournament.types';

// ─── Admin list key ─────────────────────────────────────────────────────────

/**
 * Cache key prefix for tournament admin list reads.
 */
export const TOURNAMENT_ADMIN_LIST_PREFIX = 'tournament-admin:list' as const;

/**
 * Admin list key parameters.
 */
export interface TournamentAdminListKeyParams {
  status?: string;
  search?: string;
  cursor?: string;
}

/**
 * Build the canonical SWR cache key for the tournament admin list.
 *
 * The key encodes status, search, and cursor into a stable string format.
 *
 * @example
 * tournamentAdminListKey({ status: 'upcoming', search: 'spring', cursor: 'abc123' })
 * // → 'tournament-admin:list:status=upcoming|q=spring|cursor=abc123'
 *
 * @example
 * tournamentAdminListKey({})
 * // → 'tournament-admin:list'
 */
export function tournamentAdminListKey(params: TournamentListFilters = { search: '' }): string {
  const parts: string[] = [TOURNAMENT_ADMIN_LIST_PREFIX];

  if (params.status !== undefined && params.status) {
    parts.push(`status=${params.status}`);
  }
  if (params.search !== undefined && params.search.trim() !== '') {
    parts.push(`q=${params.search.trim().toLowerCase()}`);
  }
  if (params.cursor !== undefined) {
    parts.push(`cursor=${params.cursor}`);
  }

  return parts.join(':');
}

/**
 * Alias for the admin list key function with TournamentAdminListKeyParams.
 */
export const adminListKey = tournamentAdminListKey;

// ─── Per-tournament key ─────────────────────────────────────────────────────

/**
 * Build the canonical SWR cache key for a single tournament's detail read.
 *
 * This re-exports the Phase 5 convention for consistency. Both the
 * admin feature and Phase 5 public hooks use the same key.
 *
 * @param tournamentId - The tournament's UUID.
 */
export function tournamentKey(tournamentId: string): readonly ['tournaments', 'detail', string] {
  return TOURNAMENT_CACHE_KEYS.detail(tournamentId);
}

// ─── Public tournament list convergence ─────────────────────────────────────

/**
 * Prefix used by all public tournament list cache keys.
 */
export const PUBLIC_TOURNAMENTS_PREFIX = 'tournaments:' as const;

/**
 * Predicate matched against each cache key. Returns `true` for every
 * entry whose key belongs to the public tournament namespace — both
 * the string-form (`'tournaments:...'`) and the array-form
 * (`['tournaments', ...]`) variants used by the Phase 5 hooks.
 *
 * The array-form matcher treats any tuple whose first segment is
 * `'tournaments'` as belonging to the public tournament namespace.
 * This matches `useTournaments` (`['tournaments', 'list', ...]`) and
 * `useTournament` (`['tournaments', 'detail', id]`).
 */
export function publicTournamentKeyMatcher(key: unknown): boolean {
  if (typeof key === 'string') {
    return key.startsWith(PUBLIC_TOURNAMENTS_PREFIX);
  }
  if (Array.isArray(key)) {
    const head = key[0];
    if (typeof head === 'string' && head === 'tournaments') {
      return true;
    }
    // Also check if any segment starts with the prefix (for nested keys)
    return key.some(
      (segment) =>
        typeof segment === 'string' && segment.startsWith(PUBLIC_TOURNAMENTS_PREFIX),
    );
  }
  return false;
}

/**
 * Predicate matched against admin list cache keys.
 *
 * Matches keys that start with the admin list prefix.
 */
export function adminListKeyMatcher(key: unknown): boolean {
  if (typeof key === 'string') {
    return key.startsWith(TOURNAMENT_ADMIN_LIST_PREFIX);
  }
  return false;
}

// ─── Invalidation helpers ────────────────────────────────────────────────────

/**
 * Revalidate the tournament admin list SWR cache entries.
 *
 * Calls `mutate` on every key matching the admin list prefix pattern.
 * This ensures all filtered views and pagination states are refreshed.
 *
 * @param mutate — optional `ScopedMutator` (defaults to the global
 *   SWR `mutate`). Tests inject a fake to assert call shape.
 */
export function invalidateTournamentAdminList(
  mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
  return (mutate(adminListKeyMatcher) as unknown) as Promise<unknown[]>;
}

/**
 * Revalidate the admin list entry for specific filter parameters.
 *
 * Call this after a mutation to revalidate a specific view (e.g., after
 * creating a new 'upcoming' tournament, revalidate the 'upcoming' list).
 *
 * @param params - The filter params matching the list key.
 * @param mutate — optional `ScopedMutator`.
 */
export function invalidateTournamentAdminListByParams(
  params: TournamentListFilters,
  mutate: ScopedMutator = globalMutate,
): Promise<unknown> {
  return mutate(tournamentAdminListKey(params)) as Promise<unknown>;
}

/**
 * Revalidate the per-tournament detail cache entry.
 *
 * Called after create (with the new tournament ID), update, or delete
 * (to clear stale data). Also revalidates the admin list since the
 * item count or ordering may have changed.
 *
 * @param tournamentId - The affected tournament ID.
 * @param mutate — optional `ScopedMutator`.
 */
export function invalidateTournamentById(
  tournamentId: string,
  mutate: ScopedMutator = globalMutate,
): Promise<unknown> {
  const detailKey = tournamentKey(tournamentId);
  return mutate(detailKey) as Promise<unknown>;
}

/**
 * Revalidate every public tournament-related SWR cache entry.
 *
 * SWR's `mutate(matcher)` form accepts a function predicate that
 * iterates every cache entry and revalidates the matches. This
 * sweeps the Phase 5 public hooks' `tournaments:list:*`,
 * `tournaments:detail:*`, and any future tournament read paths
 * that share the namespace.
 *
 * The matcher is intentionally prefix-based — the public hooks
 * evolve new key shapes (filter, cursor, etc.) and a single-prefix
 * matcher covers them without per-shape maintenance.
 *
 * @param mutate — optional `ScopedMutator`.
 */
export function invalidatePublicTournamentCaches(
  mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
  return (mutate(publicTournamentKeyMatcher) as unknown) as Promise<unknown[]>;
}

/**
 * Full invalidation after a tournament mutation.
 *
 * Calls all three invalidation helpers to ensure:
 *   1. The admin list reflects the change
 *   2. The per-tournament detail is cleared (if update/delete)
 *   3. All public tournament caches are refreshed
 *
 * @param tournamentId - The affected tournament ID (for detail invalidation).
 * @param mutate — optional `ScopedMutator`.
 */
export function invalidateAllTournamentCaches(
  tournamentId: string,
  mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
  void invalidateTournamentAdminList(mutate);
  void invalidateTournamentById(tournamentId, mutate);
  void invalidatePublicTournamentCaches(mutate);

  // Return a resolved promise — callers don't need to await
  return Promise.resolve([]);
}
