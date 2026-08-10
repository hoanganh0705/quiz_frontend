'use client';

/**
 * `useResolveReviewReport` — review-moderation resolve mutation hook.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.C2.
 *
 * ## What this hook owns
 *
 * - Wraps `patchReviewReport` (TKT-7.1.E3) and the companion
 *   `adminReviewControllerAdminDeleteReview` (the SDK-side admin
 *   review delete) with SWR cache invalidation and Phase 7 audit
 *   breadcrumbs.
 * - Maps the consumer-side action vocabulary (`dismiss`,
 *   `acknowledge`, `mark_resolved`, `hide_review`, `delete_review` —
 *   TKT-7.5.B2) onto the SDK `status` value (`reviewed` |
 *   `dismissed` | `actioned`). For `delete_review`, additionally
 *   issues the companion admin DELETE (per the action catalogue's
 *   `requiresCompanionDelete` flag).
 * - On success, invalidates every page of the queue (the
 *   `reviewReportsKeyMatcher` from TKT-7.5.C1) and the offending
 *   review's read SWR keys (`reviews:*`, `reviews:byId:*`).
 * - On success, broadcasts a `admin:7.1.review-moderation.invalidate`
 *   event on the cross-tab channel (TKT-7.5.G2) so other admin tabs
 *   invalidate the same SWR keys. Failure paths do NOT broadcast.
 *
 * ## Error contract
 *
 * `patchReviewReport` surfaces `REVIEW_NOT_FOUND` / `GLOBAL_FORBIDDEN`
 * (per the live SDK contract — see `EPIC_7_5_A1.md` §5). The planning
 * ticket references `REVIEW_REPORT_ALREADY_RESOLVED` /
 * `REVIEW_REPORT_NOT_FOUND` / `PERMISSION_DENIED`; the divergence was
 * resolved in favour of the live backend shape. The hook surfaces every
 * `ApiError` with `code` intact so the dialog (TKT-7.5.D2) can branch
 * on it; no automatic retry.
 *
 * ## Audit trail
 *
 * Each call emits:
 *
 *   - `addReviewModerationBreadcrumb({ status: 'started' })`
 *     on enter;
 *   - `addReviewModerationBreadcrumb({ status: 'success', durationMs })`
 *     on resolve;
 *   - `addReviewModerationBreadcrumb({ status: 'failure', code,
 *     requestId, correlationId })` on rejection.
 *
 * The breadcrumb `action` is the documented stable string for the
 * consumer-side action (per `REPORT_ACTIONS[action].breadcrumbAction`).
 * `targetId` is the report id; `redactFields` covers reporter id and
 * moderation notes.
 *
 * ## Audit-snapshot return value
 *
 * The hook exposes an `audit` handle carrying the captured `before`
 * (redacted copy of the report at the moment the mutation starts) and
 * the post-resolution `after` payload. Destructive UI surfaces
 * (TKT-7.5.D2) render this via `AuditActionShell` (TKT-7.1.C3); the
 * hook itself emits per-action breadcrumbs so the dialog remains
 * free of side-effects.
 *
 * ## Companion-delete path (`delete_review`)
 *
 * The hook submits the status PATCH first, then the companion admin
 * DELETE. Both calls log their own breadcrumbs. If the PATCH succeeds
 * and the DELETE fails, the report is closed (`status: 'actioned'`)
 * but the review still exists; the resolver's UI surfaces the typed
 * code so the operator can retry. The hook does NOT compensate — that
 * decision belongs to a future Phase 7 follow-up ticket.
 */

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError, getReviews } from '@/lib/api';
import { addReviewModerationBreadcrumb } from '@/lib/admin/admin_live_sentry';

