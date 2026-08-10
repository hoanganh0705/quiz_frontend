'use client';

/**
 * `useHideComment` / `useRestoreComment` — comment-moderation
 * visibility-flip hooks.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.C3.
 *
 * ## What these hooks own
 *
 * - Wrap the SDK's `hideComment` / `restoreComment` (TKT-7.1.E4)
 *   with SWR cache invalidation and Phase 7 audit breadcrumbs.
 * - On success, invalidate every page of the queue, the affected
 *   comment's read SWR keys (`comments:*`, `comments:byId:*`), and
 *   the thread caches containing the affected comment.
 * - On success, broadcast a `admin:7.1.comment-moderation.invalidate`
 *   event on the cross-tab channel (Batch G — forthcoming).
 *
 * ## Idempotency contracts
 *
 * The SDK endpoints are documented as idempotent on the wire but
 * the backend returns:
 *
 *   - `COMMENT_ALREADY_HIDDEN` (409) on `hideComment` if the row
 *     is already hidden.
 *   - `COMMENT_NOT_HIDDEN` (409) on `restoreComment` if the row is
 *     not hidden.
 *   - `GLOBAL_FORBIDDEN` (403) if the admin lacks the permission.
 *
 * The hook classifies each by `error.code`. The helpful codes
 * `COMMENT_ALREADY_HIDDEN`, `COMMENT_NOT_HIDDEN`, and
 * `COMMENT_NOT_FOUND` are not yet members of the global `ErrorCode`
 * union (TKT-7.6.A1 noted the same gap for
 * `COMMENT_REPORT_ALREADY_RESOLVED`); the discriminator narrows
 * defensively via a `string`-cast before the comparison. The hook
 * does NOT compensate (no retry, no second PATCH) — it surfaces
 * the typed code to the dialog so the operator can re-fetch and
 * retry.
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
 * `action` is the documented stable string for the consumer-side
 * action (`b.admin.comment_moderation.hide` /
 * `b.admin.comment_moderation.restore`). `targetId` is the comment
 * id. `redactFields` covers reporter id, thread id, and
 * moderation notes.
 *
 * ## Why two hooks (not a single `useToggleCommentVisibility`)
 *
 * The ticket plan calls out that D3's dialogs render typed
 * copy keyed on the action verb. Sharing one hook would force
 * the dialog to branch on a flag param; two hooks let the
 * dialog reference the typed `useHideComment` / `useRestoreComment`
 * without conditional prop construction. The shared invalidation
 * logic still lives in a private helper below.
 */

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError } from '@/lib/api';
import { addCommentModerationBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
  hideComment,
  restoreComment,
} from '@/features/admin/services/comment-moderation.service';
import {
  broadcastCommentModerationInvalidate,
} from '../cache/comment-moderation-cross-tab';
import { commentReportsKeyMatcher } from './useCommentReports';
import { commentIdKeyMatcher } from './commentIdKeys';

// ─── Public types ───────────────────────────────────────────────────────────

/** Reason captured for the audit trail. Free-form, default empty. */
export interface CommentVisibilityOptions {
  reason?: string;
}

export interface UseHideCommentResult {
  hide: (
    commentId: string,
    options?: CommentVisibilityOptions,
  ) => Promise<unknown>;
  isPending: boolean;
  error: ApiError | null;
  lastOutcome: HideCommentOutcome | null;
  reset: () => void;
  audit: { beforeCommentId: string | null; afterCommentId: string | null };
}

export interface UseRestoreCommentResult {
  restore: (
    commentId: string,
    options?: CommentVisibilityOptions,
  ) => Promise<unknown>;
  isPending: boolean;
  error: ApiError | null;
  lastOutcome: RestoreCommentOutcome | null;
  reset: () => void;
  audit: { beforeCommentId: string | null; afterCommentId: string | null };
}

export type HideCommentOutcome =
  | { kind: 'success'; payload: unknown; cause: null }
  | { kind: 'already-hidden'; cause: ApiError }
  | { kind: 'not-found'; cause: ApiError }
  | { kind: 'forbidden'; cause: ApiError }
  | { kind: 'reverted'; cause: ApiError };

export type RestoreCommentOutcome =
  | { kind: 'success'; payload: unknown; cause: null }
  | { kind: 'not-hidden'; cause: ApiError }
  | { kind: 'not-found'; cause: ApiError }
  | { kind: 'forbidden'; cause: ApiError }
  | { kind: 'reverted'; cause: ApiError };

