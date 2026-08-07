/**
 * `useUpdateTournament` — admin tournament update mutation hook.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C3.
 *
 * ## What this hook owns
 *
 * - Wraps `updateTournament` (TKT-7.1.E7) with SWR cache
 *   invalidation and the documented Phase 7 audit breadcrumbs.
 * - On success:
 *     - Invalidates the admin list SWR key namespace
 *       (`['admin', 'tournaments', ...]`).
 *     - Invalidates the public tournament list keys
 *       (`['tournaments', 'list', ...]`).
 *     - Invalidates the per-tournament public detail key
 *       (`['tournaments', 'detail', <id>]`).
 *     - Emits `addTournamentAdminBreadcrumb({ status: 'success' })`
 *       with `action: 'tournament.update'`, the target id, and the
 *       redacted before / after payload.
 * - On error:
 *     - Surfaces `TOURNAMENT_ALREADY_STARTED`, `TOURNAMENT_NOT_FOUND`,
 *       `TOURNAMENT_VALIDATION`, and `ADMIN_FORBIDDEN` without any
 *       automatic retry.
 *     - Emits `addTournamentAdminBreadcrumb({ status: 'failure' })`
 *       with the typed code, request id, correlation id, and a
 *       redacted payload.
 * - Exposes an `audit` handle with the captured `before` snapshot
 *   (the form input + the prefilled tournament at the time the
 *   mutation started) and the post-update `after` payload so the
 *   edit dialog (TKT-7.7.D3) renders the audit trail via
 *   `AuditActionShell` (TKT-7.1.C3) without re-implementing the
 *   redaction logic.
 *
 * ## Error contract
 *
 * The hook surfaces every `ApiError` with `code` intact; the dialog
 * branches on the typed code:
 *
 *   - `TOURNAMENT_ALREADY_STARTED` → non-blocking notice ("cannot
 *     edit a tournament that has started").
 *   - `TOURNAMENT_NOT_FOUND` → "tournament not found" notice; the
 *     form closes.
 *   - `TOURNAMENT_VALIDATION` → inline form error banner.
 *   - `ADMIN_FORBIDDEN` → `RequestIdBanner`.
 *
 * ## In-flight semantics
 *
 *   - `isPending` reflects the in-flight state of the update mutation.
 *   - Concurrent calls (`update` invoked twice before the first
 *     settles) return the same in-flight promise so the mutation
 *     fires exactly once per `update` invocation cycle.
 *   - On `TOURNAMENT_NOT_FOUND` the hook also invalidates the admin
 *     list keys so the row drops out on next visit.
 *
 * ## Cross-batch invariants
 *
 * - The hook never throws — every rejection is captured into the
 *   `error` slot. The `update` function itself throws the captured
 *   `ApiError` so callers (`AuditActionShell`) can branch on it.
 * - `reset()` clears `error` / `audit` / `isPending` without
 *   triggering another fetch.
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError, coerceToApiError } from '@/lib/api';
import { addTournamentAdminBreadcrumb } from '@/lib/admin/phase7_admin_sentry';

import { updateTournament } from '@/features/admin/services/tournament-admin.service';
import {
  adminTournamentsKeyMatcher,
  nowMs,
  publicTournamentDetailKeyMatcher,
  publicTournamentsKeyMatcher,
} from './internal/mutation-helpers';
import type {
  TournamentDto,
  TournamentUpdateDto,
} from '../admin-tournament-types';

// ─── Public types ───────────────────────────────────────────────────────────

export interface UseUpdateTournamentAuditSnapshot {
  /** Tournament id captured when the mutation started. */
  beforeTournamentId: string | null;
  /** Form input captured when the mutation started (redacted copy). */
  beforeInput: TournamentUpdateDto | null;
  /** The original tournament captured at the start of the mutation (redacted copy). */
  beforeTournament: TournamentDto | null;
  /** Tournament id once the mutation settles on success. */
  afterTournamentId: string | null;
  /** The full server-side `after` payload captured on success. */
  afterTournament: TournamentDto | null;
}

