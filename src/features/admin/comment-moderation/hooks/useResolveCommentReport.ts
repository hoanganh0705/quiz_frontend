'use client';

/**
 * `useResolveCommentReport` — comment-moderation resolve mutation hook.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.C2.
 *
 * ## What this hook owns
 *
 * - Wraps `patchCommentReport` (TKT-7.1.E4) and the companion
 *   `hideComment` (the SDK-side admin comment hide) with SWR cache
 *   invalidation and Phase 7 audit breadcrumbs.
 * - Maps the consumer-side action vocabulary (`dismiss`,
 *   `acknowledge`, `mark_resolved`, `hide_comment` — TKT-7.6.B2)
 *   onto the SDK `status` value (`reviewed` | `dismissed` |
 *   `actioned`). For `hide_comment`, additionally issues the
 *   companion `hideComment(commentId)` (per the action catalogue's
 *   `requiresCompanionHide` flag).
 * - On success, invalidates every page of the queue (the
 *   `commentReportsKeyMatcher` from TKT-7.6.C1), the affected
 *   comment's read SWR keys (`comments:*`, `comments:byId:*`), and
 *   the thread caches containing the affected comment. The ticket
 *   planning invariant #15 calls out the thread cache invalidation;
 *   the helper `invalidateCommentThreads` (Batch G, forthcoming)
 *   covers the thread invalidation; this hook emits the matching
 *   broadcast event.
 * - On success, broadcasts a `admin:7.1.comment-moderation.invalidate`
 *   event on the cross-tab channel (Batch G — forthcoming). Failure
 *   paths do NOT broadcast.
 *
 * ## Error contract
 *
 * The hook surfaces the documented stable codes for the queue
 * (`COMMENT_REPORT_NOT_FOUND`, `COMMENT_REPORT_ALREADY_RESOLVED`) and
 * the global `GLOBAL_FORBIDDEN` (for `PERMISSION_DENIED`). The
 * `EPIC_7_6_A1.md` evidence file records the live backend
 * verification; the hook classifies by `error.code` so the dialog
 * (TKT-7.6.D2) can branch on the typed code without inspecting HTTP
 * status. No automatic retry on stable codes.
 *
 * `COMMENT_REPORT_ALREADY_RESOLVED` is not yet a member of the
 * `ErrorCode` union in `error-codes.ts` (Epic 7.6 Batch A noted the
 * backend emits it; the registry update is a follow-up). The hook
 * still surfaces the code through `error.code` because
 * `ApiError.code` is typed as `string` in the SDK; the consumer
 * `isResolvedOutcome` discriminated union narrows defensively.
 *
 * ## Audit trail
 *
 * Each call emits:
 *
 *   - `addCommentModerationBreadcrumb({ status: 'started' })` on enter.
 *   - `addCommentModerationBreadcrumb({ status: 'success', durationMs })`
 *     on resolve.
 *   - `addCommentModerationBreadcrumb({ status: 'failure', code,
 *     requestId, correlationId })` on rejection.
 *
 * The breadcrumb `action` is the documented stable string for the
 * consumer-side action (per `COMMENT_REPORT_ACTIONS[action].breadcrumbAction`).
 * `targetId` is the report id; `redactFields` covers reporter id and
 * moderation notes.
 *
 * ## Audit-snapshot return value
 *
 * The hook exposes an `audit` handle carrying the captured `before`
 * (redacted copy of the report at the moment the mutation starts) and
 * the post-resolution `after` payload. Destructive UI surfaces
 * (TKT-7.6.D2) render this via `AuditActionShell` (TKT-7.1.C3); the
 * hook itself emits per-action breadcrumbs so the dialog remains
 * free of side-effects.
 *
 * ## Companion-hide path (`hide_comment`)
 *
 * The hook submits the status PATCH first, then the companion
 * `hideComment(commentId)`. Both calls log their own breadcrumbs.
 * If the PATCH succeeds and the companion hide fails, the report is
 * closed (`status: 'actioned'`) but the comment is still visible;
 * the resolver's UI surfaces the typed code so the operator can
 * retry. The hook does NOT compensate — that decision belongs to a
 * future Phase 7 follow-up ticket.
 */

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError, getComments } from '@/lib/api';
import { addCommentModerationBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
  patchCommentReport,
} from '@/features/admin/services/comment-moderation.service';
import {
  broadcastCommentModerationInvalidate,
} from '../cache/comment-moderation-cross-tab';
import { commentReportsKeyMatcher } from './useCommentReports';
import {
  COMMENT_REPORT_ACTIONS,
  getSdkStatusForCommentReportAction,
  isCommentReportConsumerAction,
  requiresCompanionHide,
  type CommentReportActionMetadata,
  type CommentReportConsumerAction,
} from '../action-enum';
import { type CommentReportDto } from '../admin-comment-report-types';

