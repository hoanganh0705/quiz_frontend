/**
 * Comment-read SWR key catalogue.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.C3.
 *
 * The hide / restore hooks (TKT-7.6.C3) and the single-comment
 * fetch hook (TKT-7.6.C4) revalidate the public comment reads
 * whenever the visibility flag changes. This module is the single
 * source of truth for the matching predicate.
 *
 * Keys live in the `comments` namespace (per Phase 4 conventions):
 *
 *   `comments`                  — global catch-all
 *   `comments:byId:${commentId}` — single-comment read
 *   `comments:thread:${threadId}` — a thread listing
 *   `comments:byQuiz:${quizId}`  — the per-quiz comment list
 *
 * The hook catalogue deliberately matches the Phase 4 namespaces —
 * the implementation Team owns the SWR keys, and we use a
 * pessimistic prefix match so future variants added by Phase 4 are
 * transparently revalidated. (The matching strategy is documented
 * in EPIC_7_6_TICKETS.md §TKT-7.6.C3, "SWR cache invalidation
 * rules".)
 */

export interface CommentKeyParts {
  scope: 'comments';
  segment?: string;
  identifier?: string;
}

/**
 * Build the SWR key for a single-comment read (the per-id read).
 * Mirrors the key shape used by `useComment` (TKT-7.6.C4).
 */
export function commentIdKey(commentId: string): readonly unknown[] {
  return ['comments', 'byId', commentId];
}

/**
 * Predicate matching the single-comment read SWR key for a given
 * comment id. Defensive: ignores non-array, non-prefix keys.
 */
export function commentIdKeyMatcher(
  key: unknown,
  commentId: string,
): boolean {
  if (!Array.isArray(key)) return false;
  return key[0] === 'comments' && key[1] === 'byId' && key[2] === commentId;
}

/**
 * Build the SWR key for a thread listing. The moderation hook
 * revalidates the affected thread to flush any in-flight
 * pagination state when the comment flips visibility.
 */
export function commentThreadKey(threadId: string): readonly unknown[] {
  return ['comments', 'thread', threadId];
}

/**
 * Predicate matching any Phase 4 comment-namespaced key. The
 * moderation hook uses this to invalidate every comment read that
 * may carry the affected row.
 */
export function commentsNamespaceKeyMatcher(key: unknown): boolean {
  return Array.isArray(key) && key[0] === 'comments';
}
