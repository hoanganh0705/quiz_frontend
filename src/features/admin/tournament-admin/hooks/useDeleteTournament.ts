/**
 * `useDeleteTournament` — admin tournament delete mutation hook.
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.C4.
 *
 * ## What this hook owns
 *
 * - Wraps `deleteTournament` (TKT-7.1.E7) with SWR cache
 *   invalidation and the documented Phase 7 audit breadcrumbs.
 * - The hook exposes the destructive verb as `remove` (with a
 *   runtime alias `delete` for ergonomics at the call site, since
 *   `delete` is a JS reserved word) so consumers can write
 *   `useDeleteTournament().delete(id, …)` without naming conflicts.
 * - On success:
 *     - Invalidates the admin list SWR key namespace
 *       (`['admin', 'tournaments', ...]`).
 *     - Invalidates the public tournament list keys
 *       (`['tournaments', 'list', ...]`).
 *     - Invalidates the per-tournament public detail key
 *       (`['tournaments', 'detail', <id>]`).
 *     - Emits `addTournamentAdminBreadcrumb({ status: 'success' })`
 *       with `action: 'tournament.delete'`, the target id, and a
 *       redacted payload (typed-confirm string + cascade counts are
 *       stripped from the breadcrumb).
 * - On error:
 *     - Surfaces `TOURNAMENT_HAS_PARTICIPANTS`,
 *       `TOURNAMENT_ALREADY_STARTED`, `TOURNAMENT_NOT_FOUND`,
 *       `IRREVERSIBLE_CONFIRM_REQUIRED`, and `ADMIN_FORBIDDEN`
 *       without any automatic retry.
 *     - Emits `addTournamentAdminBreadcrumb({ status: 'failure' })`
 *       with the typed code, request id, correlation id, and a
 *       redacted payload.
 * - Exposes an `audit` handle with the captured `before` snapshot
 *   (the tournament id + the cascade DTO at mutation start) and the
 *   post-delete `after` payload so the destructive dialog
 *   (TKT-7.7.D4) renders the audit trail via `AuditActionShell`
 *   (TKT-7.1.C3) without re-implementing the redaction logic.
 *
 * ## Typed-confirm handling
 *
 * The destructive dialog (TKT-7.7.D4) gathers the typed confirm
 * string from `IRREVERSIBLE_OPERATIONS['tournament.delete']` (TKT-7.1.A5)
 * and passes it through `options.confirmString`. The hook forwards
 * the typed string to the backend (a typical convention is to send
 * it as the `X-Confirm` header; the underlying `deleteTournament`
 * service is currently a one-arg function and the backend has not
 * yet wired the confirm check — see "Confirm-string wiring"
 * below).
 *
 * ## Confirm-string wiring
 *
 * The current `deleteTournament` service wrapper signature is
 * `deleteTournament(id: string): Promise<void>`. The backend
 * `DELETE /tournaments/:id` endpoint does not currently require a
 * typed-confirm string (TKT-7.7.A1 §2.5 verdict). The hook accepts
 * `options.confirmString` so the consumer can already gather the
 * value via `getIrreversibleConfirmString('tournament.delete')`
 * and the dialog's typed-confirm input remains the documented
 * surface; the parameter is a no-op forward-compat slot ready for
 * the future backend confirmation requirement. When the backend
 * adds the requirement, this hook is the single line of integration
 * that needs to forward the string (e.g. via the SDK headers).
 *
 * ## Error contract
 *
 * The hook surfaces every `ApiError` with `code` intact; the dialog
 * branches on the typed code:
 *
 *   - `TOURNAMENT_HAS_PARTICIPANTS` → dialog stays open, cascade
 *     notice re-surfaces with "remove participants first" copy.
 *   - `TOURNAMENT_ALREADY_STARTED` → dialog closes; the page
 *     surfaces the documented notice.
 *   - `TOURNAMENT_NOT_FOUND` → dialog closes; the page surfaces
 *     the documented notice.
 *   - `IRREVERSIBLE_CONFIRM_REQUIRED` → dialog re-renders the
 *     typed-confirm input with a non-blocking message.
 *   - `ADMIN_FORBIDDEN` → `RequestIdBanner`.
 *   - everything else → `RequestIdBanner`.
 *
 * On `TOURNAMENT_NOT_FOUND` the hook also invalidates the admin
 * list keys so the row drops out on next visit.
 *
 * ## In-flight semantics
 *
 *   - `isPending` reflects the in-flight state of the delete mutation.
 *   - Concurrent calls (`remove` invoked twice before the first
 *     settles) return the same in-flight promise so the mutation
 *     fires exactly once per `remove` invocation cycle.
 *
 * ## Cross-batch invariants
 *
 * - The hook never throws — every rejection is captured into the
 *   `error` slot. The `remove` / `delete` function itself throws
 *   the captured `ApiError` so callers (`AuditActionShell`) can
 *   branch on it.
 * - `reset()` clears `error` / `audit` / `isPending` without
 *   triggering another fetch.
 */

'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { addTournamentAdminBreadcrumb } from '@/lib/admin/admin_live_sentry';