import { patchReviewReport } from '@/features/admin/services/review-moderation.service';
import {
  reviewReportsKeyMatcher,
} from './useReviewReports';
import {
  REPORT_ACTIONS,
  getSdkStatusForAction,
  isReportConsumerAction,
  requiresCompanionDelete,
  type ReportConsumerAction,
  type ReportActionMetadata,
} from '../action-enum';
import {
  type AdminReportDto,
  type ReportAction,
} from '../admin-report-types';
import {
  broadcastReviewModerationInvalidate,
} from '../cache/review-moderation-cross-tab';

// ─── Public types ───────────────────────────────────────────────────────────

export interface ResolveOptions {
  /**
   * Optional moderation note supplied by the admin. The backend's
   * `UpdateReportStatusDto` does not currently carry a note field,
   * so this is reserved for a future iteration; the hook accepts
   * the option for forward-compatibility with the documented
   * contract surface.
   */
  note?: string;
}

export interface ResolveAuditSnapshot {
  /** Report id captured when the mutation started. */
  beforeReportId: string | null;
  /** Action verb captured when the mutation started. */
  beforeAction: ReportConsumerAction | null;
  /** Report id once the mutation settles on success. */
  afterReportId: string | null;
  /**
   * The full server-side `after` payload (the updated row),
   * captured on success. `null` until the mutation settles.
   */
  afterPayload: AdminReportDto | null;
}

