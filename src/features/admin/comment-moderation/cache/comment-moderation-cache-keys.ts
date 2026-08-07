/**
 * `features/admin/comment-moderation/cache/comment-moderation-cache-keys.ts`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.G1.
 *
 * ## Purpose
 *
 * Single source of truth for the SWR cache keys that every comment
 * moderation hook (read + mutation) participates in, plus the
 * invalidation helpers that consumer hooks call. The keys cover:
 *
 *   - the admin cursor list (`commentReports:list:<show>` / array form
 *     `['admin', 'comment-reports', 'list', show]`)
 *   - the affected-comment read (`comments:byId:<commentId>` / array
 *     form `['comments', 'byId', commentId]`)
 *   - the Phase 4 public comment reads (`comments:*` array form —
 *     `['comments', ...]`)
 *   - the comment-thread reads (`['comments', 'thread', threadId]` and
 *     the per-quiz comment list `['comments', 'byQuiz', quizId]`)
 *
 * Every mutation hook (`useResolveCommentReport` / TKT-7.6.C2,
 * `useHideComment` / `useRestoreComment` / TKT-7.6.C3) imports the
 * invalidation helpers from here so the contract is consistent across
 * the hook surface. TKT-7.6.G2 builds on this file to add cross-tab
 * invalidation broadcasts.
 *
 * ## Re-exports
 *
 * `commentReportsKeyMatcher` is re-exported from
 * `hooks/useCommentReports.ts` (TKT-7.6.C1) so a single import line on
 * the consumer side gives callers everything they need to invalidate
 * every page of the queue. `commentIdKeyMatcher` and `commentIdKey`
 * are re-exported from `hooks/commentIdKeys.ts` (TKT-7.6.C3) for the
 * same reason.
 *
 * Both helpers originate in the hook files because they were authored
 * as part of those hooks (TKT-7.6.C1 / C3) and are tested in the
 * per-hook specs. This module centralizes the invalidation calls
 * without duplicating the matcher logic.
 *
 * ## Public-coverage matcher semantics
 *
 * `commentsNamespaceKeyMatcher` (re-exported from
 * `hooks/commentIdKeys.ts`) is the predicate SWR's `mutate(matcher)`
 * form accepts; it covers every Phase 4 public comment read (the
 * leading segment is `'comments'`). The hide / restore hooks call
 * `invalidateCommentById(commentId)` so the affected comment, the
 * per-quiz comment list, and the affected thread all refresh on the
 * next visit.
 *
 * ## Multi-key shape divergence note
 *
 * The planning document originally specified a single
 * `commentReports:list:<show>:<cursor>` string key, but the actual
 * implementation uses the SWR array form
 * `['admin', 'comment-reports', 'list', show]`. The matcher is
 * shape-agnostic — it tests the leading tuple segments so a future
 * switch to a `cursor`-keyed form would still be invalidated by a
 * single helper call.
 */

import { mutate as globalMutate, type ScopedMutator } from 'swr';

import { commentIdKeyMatcher } from '../hooks/commentIdKeys';
import { commentReportsKeyMatcher } from '../hooks/useCommentReports';

// ─── Re-exports ─────────────────────────────────────────────────────────────

/**
 * Re-export the queue matcher. The matcher lives in `useCommentReports.ts`
 * because it was authored as part of TKT-7.6.C1; this module centralizes
 * the consumer-facing invalidation API.
 */
export { commentReportsKeyMatcher, commentIdKeyMatcher };

// ─── Per-comment key ────────────────────────────────────────────────────────

/**
 * Build the SWR cache key for the affected-comment single read.
 *
 * The key is the `commentIdKey` shape produced by the
 * `commentIdKeys.ts` helper (TKT-7.6.C3) — a tuple whose leading
 * segments isolate the Phase 4 public namespace. The helper here is
 * a thin alias so consumers do not need to import `commentIdKey`
 * directly.
 */
export function commentKey(
  commentId: string,
): readonly ['comments', 'byId', string] {
  return ['comments', 'byId', commentId] as const;
}

// ─── Public-coverage matcher ────────────────────────────────────────────────

/**
 * Predicate matched against each cache key. Returns `true` for every
 * entry whose key belongs to the Phase 4 public comment namespace —
 * i.e. the leading segment is `'comments'`.
 *
 * The matcher mirrors the predicate embedded in
 * `commentIdKeys.commentsNamespaceKeyMatcher` so a single global call
 * to `invalidateCommentById` (which doesn't know the quiz id or the
 * thread id) covers every entry — including the per-quiz comment
 * list and the per-thread read.
 */
export function publicCommentsKeyMatcher(key: unknown): boolean {
  if (!Array.isArray(key)) return false;
  return key[0] === 'comments';
}

/**
 * Predicate matching the thread reads specifically. A hide / restore
 * mutation should revalidate every thread containing the comment so
 * the embedded comment body's hidden state is reflected on the next
 * render.
 */
export function commentThreadKeyMatcher(key: unknown): boolean {
  if (!Array.isArray(key)) return false;
  return key[0] === 'comments' && key[1] === 'thread';
}

// ─── Invalidation helpers ───────────────────────────────────────────────────

/**
 * Revalidate every SWR cache entry belonging to the comment moderation
 * queue.
 *
 * Calls `mutate(commentReportsKeyMatcher)` so a single mutation
 * revalidates every `show` variant (`'pending'`, `'resolved'`) of
 * the list. The helper is the one consumers call — they never need
 * to import the matcher directly.
 *
 * @param mutate — optional `ScopedMutator` (defaults to the global
 *   SWR `mutate`). Tests inject a fake to assert call shape.
 */
export function invalidateCommentReportsList(
  mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
  return (mutate(commentReportsKeyMatcher) as unknown) as Promise<unknown[]>;
}

/**
 * Revalidate the SWR cache entries tied to a single offending comment.
 *
 * Calls `mutate` against:
 *   - `commentKey(commentId)` — the admin side-panel fallback read
 *     (TKT-7.6.C4).
 *   - `commentIdKeyMatcher(key, commentId)` — the per-id comment read
 *     in tuple form (mirrors `commentIdKey`).
 *   - `publicCommentsKeyMatcher` — every Phase 4 public comment read
 *     (`['comments', ...]`). The matcher is intentionally permissive:
 *     a `hide_comment` action flips the visibility flag across every
 *     list the comment is a member of.
 *
 * @param commentId — the offending comment id.
 * @param mutate — optional `ScopedMutator` (defaults to the global
 *   SWR `mutate`). Tests inject a fake to assert call shape.
 */
export function invalidateCommentById(
  commentId: string,
  mutate: ScopedMutator = globalMutate,
): Promise<unknown[]> {
  if (typeof commentId !== 'string' || commentId.trim().length === 0) {
    return Promise.resolve([]);
  }
  const promises: unknown[] = [];
  promises.push(mutate(commentKey(commentId) as unknown as string));
  promises.push(
    ((mutate as unknown as (key: unknown) => Promise<unknown[]>)((
      candidate: unknown
    ) => commentIdKeyMatcher(candidate, commentId)) as unknown) as Promise<
      unknown[]
    >,
  );
  promises.push(
    (mutate(publicCommentsKeyMatcher) as unknown) as Promise<unknown[]>,
  );
  return Promise.all(promises) as Promise<unknown[]>;
}