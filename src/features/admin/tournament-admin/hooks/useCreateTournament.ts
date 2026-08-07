/**
 * `useCreateTournament` — admin tournament create mutation hook.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C2.
 *
 * ## What this hook owns
 *
 * - Wraps `createTournament` (TKT-7.1.E7) with SWR cache
 *   invalidation and the documented Phase 7 audit breadcrumbs.
 * - On success:
 *     - Invalidates the admin list SWR key namespace
 *       (`['admin', 'tournaments', ...]`).
 *     - Invalidates the public tournament list keys
 *       (`['tournaments', 'list', ...]`) so the new tournament
 *       appears on the public list on next visit.
 *     - Emits an `addTournamentAdminBreadcrumb({ status: 'success' })`
 *       with `action: 'tournament.create'` (no PII; the input shape
 *       is the documented tournament metadata).
 * - On error:
 *     - Surfaces `TOURNAMENT_VALIDATION`, `TOURNAMENT_SLUG_CONFLICT`,
 *       and `ADMIN_FORBIDDEN` (the documented terminal codes) without
 *       any automatic retry.
 *     - Emits `addTournamentAdminBreadcrumb({ status: 'failure' })`
 *       with the typed `code`, `requestId`, `correlationId`, and a
 *       redacted payload.
 * - Exposes an `audit` handle with the captured `before` snapshot
 *   (the form input, redacted of any sensitive future fields) and
 *   the post-create `after` payload so destructive UI surfaces
 *   (TKT-7.7.D2) render the audit trail via `AuditActionShell`
 *   (TKT-7.1.C3) without re-implementing the redaction logic.
 *
 * ## Error contract
 *
 * The hook surfaces every `ApiError` with `code` intact; the dialog
 * (TKT-7.7.D2) branches on the typed code:
 *
 *   - `TOURNAMENT_VALIDATION` → inline form error banner.
 *   - `TOURNAMENT_SLUG_CONFLICT` (when documented) → inline form
 *     error banner.
 *   - `ADMIN_FORBIDDEN` → `RequestIdBanner`.
 *   - everything else → `RequestIdBanner`.
 *
 * The hook never retries on its own — the dialog decides whether
 * to retry via the `AuditActionShell` render-prop's `retry` handle.
 *
 * ## In-flight semantics
 *
 *   - `isPending` reflects the in-flight state of the create mutation.
 *   - Concurrent calls (`create` invoked twice before the first
 *     settles) return the same in-flight promise so the mutation
 *     fires exactly once per `create` invocation cycle.
 *
 * ## Cross-batch invariants
 *
 * - The hook never throws — every rejection is captured into the
 *   `error` slot. The `create` function itself throws the captured
 *   `ApiError` so callers (`AuditActionShell`) can branch on it.
 * - `reset()` clears `error` / `audit` / `isPending` without
 *   triggering another fetch.
 * - `addTournamentAdminBreadcrumb` is the only breadcrumb emitter.
 *   The hook does not call `addAdminBreadcrumb` directly.
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api/core/ApiError';
import { addTournamentAdminBreadcrumb } from '@/lib/admin/phase7_admin_sentry';

import { createTournament } from '@/features/admin/services/tournament-admin.service';
import { tournamentAdminListKeyMatcher } from './useTournamentAdminList';
import {
  adminTournamentsKeyMatcher,
  coerceToApiError,
  nowMs,
  publicTournamentsKeyMatcher,
} from './internal/mutation-helpers';
import type {
  TournamentCreateDto,
  TournamentDto,
} from '../admin-tournament-types';

// ─── Public types ───────────────────────────────────────────────────────────

export interface UseCreateTournamentAuditSnapshot {
  /** The form input captured when the mutation started (redacted copy). */
  beforeInput: TournamentCreateDto | null;
  /** The newly-created tournament payload captured on success. */
  afterTournament: TournamentDto | null;
}

export interface UseCreateTournamentResult {
  /**
   * Trigger the create mutation. Resolves to the new `TournamentDto`
   * on success, rejects with `ApiError` on failure.
   */
  create: (input: TournamentCreateDto) => Promise<TournamentDto>;
  /** `true` while a mutation is in flight. */
  isPending: boolean;
  /** The typed API error from the most recent failure. `null` until a failure occurs. */
  error: ApiError | null;
  /** Clear `error` / `audit` and return to the idle state. */
  reset: () => void;
  /** Audit-trail snapshot (before input / after tournament). */
  audit: UseCreateTournamentAuditSnapshot;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useCreateTournament(): UseCreateTournamentResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [beforeInput, setBeforeInput] = useState<TournamentCreateDto | null>(
    null,
  );
  const [afterTournament, setAfterTournament] = useState<TournamentDto | null>(
    null,
  );

  const inFlightRef = useRef<Promise<TournamentDto> | null>(null);

  const create = useCallback(
    async (input: TournamentCreateDto): Promise<TournamentDto> => {
      // Single-flight: a second `create` call before the first
      // settles returns the same in-flight promise.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      setBeforeInput(input);
      setAfterTournament(null);
      setError(null);
      setIsPending(true);

      const startedAt = nowMs();
      addTournamentAdminBreadcrumb({
        action: 'tournament.create',
        route: 'admin-tournament.create',
        status: 'started',
        durationMs: 0,
      });

      const core = (async (): Promise<TournamentDto> => {
        try {
          const created = await createTournament(input);

          setAfterTournament(created);
          addTournamentAdminBreadcrumb({
            action: 'tournament.create',
            route: 'admin-tournament.create',
            status: 'success',
            durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
            targetId: created.tournamentId,
          });

          // Revalidate every admin-list and public-list page so the
          // new tournament appears on next visit. `globalMutate`
          // accepts a matcher predicate so we do not need to know
          // every concrete key.
          await globalMutate(
            (key: readonly unknown[]) =>
              tournamentAdminListKeyMatcher(key) ||
              publicTournamentsKeyMatcher(key),
            undefined,
            { revalidate: true },
          );

          return created;
        } catch (caught: unknown) {
          const apiError = coerceToApiError(caught);
          setError(apiError);
          addTournamentAdminBreadcrumb({
            action: 'tournament.create',
            route: 'admin-tournament.create',
            status: 'failure',
            durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
            code: apiError.code,
            requestId: apiError.requestId,
            correlationId: apiError.correlationId,
            redactedPayload: {
              requestId: apiError.requestId,
              detail: apiError.detail,
            },
          });
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
    setBeforeInput(null);
    setAfterTournament(null);
    setIsPending(false);
    inFlightRef.current = null;
  }, []);

  return {
    create,
    isPending,
    error,
    reset,
    audit: {
      beforeInput,
      afterTournament,
    },
  };
}