/**
 * `useTournamentCascade` — admin cascade resource counts hook for
 * the delete dialog.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C6.
 *
 * ## What this hook owns
 *
 * - Fetches the cascade resource counts (participants / rounds /
 *   leaderboards) used by `TournamentDeleteDialog` to render the
 *   "what will be affected" notice before an irreversible delete.
 * - Wraps `useSingleWithRetry` (Epic 3.6) so the page:
 *     - inherits the documented 429 backoff (250 / 500 / 1000 ms);
 *     - never retries on a non-429 4xx (`TOURNAMENT_NOT_FOUND`
 *       surfaces immediately so the dialog renders the "not found"
 *       branch);
 *     - aborts the in-flight fetch when the tournamentId changes or
 *       the hook unmounts.
 * - Gates on the documented delete permission
 *   (`usePermission('tournament_delete')`, TKT-7.1.B2). When the
 *   current admin lacks the permission, the hook disables its
 *   fetch and returns
 *   `{ cascade: null, isLoading: false, error: null }` so the
 *   dialog never attempts a fetch the backend would refuse.
 * - When `tournamentId` is `null`, the hook is disabled (no fetch,
 *   no error).
 *
 * ## Data source
 *
 * Per TKT-7.7.A1 §2.4 verdict:
 *   - The backend does NOT currently expose a dedicated cascade
 *     endpoint (`GET /tournaments/:id/cascade`).
 *   - The backend does NOT currently embed the cascade payload in
 *     the `DELETE /tournaments/:id` response.
 *
 * The hook therefore derives the cascade counts from the closest
 * available Phase 5 endpoints:
 *
 *   - `participants` ← `getTournamentStats(id).participantCount`
 *     (the only documented numeric participant count).
 *   - `rounds` ← `null` (no documented endpoint exposes this count).
 *   - `leaderboards` ← `null` (no documented endpoint exposes this
 *     count).
 *
 * The destructured shape preserves `TournamentCascadeDto` so a
 * future dedicated cascade endpoint (or an embedded cascade in the
 * delete response) can wire straight in without touching the
 * dialog surface.
 *
 * ## Embedded-cascade fallback
 *
 * When a future phase ships:
 *   - a dedicated cascade endpoint, the `fetcher` body swaps to that
 *     call;
 *   - an embedded cascade in `DELETE /tournaments/:id`, the
 *     `useDeleteTournament.audit.beforeCascade` slot consumes the
 *     embedded shape and the dialog reads it via
 *     `useDeleteTournament.audit` — this hook stays the standalone
 *     read-only entry point for the *pre*-delete preview.
 *
 * The dialog continues to render the documented "cascade data
 * unavailable" message when `cascade === null` (the
 * `TournamentCascadeNotice` branch covers this case).
 *
 * ## Return shape
 *
 *   `{ cascade, isLoading, error }` —
 *
 *   - `cascade: TournamentCascadeDto | null` — the cascade payload;
 *     `null` while loading, on permission denial, on
 *     `TOURNAMENT_NOT_FOUND`, on a non-derivable case, or when the
 *     id is null.
 *   - `isLoading: boolean`.
 *   - `error: ApiError | null` — the typed `ErrorCode` error.
 */

'use client';

import { useMemo } from 'react';

import { useSingleWithRetry } from '@/lib/api';

import { getTournamentStats } from '@/features/tournaments/services/tournaments.service';
import { usePermission } from '@/features/admin/hooks/usePermission';
import { PERMISSIONS } from '@/features/admin/permissions';

import type { TournamentCascadeDto } from '../admin-tournament-types';

// ─── Public types ───────────────────────────────────────────────────────────

export interface UseTournamentCascadeResult {
  cascade: TournamentCascadeDto | null;
  isLoading: boolean;
  error: import('@/lib/api/core/ApiError').ApiError | null;
}

// ─── Internals ──────────────────────────────────────────────────────────────

/**
 * Build the `TournamentCascadeDto` from the wire-shaped stats payload.
 * Only `participants` is currently derivable; the rest is `null`.
 *
 * The wire shape is intentionally narrowed — only the fields the
 * hook reads are named. Future additions ignore excess properties
 * without breaking the contract.
 */
function buildCascadeFromStats(
  wire: unknown,
): TournamentCascadeDto {
  if (wire === null || typeof wire !== 'object') {
    return { participants: null, rounds: null, leaderboards: null };
  }
  const candidate = wire as { participantCount?: unknown };
  const participants =
    typeof candidate.participantCount === 'number'
      ? candidate.participantCount
      : null;
  return {
    participants,
    rounds: null,
    leaderboards: null,
  };
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Cascade read hook for the admin delete dialog.
 *
 * @example
 *   const { cascade, isLoading } = useTournamentCascade(id);
 *   return cascade !== null
 *     ? <TournamentCascadeNotice cascade={cascade} />
 *     : <Skeleton />;
 */
export function useTournamentCascade(
  tournamentId: string | null,
): UseTournamentCascadeResult {
  // Permission gate. When the user lacks `tournament_delete`, the
  // hook short-circuits.
  const permission = usePermission(PERMISSIONS.tournament_delete);

  // Stable cache key. A change to the id invalidates the previous
  // result and triggers a new fetch. `null` disables the fetch.
  const key = useMemo(
    () =>
      permission.hasPermission && tournamentId !== null
        ? (['admin', 'tournaments', 'cascade', tournamentId] as const)
        : null,
    [permission.hasPermission, tournamentId],
  );

  const result = useSingleWithRetry<TournamentCascadeDto | null>({
    key,
    fetcher: async ({ signal }) => {
      // Per the A1 verdict the backend has no dedicated cascade
      // endpoint; we derive the available counts from
      // `getTournamentStats` (participants only). The returned
      // shape is null-stable so the dialog's "cascade data
      // unavailable" message renders cleanly.
      const wire = (await getTournamentStats(
        tournamentId as string,
      )) as unknown;
      if (signal.aborted) throw new Error('aborted');
      return buildCascadeFromStats(wire);
    },
  });

  if (!permission.hasPermission || tournamentId === null) {
    return { cascade: null, isLoading: false, error: null };
  }

  return {
    cascade: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error,
  };
}