// ─── Documented stable code constants ──────────────────────────────────────

/**
 * Documented stable error codes emitted by the SDK `hideComment`
 * and `restoreComment` endpoints. These constants are kept locally
 * because the global `ErrorCode` union does not yet include the
 * three comment-side codes (TKT-7.6.A1). The hook classifies by
 * `error.code` against these strings.
 */
const COMMENT_ALREADY_HIDDEN = 'COMMENT_ALREADY_HIDDEN';
const COMMENT_NOT_HIDDEN = 'COMMENT_NOT_HIDDEN';
const COMMENT_NOT_FOUND = 'COMMENT_NOT_FOUND';
const GLOBAL_FORBIDDEN = 'GLOBAL_FORBIDDEN';

// ─── Helpers ────────────────────────────────────────────────────────────────

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/**
 * Revalidate the queue's SWR cache (every page variant) and the
 * affected comment's read SWR keys. The cross-tab broadcast lives
 * in Batch G (forthcoming); the hook leaves the dispatch surface
 * stable so the cross-tab helper can plug in without re-rendering.
 */
async function revalidateAfterVisibilityFlip(
  commentId: string,
): Promise<void> {
  await globalMutate(
    (key: readonly unknown[]) =>
      commentReportsKeyMatcher(key) ||
      commentIdKeyMatcher(key, commentId) ||
      arrayStartsWith(key, 'comments'),
    undefined,
    { revalidate: true },
  );
}

function arrayStartsWith(key: readonly unknown[], prefix: string): boolean {
  return Array.isArray(key) && key[0] === prefix;
}

// ─── Hook factory ───────────────────────────────────────────────────────────

interface MutationHookSharedState<TOutcome> {
  trigger: (commentId: string, options?: CommentVisibilityOptions) => Promise<unknown>;
  isPending: boolean;
  error: ApiError | null;
  lastOutcome: TOutcome | null;
  reset: () => void;
  audit: { beforeCommentId: string | null; afterCommentId: string | null };
}

interface MutationHookArgs<TOutcome> {
  verb: 'hide_comment' | 'restore_comment';
  breadcrumbAction: string;
  doMutate: (commentId: string) => Promise<unknown>;
  classify: (apiError: ApiError) => TOutcome;
  failureCodesForRevalidation: readonly string[];
}