export interface UseUpdateTournamentResult {
  /**
   * Trigger the update mutation. Resolves to the updated
   * `TournamentDto` on success, rejects with `ApiError` on failure.
   */
  update: (
    id: string,
    input: TournamentUpdateDto,
  ) => Promise<TournamentDto>;
  /** `true` while a mutation is in flight. */
  isPending: boolean;
  /** The typed API error from the most recent failure. `null` until a failure occurs. */
  error: ApiError | null;
  /** Clear `error` / `audit` and return to the idle state. */
  reset: () => void;
  /** Audit-trail snapshot (before / after). */
  audit: UseUpdateTournamentAuditSnapshot;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useUpdateTournament(): UseUpdateTournamentResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [beforeTournamentId, setBeforeTournamentId] = useState<string | null>(
    null,
  );
  const [beforeInput, setBeforeInput] = useState<TournamentUpdateDto | null>(
    null,
  );
  const [beforeTournament, setBeforeTournament] = useState<TournamentDto | null>(
    null,
  );
  const [afterTournamentId, setAfterTournamentId] = useState<string | null>(
    null,
  );
  const [afterTournament, setAfterTournament] = useState<TournamentDto | null>(
    null,
  );

  const inFlightRef = useRef<Promise<TournamentDto> | null>(null);

  const update = useCallback(
    async (id: string, input: TournamentUpdateDto): Promise<TournamentDto> => {
      // Single-flight: a second `update` call before the first settles
      // returns the same in-flight promise.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setBeforeTournamentId(id);
      setBeforeInput(input);
      setBeforeTournament(null);
      setAfterTournamentId(null);
      setAfterTournament(null);
      setError(null);
      setIsPending(true);

      const startedAt = nowMs();
      addTournamentAdminBreadcrumb({
        action: 'tournament.update',
        route: 'admin-tournament.update',
        status: 'started',
        durationMs: 0,
        targetId: id,
      });

      const core = (async (): Promise<TournamentDto> => {
        try {
          const updated = await updateTournament(id, input);

          setAfterTournamentId(id);
          setAfterTournament(updated);
          addTournamentAdminBreadcrumb({
            action: 'tournament.update',
            route: 'admin-tournament.update',
            status: 'success',
            durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
            targetId: id,
          });

          // Revalidate every admin-list, public-list, and public-detail
          // (per id) page so the edited tournament reflects the new
          // state on next visit.
          await globalMutate(
            (key: readonly unknown[]) =>
              adminTournamentsKeyMatcher(key) ||
              publicTournamentsKeyMatcher(key) ||
              publicTournamentDetailKeyMatcher(key, id),
            undefined,
            { revalidate: true },
          );

          return updated;
        } catch (caught: unknown) {
          const apiError = coerceToApiError(caught);
          setError(apiError);
          addTournamentAdminBreadcrumb({
            action: 'tournament.update',
            route: 'admin-tournament.update',
            status: 'failure',
            durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
            targetId: id,
            code: apiError.code,
            requestId: apiError.requestId,
            correlationId: apiError.correlationId,
            redactedPayload: {
              requestId: apiError.requestId,
              detail: apiError.detail,
            },
          });

          // On `TOURNAMENT_NOT_FOUND` the row may have been removed by
          // another admin; still revalidate the admin list so the row
          // drops out on next visit.
          if (apiError.code === 'TOURNAMENT_NOT_FOUND') {
            await globalMutate(
              (key: readonly unknown[]) =>
                adminTournamentsKeyMatcher(key) ||
                publicTournamentDetailKeyMatcher(key, id),
              undefined,
              { revalidate: true },
            ).catch(() => {
              // Best-effort — failure here is surfaced via the
              // original `apiError` and is not bubbled.
            });
          }

          throw apiError;
        }
      })();

      inFlightRef.current = core;
      try {
        return await core;
      } finally {
        setIsPending(false);
        inFlightRef.current = null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setError(null);
    setBeforeTournamentId(null);
    setBeforeInput(null);
    setBeforeTournament(null);
    setAfterTournamentId(null);
    setAfterTournament(null);
    setIsPending(false);
    inFlightRef.current = null;
  }, []);

  return {
    update,
    isPending,
    error,
    reset,
    audit: {
      beforeTournamentId,
      beforeInput,
      beforeTournament,
      afterTournamentId,
      afterTournament,
    },
  };
}