export interface UseResolveReviewReportResult {
  /**
   * Trigger the resolve mutation. Resolves to the updated report
   * (the `afterPayload`) on success, rejects with `ApiError` on
   * failure. The companion DELETE, when required, fires inside the
   * same call after the PATCH succeeds.
   */
  resolve: (
    reportId: string,
    consumerAction: ReportConsumerAction,
    options?: ResolveOptions,
  ) => Promise<AdminReportDto>;
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
  | { kind: 'success'; payload: AdminReportDto; cause: null }
  | { kind: 'not-found'; cause: ApiError }
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
 * Companion-delete action descriptor for the cleanup path.
 * Mirrors the SDK's `adminReviewControllerAdminDeleteReview` contract.
 * Kept narrow (id-only) so the function is testable.
 */
async function callAdminDeleteReview(reviewId: string): Promise<void> {
  const sdk = getReviews();
  await sdk.adminReviewControllerAdminDeleteReview(reviewId);
}

/**
 * SWR-cache predicate for the Phase 4 `reviews:*` and
 * `reviews:byId:*` keys. The review moderation resolve hook
 * revalidates the public quiz review list and the per-quiz
 * by-review-id reads so the embedded offending review snapshot in
 * `AdminReportDto` does not stale.
 */
function reviewsKeyMatcher(key: unknown): boolean {
  if (!Array.isArray(key)) return false;
  return key[0] === 'reviews';
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useResolveReviewReport(): UseResolveReviewReportResult {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastOutcome, setLastOutcome] = useState<ResolveOutcome | null>(null);
  const [beforeReportId, setBeforeReportId] = useState<string | null>(null);
  const [beforeAction, setBeforeAction] = useState<ReportConsumerAction | null>(null);
  const [afterReportId, setAfterReportId] = useState<string | null>(null);
  const [afterPayload, setAfterPayload] = useState<AdminReportDto | null>(null);

  const inFlightRef = useRef<Promise<AdminReportDto> | null>(null);

  const classifyError = (apiError: ApiError): ResolveOutcome => {
    const code = apiError.code;
    if (code === 'REVIEW_NOT_FOUND') {
      return { kind: 'not-found', cause: apiError };
    }
    if (code === 'GLOBAL_FORBIDDEN') {
      return { kind: 'forbidden', cause: apiError };
    }
    return { kind: 'reverted', cause: apiError };
  };

  const emitBreadcrumb = useCallback(
    (
      status: 'started' | 'success' | 'failure',
      action: ReportConsumerAction,
      startedAt: number,
      apiError?: ApiError,
      targetId?: string,
    ): void => {
      const metadata: ReportActionMetadata = REPORT_ACTIONS[action];
      const durationMs =
        status === 'started'
          ? 0
          : Math.max(0, Math.round(nowMs() - startedAt));
      if (status === 'failure') {
        addReviewModerationBreadcrumb({
          action: metadata.breadcrumbAction,
          route: 'admin-review-moderation.resolve',
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
        addReviewModerationBreadcrumb({
          action: metadata.breadcrumbAction,
          route: 'admin-review-moderation.resolve',
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
      consumerAction: ReportConsumerAction,
      options: ResolveOptions = {},
    ): Promise<AdminReportDto> => {
      if (!isReportConsumerAction(consumerAction)) {
        // Defensive: a non-typed consumer action reaching the hook
        // is a programming error (the type-narrow guards upstream).
        // Surface as a synthetic `GLOBAL_VALIDATION` ApiError so the
        // dialog's classification pipeline never reaches an
        // undefined branch.
        const synthetic = new ApiError({
          isAxiosError: true,
          name: 'AxiosError',
          message: `Unknown report action: ${String(consumerAction)}`,
          config: undefined,
          request: undefined,
          response: {
            status: 400,
            data: {
              status: 400,
              detail: `Unknown report action: ${String(consumerAction)}`,
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

      const metadata = REPORT_ACTIONS[consumerAction];
      const sdkStatus: ReportAction = getSdkStatusForAction(consumerAction);
      const companionDelete = requiresCompanionDelete(consumerAction);

      setBeforeReportId(reportId);
      setBeforeAction(consumerAction);
      setAfterReportId(null);
      setAfterPayload(null);
      setError(null);
      setLastOutcome(null);
      setIsPending(true);

      const startedAt = nowMs();
      emitBreadcrumb('started', consumerAction, startedAt, undefined, reportId);

      const core = (async (): Promise<AdminReportDto> => {
        try {
          const updated = await patchReviewReport(reportId, { status: sdkStatus });

          // The companion admin DELETE (only `delete_review`) fires
          // AFTER the PATCH succeeds. Failures here are surfaced
          // through the same `error` channel so the dialog can
          // branch on the typed code without rolling back the
          // PATCH.
          if (
            companionDelete &&
            typeof (updated as { reviewId?: unknown }).reviewId === 'string'
          ) {
            await callAdminDeleteReview(
              (updated as { reviewId: string }).reviewId,
            );
          }

          setAfterReportId(reportId);
          setAfterPayload(updated);
          emitBreadcrumb('success', consumerAction, startedAt, undefined, reportId);

          // Revalidate the queue's SWR cache (every page variant).
          // `globalMutate` with a predicate filter does not require
          // a `useSWRConfig` instance.
          await globalMutate(
            (key: readonly unknown[]) =>
              reviewReportsKeyMatcher(key) || reviewsKeyMatcher(key),
            undefined,
            { revalidate: true },
          );

          // Cross-tab broadcast (TKT-7.5.G2) — every other admin tab
          // receives the event and invalidates the same SWR keys via
          // the helpers in `review-moderation-cache-keys.ts`. The
          // broadcast only fires on success; failure paths do not
          // imply a successful state to other tabs. The review id
          // is sourced from the updated report's `reviewId` field
          // when present (the backend populates it for every
          // `PlatformReportItemDto`); when absent (a status-only
          // mutation the backend treats as pure), `null` is passed
          // and receiving tabs only invalidate the queue.
          const updatedReviewId = (updated as { reviewId?: unknown })
            .reviewId;
          broadcastReviewModerationInvalidate(
            'resolve',
            reportId,
            typeof updatedReviewId === 'string' ? updatedReviewId : null,
          );

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
          // `not-found` the report may have been removed by another
          // admin; we still revalidate the queue so the row drops
          // out.
          if (outcome.kind === 'not-found') {
            await globalMutate(
              (key: readonly unknown[]) => reviewReportsKeyMatcher(key),
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