function useCommentVisibilityMutation<TOutcome>({
  verb,
  breadcrumbAction,
  doMutate,
  classify,
  failureCodesForRevalidation,
}: MutationHookArgs<TOutcome>): MutationHookSharedState<TOutcome> {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [lastOutcome, setLastOutcome] = useState<TOutcome | null>(null);
  const [beforeCommentId, setBeforeCommentId] = useState<string | null>(null);
  const [afterCommentId, setAfterCommentId] = useState<string | null>(null);

  const inFlightRef = useRef<Promise<unknown> | null>(null);

  const emitBreadcrumb = useCallback(
    (
      status: 'started' | 'success' | 'failure',
      startedAt: number,
      apiError?: ApiError,
      targetId?: string,
    ): void => {
      const durationMs =
        status === 'started'
          ? 0
          : Math.max(0, Math.round(nowMs() - startedAt));
      if (status === 'failure') {
        addCommentModerationBreadcrumb({
          action: breadcrumbAction,
          route: `admin-comment-moderation.${verb}`,
          status,
          durationMs,
          targetId,
          code: apiError?.code,
          requestId: apiError?.requestId,
          correlationId: apiError?.correlationId,
          redactedPayload: {
            code: apiError?.code,
            detail: apiError?.detail,
          },
          redactFields: ['reporterId', 'threadId', 'notes'],
        });
      } else {
        addCommentModerationBreadcrumb({
          action: breadcrumbAction,
          route: `admin-comment-moderation.${verb}`,
          status,
          durationMs,
          targetId,
        });
      }
    },
    [breadcrumbAction, verb],
  );

  const trigger = useCallback(
    async (
      commentId: string,
      options: CommentVisibilityOptions = {},
    ): Promise<unknown> => {
      void options;
      if (inFlightRef.current !== null) return inFlightRef.current;

      setBeforeCommentId(commentId);
      setAfterCommentId(null);
      setError(null);
      setLastOutcome(null);
      setIsPending(true);

      const startedAt = nowMs();
      emitBreadcrumb('started', startedAt, undefined, commentId);

      const core = (async (): Promise<unknown> => {
        try {
          const updated = await doMutate(commentId);
          setAfterCommentId(commentId);
          emitBreadcrumb('success', startedAt, undefined, commentId);
          await revalidateAfterVisibilityFlip(commentId);
          // Broadcast the mutation on the cross-tab channel so
          // other admin tabs revalidate their queue + comment
          // reads. Failure paths do NOT broadcast.
          broadcastCommentModerationInvalidate(
            verb === 'hide_comment' ? 'hide' : 'restore',
            undefined,
            commentId,
          );
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
          setError(apiError);
          setLastOutcome(classify(apiError));
          emitBreadcrumb('failure', startedAt, apiError, commentId);
          if (failureCodesForRevalidation.includes(apiError.code)) {
            await revalidateAfterVisibilityFlip(commentId).catch(() => {
              // Best-effort revalidation; failure does not override
              // the original `apiError`.
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
    [emitBreadcrumb, classify, doMutate, failureCodesForRevalidation],
  );

  const reset = useCallback(() => {
    setError(null);
    setLastOutcome(null);
    setBeforeCommentId(null);
    setAfterCommentId(null);
    setIsPending(false);
    inFlightRef.current = null;
  }, []);

  return {
    trigger,
    isPending,
    error,
    lastOutcome,
    reset,
    audit: { beforeCommentId, afterCommentId },
  };
}

// ─── Hooks (public surface) ─────────────────────────────────────────────────

const HIDE_BREADCRUMB_ACTION = 'b.admin.comment_moderation.hide';
const RESTORE_BREADCRUMB_ACTION = 'b.admin.comment_moderation.restore';

const HIDE_FAILURE_CODES: readonly string[] = Object.freeze([
  COMMENT_ALREADY_HIDDEN,
  COMMENT_NOT_FOUND,
  GLOBAL_FORBIDDEN,
]);

const RESTORE_FAILURE_CODES: readonly string[] = Object.freeze([
  COMMENT_NOT_HIDDEN,
  COMMENT_NOT_FOUND,
  GLOBAL_FORBIDDEN,
]);

export function useHideComment(): UseHideCommentResult {
  const inner = useCommentVisibilityMutation<HideCommentOutcome>({
    verb: 'hide_comment',
    breadcrumbAction: HIDE_BREADCRUMB_ACTION,
    doMutate: async (commentId) => hideComment(commentId, {}),
    classify: (apiError) => {
      const code = apiError.code as string;
      if (code === COMMENT_ALREADY_HIDDEN) {
        return { kind: 'already-hidden', cause: apiError };
      }
      if (code === COMMENT_NOT_FOUND) {
        return { kind: 'not-found', cause: apiError };
      }
      if (code === GLOBAL_FORBIDDEN) {
        return { kind: 'forbidden', cause: apiError };
      }
      return { kind: 'reverted', cause: apiError };
    },
    failureCodesForRevalidation: HIDE_FAILURE_CODES,
  });

  const hide = useCallback(
    async (
      commentId: string,
      options?: CommentVisibilityOptions,
    ): Promise<unknown> => {
      return inner.trigger(commentId, options);
    },
    [inner],
  );

  return {
    hide,
    isPending: inner.isPending,
    error: inner.error,
    lastOutcome: inner.lastOutcome,
    reset: inner.reset,
    audit: inner.audit,
  };
}

export function useRestoreComment(): UseRestoreCommentResult {
  const inner = useCommentVisibilityMutation<RestoreCommentOutcome>({
    verb: 'restore_comment',
    breadcrumbAction: RESTORE_BREADCRUMB_ACTION,
    doMutate: async (commentId) => restoreComment(commentId, {}),
    classify: (apiError) => {
      const code = apiError.code as string;
      if (code === COMMENT_NOT_HIDDEN) {
        return { kind: 'not-hidden', cause: apiError };
      }
      if (code === COMMENT_NOT_FOUND) {
        return { kind: 'not-found', cause: apiError };
      }
      if (code === GLOBAL_FORBIDDEN) {
        return { kind: 'forbidden', cause: apiError };
      }
      return { kind: 'reverted', cause: apiError };
    },
    failureCodesForRevalidation: RESTORE_FAILURE_CODES,
  });

  const restore = useCallback(
    async (
      commentId: string,
      options?: CommentVisibilityOptions,
    ): Promise<unknown> => inner.trigger(commentId, options),
    [inner],
  );

  return {
    restore,
    isPending: inner.isPending,
    error: inner.error,
    lastOutcome: inner.lastOutcome,
    reset: inner.reset,
    audit: inner.audit,
  };
}