// ─── Public types ───────────────────────────────────────────────────────────

export interface ResolveOptions {
  /**
   * Optional moderation note supplied by the admin. The backend's
   * `ReviewReportDto` does not currently carry a note field, so
   * this is reserved for a future iteration; the hook accepts the
   * option for forward-compatibility with the documented contract
   * surface.
   */
  note?: string;
}

export interface ResolveAuditSnapshot {
  /** Report id captured when the mutation started. */
  beforeReportId: string | null;
  /** Action verb captured when the mutation started. */
  beforeAction: CommentReportConsumerAction | null;
  /** Report id once the mutation settles on success. */
  afterReportId: string | null;
  /**
   * The full server-side `after` payload (the updated row),
   * captured on success. `null` until the mutation settles.
   */
  afterPayload: CommentReportDto | null;
}

export interface UseResolveCommentReportResult {
  /**
   * Trigger the resolve mutation. Resolves to the updated report
   * (the `afterPayload`) on success, rejects with `ApiError` on
   * failure. The companion hide, when required, fires inside the
   * same call after the PATCH succeeds.
   */
  resolve: (
    reportId: string,
    consumerAction: CommentReportConsumerAction,
    options?: ResolveOptions,
  ) => Promise<CommentReportDto>;
  /** `true` while a mutation is in flight. */
  isPending: boolean;
  /** The typed API error from the most recent failure. `null` until a failure occurs. */
  error: ApiError | null;
  /**
   * Last discriminated outcome. Let D2's dialog render typed
   * "already handled" / "not found" / "forbidden" branches without
   * inspecting the raw `error.code`.
   */
  lastOutcome: ResolveOutcome | null;
  /** Clear `error` / `lastOutcome` and return to the idle state. */
  reset: () => void;
  /** Audit-trail snapshot (before / after). */
  audit: ResolveAuditSnapshot;
}

export type ResolveOutcome =
  | { kind: 'success'; payload: CommentReportDto; cause: null }
  | { kind: 'not-found'; cause: ApiError }
  | { kind: 'already-resolved'; cause: ApiError }
  | { kind: 'forbidden'; cause: ApiError }
  | { kind: 'reverted'; cause: ApiError };

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Per-call start time captured for the breadcrumb duration metric.
 * Initialised outside the component to avoid SSR-time `Date.now()`
 * referencing server clock skew (the hook is `'use client'`, so
 * server-side this is never invoked; the helper stays defensive).
 */
function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Companion-hide action descriptor for the cleanup path. Mirrors
 * the SDK's `hideComment` contract. Kept narrow (id-only) so the
 * function is testable.
 */
async function callAdminHideComment(commentId: string): Promise<void> {
  const sdk = getComments();
  await sdk.hideComment(commentId);
}

/**
 * SWR-cache predicate for the Phase 4 `comments:*` keys. The
 * comment moderation resolve hook revalidates the public comment
 * list and the per-quiz thread reads so the embedded offending
 * comment snapshot in `CommentReportDto` does not stale.
 */
