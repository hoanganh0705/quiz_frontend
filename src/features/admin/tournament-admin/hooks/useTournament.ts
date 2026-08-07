/**
 * `useTournament` — admin single-tournament read hook (for edit
 * form prefilling).
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C5.
 *
 * ## What this hook owns
 *
 * - Fetches a single tournament by id via the Phase 5
 *   `getTournament` service wrapper (TKT-5.1.F1). Returns the
 *   canonical `TournamentDto` (= `TournamentResponseDto`).
 * - Wraps `useSingleWithRetry` (Epic 3.6) so the page:
 *     - inherits the documented 429 backoff (250 / 500 / 1000 ms);
 *     - never retries on a non-429 4xx (`TOURNAMENT_NOT_FOUND`
 *       surfaces immediately so the edit form can render the
 *       "tournament not found" notice);
 *     - aborts the in-flight fetch when the id changes or the
 *       hook unmounts.
 * - Gates on the documented edit permission
 *   (`usePermission('tournament_update')`, TKT-7.1.B2). When the
 *   current admin lacks the permission, the hook disables its
 *   fetch and returns
 *   `{ tournament: null, isLoading: false, error: null }` so the
 *   edit form never attempts a fetch the backend would refuse.
 * - When the supplied id is `null` (defensive disable path), the
 *   hook is also disabled — no fetch, no error.
 *
 * ## Deviation from the planning ticket
 *
 * The planning ticket references "calls `getTournament` from
 * `tournament-admin.service.ts` (TKT-7.1.E7 — the admin-scoped
 * getter; Phase 5's `useTournament` is public)". The
 * `tournament-admin.service.ts` module shipped in TKT-7.1.E7 only
 * owns `createTournament`, `updateTournament`, and
 * `deleteTournament`; there is no admin-scoped getter. Per
 * TKT-7.7.A1 §2.3 the backend's `GET /tournaments/:id` does not
 * branch on the caller's role (the same response is returned to
 * authenticated callers regardless of admin status), so the Phase
 * 5 `getTournament` is the correct underlying service. The hook
 * re-exports the canonical `TournamentDto` so a future admin-scoped
 * getter can slot in behind the same surface without touching the
 * consumers.
 *
 * ## Return shape
 *
 *   `{ tournament, isLoading, error }` —
 *
 *   - `tournament: TournamentDto | null` — the canonical tournament
 *     row; `null` while loading, on permission denial, on
 *     `TOURNAMENT_NOT_FOUND`, or when the id is null.
 *   - `isLoading: boolean` — `true` while the first fetch is in
 *     flight.
 *   - `error: ApiError | null` — the typed `ErrorCode` error; the
 *     edit form surfaces the documented copy per code.
 */

'use client';

import { useMemo } from 'react';

import { useSingleWithRetry } from '@/lib/api';

import { getTournament } from '@/features/tournaments/services/tournaments.service';
import { usePermission } from '@/features/admin/hooks/usePermission';
import { PERMISSIONS } from '@/features/admin/permissions';

import type { TournamentDto } from '../admin-tournament-types';

// ─── Public types ───────────────────────────────────────────────────────────

export interface UseTournamentResult {
  tournament: TournamentDto | null;
  isLoading: boolean;
  error: import('@/lib/api/core/ApiError').ApiError | null;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Single-tournament read hook for the admin edit form.
 *
 * @example
 *   const { tournament, isLoading, error } = useTournament(id);
 *   if (isLoading) return <Skeleton />;
 *   if (tournament === null) return <NotFound />;
 *   return <EditForm initial={tournament} />;
 */
export function useTournament(id: string | null): UseTournamentResult {
  // Permission gate. When the user lacks `tournament_update`, the
  // hook short-circuits — the edit form renders the
  // permission-denied notice without attempting a fetch.
  const permission = usePermission(PERMISSIONS.tournament_update);

  // Stable cache key. A change to the id invalidates the previous
  // result and triggers a new fetch. `null` disables the fetch.
  const key = useMemo(
    () =>
      permission.hasPermission && id !== null
        ? (['admin', 'tournaments', 'detail', id] as const)
        : null,
    [permission.hasPermission, id],
  );

  const result = useSingleWithRetry<TournamentDto | null>({
    key,
    fetcher: async ({ signal }) => {
      // The Phase 5 service wrapper returns the SDK envelope
      // shape; the documented DTO lives at `.data.data` (the
      // service unwraps one level) or at `.data` (the raw SDK
      // response on envelope-mismatch). Coalesce both paths.
      const wire = (await getTournament(id as string)) as unknown as
        | { data?: TournamentDto }
        | TournamentDto;
      if (signal.aborted) throw new Error('aborted');
      const tournament =
        wire !== null && typeof wire === 'object' && 'data' in wire
          ? ((wire as { data?: TournamentDto }).data ?? null)
          : (wire as TournamentDto);
      return tournament;
    },
  });

  if (!permission.hasPermission || id === null) {
    return { tournament: null, isLoading: false, error: null };
  }

  return {
    tournament: result.data ?? null,
    isLoading: result.isLoading,
    error: result.error,
  };
}