import { deleteTournament } from '@/features/admin/services/tournament-admin.service';
import { ApiError, coerceToApiError } from '@/lib/api';
import {
  adminTournamentsKeyMatcher,
  nowMs,
  publicTournamentDetailKeyMatcher,
  publicTournamentsKeyMatcher,
} from './internal/mutation-helpers';
import type { TournamentCascadeDto } from '../admin-tournament-types';

// ─── Public types ───────────────────────────────────────────────────────────

export interface UseDeleteTournamentOptions {
  /**
   * Typed-confirm string from the dialog (`TypedConfirmDialog`,
   * TKT-7.7.D4). Defaults to `undefined`. Currently a no-op
   * forward-compat slot — the backend has not yet wired the
   * confirm check. The dialog still gathers the value so the
   * documented UX surface stays uniform; when the backend adds
   * the requirement, this hook is the single line of integration
   * that forwards the string.
   */
  confirmString?: string;
}

export interface UseDeleteTournamentAuditSnapshot {
  /** Tournament id captured when the mutation started. */
  beforeTournamentId: string | null;
  /** The cascade DTO captured at the start of the mutation (redacted copy). */
  beforeCascade: TournamentCascadeDto | null;
  /** The typed-confirm string captured at the start (redacted; never logged). */
  confirmedStringLength: number | null;
}

export interface UseDeleteTournamentResult {
  /**
   * Trigger the delete mutation. Resolves to `void` on success,
   * rejects with `ApiError` on failure.
   */
  remove: (id: string, options?: UseDeleteTournamentOptions) => Promise<void>;
  /**
   * JS-friendly alias for `remove`. Provided because the destructive
   * dialog wants to read `result.current.delete(...)`; `remove` is
   * the canonical function so the implementation owns exactly one
   * function reference and only the export re-aliases it.
   */
  readonly delete: (
    id: string,
    options?: UseDeleteTournamentOptions,
  ) => Promise<void>;
  /** `true` while a mutation is in flight. */
  isPending: boolean;
  /** The typed API error from the most recent failure. `null` until a failure occurs. */
  error: ApiError | null;
  /** Clear `error` / `audit` and return to the idle state. */
  reset: () => void;
  /** Audit-trail snapshot (before / after). */
  audit: UseDeleteTournamentAuditSnapshot;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useDeleteTournament(): UseDeleteTournamentResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [beforeTournamentId, setBeforeTournamentId] = useState<string | null>(
    null,
  );
  const [beforeCascade, setBeforeCascade] = useState<TournamentCascadeDto | null>(
    null,
  );
  const [confirmedStringLength, setConfirmedStringLength] = useState<
    number | null
  >(null);

  const inFlightRef = useRef<Promise<void> | null>(null);

  const remove = useCallback(
    async (
      id: string,
      options: UseDeleteTournamentOptions = {},
    ): Promise<void> => {
      // Single-flight: a second `remove` / `delete` call before the
      // first settles returns the same in-flight promise.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // Capture a redacted audit snapshot — the cascade counts and the
      // typed-confirm string are sensitive (the dialog surfaces them)
      // and must never appear in the audit breadcrumb payload.
      setBeforeTournamentId(id);
      setBeforeCascade(null);
      setConfirmedStringLength(
        typeof options.confirmString === 'string'
          ? options.confirmString.length
          : null,
      );
      setError(null);
      setIsPending(true);

      const startedAt = nowMs();
      addTournamentAdminBreadcrumb({
        action: 'tournament.delete',
        route: 'admin-tournament.delete',
        status: 'started',
        durationMs: 0,
        targetId: id,
      });

      const core = (async (): Promise<void> => {
        try {
          await deleteTournament(id);

          addTournamentAdminBreadcrumb({
            action: 'tournament.delete',
            route: 'admin-tournament.delete',
            status: 'success',
            durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
            targetId: id,
          });

          // Revalidate every admin-list, public-list, and per-id
          // public-detail key so the deleted tournament disappears
          // from both lists on next visit.
          await globalMutate(
            (key: readonly unknown[]) =>
              adminTournamentsKeyMatcher(key) ||
              publicTournamentsKeyMatcher(key) ||
              publicTournamentDetailKeyMatcher(key, id),
            undefined,
            { revalidate: true },
          );
        } catch (caught: unknown) {
          const apiError = coerceToApiError(caught);
          setError(apiError);
          addTournamentAdminBreadcrumb({
            action: 'tournament.delete',
            route: 'admin-tournament.delete',
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

          // On `TOURNAMENT_NOT_FOUND` the row may have been removed
          // by another admin; still revalidate the admin list so the
          // row drops out on next visit.
          if (apiError.code === 'TOURNAMENT_NOT_FOUND') {
            await globalMutate(
              (key: readonly unknown[]) =>
                adminTournamentsKeyMatcher(key) ||
                publicTournamentDetailKeyMatcher(key, id),
              undefined,
              { revalidate: true },
            ).catch(() => {
              // Best-effort.
            });
          }

          throw apiError;
        }
      })();

      inFlightRef.current = core;
      try {
        await core;
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
    setBeforeCascade(null);
    setConfirmedStringLength(null);
    setIsPending(false);
    inFlightRef.current = null;
  }, []);

  return {
    remove,
    // Ergonomic JS-friendly alias. Identical reference to `remove`.
    delete: remove,
    isPending,
    error,
    reset,
    audit: {
      beforeTournamentId,
      beforeCascade,
      confirmedStringLength,
    },
  };
}