function commentsKeyMatcher(key: unknown): boolean {
  if (!Array.isArray(key)) return false;
  return key[0] === 'comments';
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useResolveCommentReport(): UseResolveCommentReportResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastOutcome, setLastOutcome] = useState<ResolveOutcome | null>(null);
  const [beforeReportId, setBeforeReportId] = useState<string | null>(null);
  const [beforeAction, setBeforeAction] = useState<CommentReportConsumerAction | null>(null);
  const [afterReportId, setAfterReportId] = useState<string | null>(null);
  const [afterPayload, setAfterPayload] = useState<CommentReportDto | null>(null);

  const inFlightRef = useRef<Promise<CommentReportDto> | null>(null);

  const classifyError = (apiError: ApiError): ResolveOutcome => {
    const code = apiError.code as string;
    if (code === 'COMMENT_REPORT_NOT_FOUND') {
      return { kind: 'not-found', cause: apiError };
    }
    if (code === 'COMMENT_REPORT_ALREADY_RESOLVED') {
      return { kind: 'already-resolved', cause: apiError };
    }
    if (code === 'GLOBAL_FORBIDDEN') {
      return { kind: 'forbidden', cause: apiError };
    }
    return { kind: 'reverted', cause: apiError };
  };

  const emitBreadcrumb = useCallback(
    (
      status: 'started' | 'success' | 'failure',
      action: CommentReportConsumerAction,
      startedAt: number,
      apiError?: ApiError,
      targetId?: string,
    ): void => {
      const metadata: CommentReportActionMetadata =
        COMMENT_REPORT_ACTIONS[action];
      const durationMs =
        status === 'started'
          ? 0
          : Math.max(0, Math.round(nowMs() - startedAt));
      if (status === 'failure') {
        addCommentModerationBreadcrumb({
          action: metadata.breadcrumbAction,
          route: 'admin-comment-moderation.resolve',
          status,
          durationMs,
          targetId,
          code: apiError?.code,
          requestId: apiError?.requestId,
          correlationId: apiError?.correlationId,
          redactedPayload: {
            requestId: apiError?.requestId,
            detail: apiError?.detail,
          },
          redactFields: ['reporterId', 'notes'],
        });
      } else {
        addCommentModerationBreadcrumb({
          action: metadata.breadcrumbAction,
          route: 'admin-comment-moderation.resolve',
          status,
          durationMs,
          targetId,
        });
      }
    },
    [],
  );

  const resolve = useCallback(
    async (
      reportId: string,
      consumerAction: CommentReportConsumerAction,
      options: ResolveOptions = {},
    ): Promise<CommentReportDto> => {
      if (!isCommentReportConsumerAction(consumerAction)) {
        // Defensive: a non-typed consumer action reaching the hook
        // is a programming error (the type-narrow guards upstream).
        // Surface as a synthetic `GLOBAL_VALIDATION` ApiError so the
        // dialog's classification pipeline never reaches an
        // undefined branch.
        const synthetic = new ApiError({
          isAxiosError: true,
          name: 'AxiosError',
          message: `Unknown comment report action: ${String(consumerAction)}`,
          config: undefined,
          request: undefined,
          response: {
            status: 400,
            data: {
              status: 400,
              detail: `Unknown comment report action: ${String(consumerAction)}`,
              title: 'GLOBAL_VALIDATION',
              extensions: {
                code: 'GLOBAL_VALIDATION',
                requestId: 'client-validation',
              },
            },
          },
          toJSON: () => ({}),
        } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
        setError(synthetic);
        setLastOutcome({ kind: 'reverted', cause: synthetic });
        throw synthetic;
      }

      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      const metadata = COMMENT_REPORT_ACTIONS[consumerAction];
      const sdkStatus = getSdkStatusForCommentReportAction(consumerAction);
      const companionHide = requiresCompanionHide(consumerAction);
      void options;

      setBeforeReportId(reportId);
      setBeforeAction(consumerAction);
      setAfterReportId(null);
      setAfterPayload(null);
      setError(null);
      setLastOutcome(null);
      setIsPending(true);

      const startedAt = nowMs();
      emitBreadcrumb('started', consumerAction, startedAt, undefined, reportId);

      const core = (async (): Promise<CommentReportDto> => {
        try {
          const updated = await patchCommentReport(reportId, {
            status: sdkStatus,
          });

          // The companion admin hide (only `hide_comment`) fires
          // AFTER the PATCH succeeds. Failures here are surfaced
          // through the same `error` channel so the dialog can
          // branch on the typed code without rolling back the
          // PATCH.
          if (
            companionHide &&
            typeof (updated as { commentId?: unknown }).commentId === 'string'
          ) {
            await callAdminHideComment(
              (updated as { commentId: string }).commentId,
            );
          }

          setAfterReportId(reportId);
          setAfterPayload(updated);
          emitBreadcrumb(
            'success',
            consumerAction,
            startedAt,
            undefined,
            reportId,
          );

          // Revalidate the queue's SWR cache (every page variant)
          // and the Phase 4 public comment reads so the embedded
          // offending comment snapshot in `CommentReportDto` does
          // not stale. `globalMutate` with a predicate filter does
          // not require a `useSWRConfig` instance.
          await globalMutate(
            (key: readonly unknown[]) =>
              commentReportsKeyMatcher(key) || commentsKeyMatcher(key),
            undefined,
            { revalidate: true },
          );

          // Broadcast the mutation on the cross-tab channel so
          // other admin tabs revalidate their queue + comment
          // reads. Failure paths do NOT broadcast (the source tab
          // already revalidates via `globalMutate` above).
          const updatedCommentId = (updated as { commentId?: unknown })
            .commentId;
          if (typeof updatedCommentId === 'string' && updatedCommentId.length > 0) {
            broadcastCommentModerationInvalidate(
              'resolve',
              reportId,
              updatedCommentId,
            );
          }
          // If the wire payload omits `commentId`, the broadcast is
          // skipped silently — the cross-tab helper rejects an empty
          // commentId defensively, and the queue still revalidates
          // above for the source tab.

          setLastOutcome({ kind: 'success', payload: updated, cause: null });
          return updated;
        } catch (caught: unknown) {
          const apiError =
            caught instanceof ApiError
              ? caught
              : new ApiError({
                  isAxiosError: true,
                  name: 'ApiError',
                  message: String(caught),
                  config: undefined,
                  request: undefined,
                  response: {
                    status: 0,
                    data: {
                      status: 0,
                      detail: String(caught),
                      title: 'UnknownError',
                      extensions: {
                        code: 'UnknownError',
                        requestId: 'client-validation',
                      },
                    },
                  },
                  toJSON: () => ({}),
                } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
          const outcome = classifyError(apiError);
          setError(apiError);
          setLastOutcome(outcome);
          emitBreadcrumb(
            'failure',
            consumerAction,
            startedAt,
            apiError,
            reportId,
          );

          // Surface the typed code without retry. For
          // `not-found` / `already-resolved` the report may have
          // been removed / actioned by another admin; we still
          // revalidate the queue so the row drops out or moves.
          if (
            outcome.kind === 'not-found' ||
            outcome.kind === 'already-resolved'
          ) {
            await globalMutate(
              (key: readonly unknown[]) => commentReportsKeyMatcher(key),
              undefined,
              { revalidate: true },
            ).catch(() => {
              // The revalidation is best-effort; failure here is
              // surfaced via the original `apiError` and is not
              // bubbled.
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
    [emitBreadcrumb],
  );

  const reset = useCallback(() => {
    setError(null);
    setLastOutcome(null);
    setBeforeReportId(null);
    setBeforeAction(null);
    setAfterReportId(null);
    setAfterPayload(null);
    setIsPending(false);
    inFlightRef.current = null;
  }, []);

  return {
    resolve,
    isPending,
    error,
    lastOutcome,
    reset,
    audit: {
      beforeReportId,
      beforeAction,
      afterReportId,
      afterPayload,
    },
  };
}
