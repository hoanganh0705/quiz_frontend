'use client';

/**
 * `useComment` — single-comment read hook.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.C4.
 *
 * ## What this hook owns
 *
 * - Wraps the SDK's `getComment` (Phase 4 — `lib/api`) with an SWR
 *   cache keyed at `comments:byId:${commentId}` (the Phase 4
 *   namespace) so the moderation queue's "open in context" affordance
 *   (Batch H, forthcoming) can share the same read.
 * - Mirrors the public comment shape from the SDK so the consumer
 *   never has to import the SDK directly. The shape is forwarded
 *   untouched; the comment moderation layer treats the comment as a
 *   read-only object.
 *
 * ## Why this hook exists
 *
 * The moderation queue surfaces the offending comment in the
 * detail drawer. The drawer may not be co-located with the row
 * that triggered the open — the comment is fetched ahead of the
 * drawer's mount. The queue's row supplies the comment id; the
 * drawer mounts the hook against that id and the SWR cache
 * populates the payload without a second network round-trip if the
 * read is shared with the public comment page.
 *
 * ## Error contract
 *
 * The hook surfaces the documented stable codes:
 *
 *   - `COMMENT_NOT_FOUND` (404) — the row was deleted between the
 *     queue listing and the drawer mount.
 *   - `GLOBAL_FORBIDDEN` (403) — the admin lacks the permission
 *     (Phase 7 admin comment read).
 *   - any other typed code is surfaced verbatim.
 *
 * No automatic retry on `COMMENT_NOT_FOUND` (terminal).
 *
 * ## Audit trail
 *
 * The hook does NOT emit breadcrumbs: it is a read, not a
 * mutation. The Phase 7 Sentry helper is reserved for the
 * mutation hooks (C1–C3) and the resolve-action hooks (D1).
 *
 * ## Validation
 *
 * The hook validates the `commentId` via `validateCommentId`
 * (TKT-7.6.B3) before any network call. An invalid id shortcuts
 * to the typed `COMMENT_NOT_FOUND` outcome (the documented
 * decision: a malformed id is indistinguishable from "no such
 * row" from the user's perspective).
 */

import { useCallback, useMemo } from 'react';

import useSWR from 'swr';

import { ApiError, getComments } from '@/lib/api';

import { commentIdKey, commentIdKeyMatcher } from './commentIdKeys';
import { validateCommentId } from '../comment-id-validation';

// ─── Public types ───────────────────────────────────────────────────────────

export interface UseCommentParams {
  /** The comment id to fetch. */
  commentId: string;
  /** Disable the fetch when the caller already knows the row is gone. */
  enabled?: boolean;
}

export interface UseCommentResult {
  comment: unknown | null;
  isLoading: boolean;
  error: ApiError | null;
  outcome: 'pending' | 'success' | 'not-found' | 'forbidden' | 'reverted';
  refresh: () => Promise<unknown>;
  mutate: (next: unknown | ((prev: unknown | null) => unknown)) => Promise<unknown>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeNotFoundError(): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: 'COMMENT_NOT_FOUND',
    config: undefined,
    request: undefined,
    response: {
      status: 404,
      data: {
        status: 404,
        detail: 'COMMENT_NOT_FOUND',
        title: 'COMMENT_NOT_FOUND',
        extensions: {
          code: 'COMMENT_NOT_FOUND',
          requestId: 'client-validation',
        },
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

function classifyError(apiError: ApiError): UseCommentResult['outcome'] {
  const code = apiError.code;
  if (code === 'COMMENT_NOT_FOUND') return 'not-found';
  if (code === 'GLOBAL_FORBIDDEN') return 'forbidden';
  return 'reverted';
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useComment(params: UseCommentParams): UseCommentResult {
  const { commentId, enabled = true } = params;

  const isValid = useMemo(
    () => validateCommentId(commentId).ok,
    [commentId],
  );

  const key = useMemo<readonly unknown[] | null>(() => {
    if (!enabled) return null;
    if (!isValid) return null;
    return commentIdKey(commentId);
  }, [enabled, isValid, commentId]);

  const fetcher = useCallback(async (id: string): Promise<unknown> => {
    const sdk = getComments();
    return sdk.getComment(id);
  }, []);

  const swr = useSWR<unknown, ApiError>(
    key,
    async () => {
      if (!isValid) {
        throw makeNotFoundError();
      }
      return fetcher(commentId);
    },
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  const outcome: UseCommentResult['outcome'] = useMemo(() => {
    // Invalid id shortcuts to `not-found` synchronously. SWR is
    // in the idle state when `key` is null, so the typed error
    // path needs to be handled above SWR's pill of state.
    if (!isValid) return 'not-found';
    if (!enabled) return 'pending';
    if (!swr.error) {
      return swr.data === undefined ? 'pending' : 'success';
    }
    return classifyError(swr.error);
  }, [isValid, enabled, swr.error, swr.data]);

  const refresh = useCallback(async () => {
    if (!isValid) return makeNotFoundError();
    const sdk = getComments();
    const next = await sdk.getComment(commentId);
    // Push the freshly fetched row into the SWR cache so the
    // `comment` field reflects the new payload on the next render.
    await swr.mutate(next as never);
    return next;
  }, [isValid, commentId, swr]);

  const mutate = useCallback(
    async (
      next: unknown | ((prev: unknown | null) => unknown),
    ): Promise<unknown> => {
      return swr.mutate(next as never) as Promise<unknown>;
    },
    [swr],
  );

  return {
    comment: swr.data ?? null,
    isLoading: swr.isLoading,
    error: swr.error ?? null,
    outcome,
    refresh,
    mutate,
  };
}

// Local re-export to keep the matcher reachable for tests that
// import the hook directly. The matcher is itself exported from
// `commentIdKeys`; this re-export is a no-op and documents intent.
export { commentIdKeyMatcher };
