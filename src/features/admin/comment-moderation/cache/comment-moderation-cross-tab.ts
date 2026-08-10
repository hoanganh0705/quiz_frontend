/**
 * `features/admin/comment-moderation/cache/comment-moderation-cross-tab.ts`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.G2.
 * Phase 4 (cross-tab infra): rewritten on top of
 *   `createBroadcastChannel` (TKT-Phase-4.A1). The event types,
 *   validation, and the public subscribe / publish surface are
 *   preserved; the singleton / listener / same-tab boilerplate
 *   is now owned by the factory.
 *
 * ## Purpose
 *
 * Cross-tab invalidation channel for comment moderation mutations.
 * When an admin performs a resolve (dismiss / acknowledge /
 * mark_resolved / hide_comment) or a direct hide / restore in one
 * tab, every other tab that has `/admin/comments/reports` open — or
 * any surface reading the `commentReports:*` / `comments:*` SWR
 * keys — must revalidate its caches so the new state shows up on
 * the next render.
 *
 * ## Design
 *
 * Mirrors the Phase 7 admin cross-tab pattern established in Epic 7.3
 * (`features/admin/tag-admin/cache/tag-cross-tab.ts`), Epic 7.4
 * (`features/admin/category-admin/cache/category-cross-tab.ts`), and
 * Epic 7.5 (`features/admin/review-moderation/cache/review-moderation-cross-tab.ts`):
 *
 *   - dedicated `BroadcastChannel` named `'phase7-admin-comment-moderation'`
 *     so the tab-event payloads are independent of the auth, bookmark,
 *     tag, category, and review channels.
 *   - singleton channel instance (lazily created on first broadcast)
 *     so listeners register exactly once per tab.
 *   - same-tab filtering via the factory's same-tab filter.
 *   - graceful degradation: when `BroadcastChannel` is unavailable
 *     (older browsers, private mode, server-side rendering), broadcast
 *     and subscribe are both safe no-ops. Local-tab invalidation is
 *     unaffected.
 *   - external subscribers via
 *     `subscribeCommentModerationInvalidate(handler)` — any caller
 *     can listen without coupling to the channel internals.
 *
 * ## Event shape
 *
 * Single event type: `admin:7.1.comment-moderation.invalidate`.
 * The payload carries:
 *
 *   - `action`     — the mutation that triggered the broadcast.
 *                    Three documented values: `'resolve'` (TKT-7.6.C2),
 *                    `'hide'` and `'restore'` (TKT-7.6.C3). The union
 *                    is closed and the discriminator branches on the
 *                    receiver.
 *   - `reportId`   — the affected report id. Optional for `hide` /
 *                    `restore` because the direct hide / restore path
 *                    may not be paired with a report (the comment
 *                    thread admin context, per TKT-7.6.H1).
 *   - `commentId`  — the affected comment id (always present; the
 *                    receiving tabs invalidate the comment reads via
 *                    `invalidateCommentById`).
 *
 * Receiving tabs invalidate:
 *   - the admin queue SWR keys via `invalidateCommentReportsList`.
 *   - the affected comment read keys via `invalidateCommentById`
 *     (TKT-7.6.G1).
 *
 * The exact keys are documented in `comment-moderation-cache-keys.ts`.
 *
 * ## Wiring
 *
 * `useResolveCommentReport` (TKT-7.6.C2) calls
 * `broadcastCommentModerationInvalidate(...)` exactly once on success.
 * `useHideComment` and `useRestoreComment` (TKT-7.6.C3) call the
 * broadcast on success as well. Failure paths (typed codes
 * `COMMENT_REPORT_NOT_FOUND` /
 * `COMMENT_REPORT_ALREADY_RESOLVED` / `COMMENT_NOT_HIDDEN` /
 * `COMMENT_ALREADY_HIDDEN` / `GLOBAL_FORBIDDEN` / other) do NOT
 * broadcast — the local `mutate(keyMatcher)` invalidation still runs
 * for the source tab so its list refreshes, but the cross-tab channel
 * stays silent to avoid implying a successful state to other tabs.
 */

import { createBroadcastChannel } from '@/lib/broadcast';

import {
  invalidateCommentById,
  invalidateCommentReportsList,
} from './comment-moderation-cache-keys';

// ─── Channel name ────────────────────────────────────────────────────────────

/**
 * Channel name used for all comment moderation broadcasts. Distinct
 * from the auth (`'auth'`), bookmark (`'bookmarks'`), tag admin
 * (`'phase7-admin-tag'`), category admin
 * (`'phase7-admin-category'`), and review moderation
 * (`'phase7-admin-review-moderation'`) channels so the six channels'
 * messages are independent BroadcastChannels at the browser level.
 */
export const COMMENT_MODERATION_CHANNEL_NAME =
  'phase7-admin-comment-moderation' as const;

// ─── Event types ────────────────────────────────────────────────────────────

/**
 * Event types for comment moderation broadcast messages.
 *
 * Currently a single event type; the union exists so future
 * moderator-side flows (e.g. reassignment, appeal reopen) can extend
 * without breaking the discriminated-union contract.
 */
export type CommentModerationEventType =
  'admin:7.1.comment-moderation.invalidate';

