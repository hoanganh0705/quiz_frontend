/**
 * `features/admin/comment-moderation/cache/comment-moderation-cross-tab.ts`
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.G2.
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
 *   - same-tab filtering via `getCurrentTabId()` so the source tab
 *     does not echo its own broadcast.
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
 * Single event type: `phase7:admin.comment-moderation.invalidate`.
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

import { getCurrentTabId } from '@/lib/api/core/broadcast-channel';

import {
  invalidateCommentById,
  invalidateCommentReportsList,
} from './comment-moderation-cache-keys';

// ─── Channel name ───────────────────────────────────────────────────────────

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
  'phase7:admin.comment-moderation.invalidate';

/**
 * Discriminator for which mutation triggered the revalidation. Lets
 * receiving tabs log / branch on the source if needed.
 *
 * The union is currently three members (one per mutation hook); the
 * `type` discriminator still distinguishes events.
 */
export type CommentModerationMutation = 'resolve' | 'hide' | 'restore';

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
  type: 'phase7:admin.comment-moderation.invalidate';
}

/**
 * Union of all possible comment moderation broadcast events.
 */
export type CommentModerationEvent = CommentModerationInvalidatedEvent;

// ─── Channel singleton ──────────────────────────────────────────────────────

/**
 * The singleton BroadcastChannel instance for comment moderation
 * events. Lazily initialized on first access.
 */
let commentModerationChannel: BroadcastChannel | null = null;

/**
 * Flag indicating whether BroadcastChannel is available for the
 * comment moderation channel. Same availability check as the auth,
 * bookmark, tag, category, and review channels.
 */
let isCommentModerationBroadcastChannelAvailable: boolean | null = null;

/**
 * Check if BroadcastChannel is available.
 */
function checkBroadcastChannelAvailable(): boolean {
  if (isCommentModerationBroadcastChannelAvailable !== null) {
    return isCommentModerationBroadcastChannelAvailable;
  }

  if (typeof BroadcastChannel === 'undefined') {
    isCommentModerationBroadcastChannelAvailable = false;
    return false;
  }

  try {
    // Try to construct to verify it works (some browsers have the
    // global but it throws on construction).
    new BroadcastChannel('test');
    isCommentModerationBroadcastChannelAvailable = true;
  } catch {
    isCommentModerationBroadcastChannelAvailable = false;
  }

  return isCommentModerationBroadcastChannelAvailable;
}

/**
 * Get the singleton comment moderation BroadcastChannel.
 *
 * Lazily creates the channel on first call. Subsequent calls return
 * the same instance.
 *
 * @returns The BroadcastChannel instance, or null if unavailable.
 */
export function getCommentModerationChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!checkBroadcastChannelAvailable()) {
    return null;
  }

  if (commentModerationChannel === null) {
    commentModerationChannel = new BroadcastChannel(
      COMMENT_MODERATION_CHANNEL_NAME,
    );
  }

  return commentModerationChannel;
}

/**
 * Close the comment moderation channel (for cleanup/testing).
 * After calling this, `getCommentModerationChannel()` will create a new channel.
 */
export function closeCommentModerationChannel(): void {
  if (commentModerationChannel !== null) {
    commentModerationChannel.close();
    commentModerationChannel = null;
  }
}

// ─── External subscribers ──────────────────────────────────────────────────

type CommentModerationEventHandler = (
  event: CommentModerationEvent,
) => void;

const commentModerationSubscribers = new Set<CommentModerationEventHandler>();

/**
 * Subscribe to comment moderation broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab
 * events are filtered out by `tabId`).
 *
 * @param handler - Callback invoked for each comment moderation event.
 * @returns Unsubscribe function.
 */
export function subscribeCommentModerationInvalidate(
  handler: CommentModerationEventHandler,
): () => void {
  commentModerationSubscribers.add(handler);

  return () => {
    commentModerationSubscribers.delete(handler);
  };
}

/**
 * Dispatch an event to all external subscribers.
 * Internal use only — called by the channel message handler.
 */
function dispatchToCommentModerationSubscribers(
  event: CommentModerationEvent,
): void {
  commentModerationSubscribers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      // Prevent a buggy subscriber from breaking other subscribers
      console.error(
        '[comment-moderation] Error in comment moderation event subscriber:',
        err,
      );
    }
  });
}

// ─── Message handler ────────────────────────────────────────────────────────

/**
 * Handle an incoming comment moderation broadcast message.
 * Filters out same-tab messages and dispatches to subscribers.
 */
function handleCommentModerationMessage(event: MessageEvent): void {
  // Validate the message structure
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const data = event.data as Partial<CommentModerationInvalidatedEvent>;

  // Must have a valid type
  if (
    !data.type ||
    data.type !== 'phase7:admin.comment-moderation.invalidate'
  ) {
    return;
  }

  // Must have a tabId
  if (!data.tabId || typeof data.tabId !== 'string') {
    return;
  }

  // Must have a mutation discriminator (closed union of three values)
  if (
    !data.action ||
    (data.action !== 'resolve' &&
      data.action !== 'hide' &&
      data.action !== 'restore')
  ) {
    return;
  }

  // Must have a commentId (always required)
  if (!data.commentId || typeof data.commentId !== 'string') {
    return;
  }

  // Filter out same-tab broadcasts (prevent event loops)
  const myTabId = getCurrentTabId();
  if (data.tabId === myTabId) {
    return;
  }

  // Dispatch to subscribers
  dispatchToCommentModerationSubscribers(data as CommentModerationEvent);
}

// ─── Channel initialization ─────────────────────────────────────────────────

/**
 * Initialize the comment moderation channel listener.
 * Called internally by `broadcastCommentModerationInvalidate()` but can
 * be called explicitly.
 *
 * @returns true if initialization succeeded, false if BroadcastChannel unavailable
 */
export function initCommentModerationChannel(): boolean {
  const channel = getCommentModerationChannel();

  if (channel === null) {
    return false;
  }

  // Only add listener once (channel is a singleton)
  if (
    !(channel as unknown as { _listenerAdded?: boolean })._listenerAdded
  ) {
    channel.addEventListener('message', handleCommentModerationMessage);
    (channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }

  return true;
}

// ─── Broadcasting ───────────────────────────────────────────────────────────

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
  // Ensure channel is initialized (sets up listener if not already)
  initCommentModerationChannel();

  const channel = getCommentModerationChannel();
  if (channel === null) {
    // BroadcastChannel unavailable — the local mutation's
    // `mutate(key)` invalidation still runs so the source tab is
    // correct.
    return;
  }

  if (!commentId || typeof commentId !== 'string') {
    // Defensive: never publish an event without a commentId. Receiving
    // tabs require the commentId to invalidate the affected reads.
    return;
  }

  const fullEvent: CommentModerationInvalidatedEvent = {
    type: 'phase7:admin.comment-moderation.invalidate',
    action,
    reportId: typeof reportId === 'string' && reportId.length > 0 ? reportId : null,
    commentId,
    tabId: getCurrentTabId(),
    timestamp: Date.now(),
  };

  channel.postMessage(fullEvent);
}