/**
 * Discriminator for which mutation triggered the revalidation. Lets
 * receiving tabs log / branch on the source if needed.
 *
 * The union is currently three members (one per mutation hook); the
 * `type` discriminator still distinguishes events.
 */
export type CommentModerationMutation = 'resolve' | 'hide' | 'restore';

const COMMENT_MODERATION_VALID_MUTATIONS = new Set<CommentModerationMutation>([
  'resolve',
  'hide',
  'restore',
]);

/**
 * Base interface for all comment moderation broadcast events.
 */
export interface BaseCommentModerationEvent {
  type: CommentModerationEventType;
  /** The tab that sent this event. Used for same-tab filtering. */
  tabId: string;
  /** Unix timestamp when the event was created. */
  timestamp: number;
  /** The mutation that triggered the broadcast. */
  action: CommentModerationMutation;
  /** The affected report id. Optional for direct hide / restore. */
  reportId: string | null;
  /** The offending comment id. Always present. */
  commentId: string;
}

/**
 * Event emitted when a comment moderation mutation has been confirmed
 * by the server. Receiving tabs revalidate the admin queue and the
 * offending-comment keys so the next render reflects the new state.
 */
export interface CommentModerationInvalidatedEvent
  extends BaseCommentModerationEvent {
  type: 'admin:7.1.comment-moderation.invalidate';
}

/**
 * Union of all possible comment moderation broadcast events.
 */
export type CommentModerationEvent = CommentModerationInvalidatedEvent;

// ─── Factory-backed channel ────────────────────────────────────────────────

/**
 * Singleton factory instance for the `phase7-admin-comment-moderation`
 * channel.
 */
const commentModerationChannel = createBroadcastChannel<CommentModerationEvent>(
  COMMENT_MODERATION_CHANNEL_NAME,
  {
    validate: (data): CommentModerationEvent | null => {
      if (typeof data !== 'object' || data === null) return null;
      const d = data as Partial<CommentModerationInvalidatedEvent>;
      if (d.type !== 'admin:7.1.comment-moderation.invalidate') return null;
      if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
      if (typeof d.timestamp !== 'number') return null;
      if (
        typeof d.action !== 'string' ||
        !COMMENT_MODERATION_VALID_MUTATIONS.has(d.action as CommentModerationMutation)
      ) {
        return null;
      }
      if (typeof d.commentId !== 'string' || d.commentId.length === 0) {
        return null;
      }
      // reportId is optional (string | null). Accept null or a string.
      if (d.reportId !== null && typeof d.reportId !== 'string') return null;
      return d as CommentModerationEvent;
    },
  },
);

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Back-compat accessor for the singleton channel. Returns the
 * underlying `BroadcastChannel` instance.
 */
export function getCommentModerationChannel(): BroadcastChannel | null {
  return commentModerationChannel.getChannel();
}

/**
 * Back-compat initializer. The factory installs the listener on
 * first `subscribe` call, so explicit init is rarely needed.
 */
export function initCommentModerationChannel(): BroadcastChannel | null {
  return commentModerationChannel.ensureChannel();
}

/**
 * Close the comment moderation channel (for cleanup/testing).
 * After calling this, the factory closes the channel and the next
 * `subscribe` call recreates a fresh channel.
 */
export function closeCommentModerationChannel(): void {
  commentModerationChannel.closeChannel();
}

/**
 * Subscribe to comment moderation broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab
 * events are filtered out by the factory).
 *
 * @param handler - Callback invoked for each comment moderation event.
 * @returns Unsubscribe function.
 */
export function subscribeCommentModerationInvalidate(
  handler: (event: CommentModerationEvent) => void,
): () => void {
  return commentModerationChannel.subscribe(handler);
}

/**
 * Broadcast a comment moderation invalidation to all other tabs.
 *
 * Called by `useResolveCommentReport` (TKT-7.6.C2),
 * `useHideComment`, and `useRestoreComment` (TKT-7.6.C3) exactly once
 * on success. Receiving tabs revalidate the admin queue
 * (`invalidateCommentReportsList`) and the affected comment keys
 * (`invalidateCommentById`).
 *
 * @param action    — the mutation that triggered the broadcast.
 *                    Closed union: `'resolve'`, `'hide'`, `'restore'`.
 * @param reportId  — the affected report id, when the mutation
 *                    targets a report row (resolve path). Pass
 *                    `undefined` for direct hide / restore from the
 *                    comment thread admin context.
 * @param commentId — the affected comment id. Required.
 */
export function broadcastCommentModerationInvalidate(
  action: CommentModerationMutation,
  reportId: string | undefined,
  commentId: string,
): void {
  if (!commentId || typeof commentId !== 'string') {
    // Defensive: never publish an event without a commentId. Receiving
    // tabs require the commentId to invalidate the affected reads.
    return;
  }
  if (!COMMENT_MODERATION_VALID_MUTATIONS.has(action)) return;
  commentModerationChannel.publish({
    type: 'admin:7.1.comment-moderation.invalidate',
    action,
    reportId:
      typeof reportId === 'string' && reportId.length > 0 ? reportId : null,
    commentId,
  });
}
