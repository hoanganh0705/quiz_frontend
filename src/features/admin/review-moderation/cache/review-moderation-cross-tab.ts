/**
 * `features/admin/review-moderation/cache/review-moderation-cross-tab.ts`
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.G2.
 *
 * ## Purpose
 *
 * Cross-tab invalidation channel for review moderation mutations.
 * When an admin performs a resolve (dismiss / hide_review /
 * delete_review) in one tab, every other tab that has
 * `/admin/reviews/reports` open — or any surface reading the
 * `reviewReports:*` / `reviews:*` SWR keys — must revalidate its
 * caches so the new state shows up on the next render.
 *
 * ## Design
 *
 * Mirrors the Phase 7 admin cross-tab pattern established in Epic 7.3
 * (`features/admin/tag-admin/cache/tag-cross-tab.ts`) and Epic 7.4
 * (`features/admin/category-admin/cache/category-cross-tab.ts`):
 *
 *   - dedicated `BroadcastChannel` named `'phase7-admin-review-moderation'`
 *     so the tab-event payloads are independent of the auth, bookmark,
 *     tag, and category channels.
 *   - singleton channel instance (lazily created on first broadcast)
 *     so listeners register exactly once per tab.
 *   - same-tab filtering via `getCurrentTabId()` so the source tab
 *     does not echo its own broadcast.
 *   - graceful degradation: when `BroadcastChannel` is unavailable
 *     (older browsers, private mode, server-side rendering), broadcast
 *     and subscribe are both safe no-ops. Local-tab invalidation is
 *     unaffected.
 *   - external subscribers via
 *     `subscribeReviewModerationInvalidate(handler)` — any caller can
 *     listen without coupling to the channel internals.
 *
 * ## Event shape
 *
 * Single event type: `phase7:admin.review-moderation.invalidate`. The
 * payload carries:
 *
 *   - `action`     — the mutation that triggered the broadcast.
 *                    Today the only mutation is `'resolve'`; future
 *                    moderator-side flows (e.g. reassignment) extend
 *                    this union without breaking the discriminator
 *                    contract.
 *   - `reportId`   — the affected report id.
 *   - `reviewId`   — the offending review id (omitted when the
 *                    mutation does not affect a review, e.g. an
 *                    `'actioned'` resolve that the backend treats as
 *                    pure status mutation).
 *
 * Receiving tabs invalidate:
 *   - the admin queue SWR keys via `invalidateReviewReportsList`.
 *   - the offending review read keys via `invalidateReviewById`
 *     when `reviewId` is present.
 *
 * The exact keys are documented in `review-moderation-cache-keys.ts`.
 *
 * ## Wiring
 *
 * `useResolveReviewReport` (TKT-7.5.C2) calls
 * `broadcastReviewModerationInvalidate(...)` exactly once on success.
 * Failure paths (typed codes `REVIEW_NOT_FOUND` /
 * `GLOBAL_FORBIDDEN` / other) do NOT broadcast — the local
 * `mutate(reviewReportsKeyMatcher)` invalidation still runs for the
 * source tab so its list refreshes, but the cross-tab channel stays
 * silent to avoid implying a successful state to other tabs.
 */

import { getCurrentTabId } from '@/lib/api/core/broadcast-channel';

import {
  invalidateReviewById,
  invalidateReviewReportsList,
} from './review-moderation-cache-keys';

// ─── Channel name ───────────────────────────────────────────────────────────

/**
 * Channel name used for all review moderation broadcasts. Distinct
 * from the auth (`'auth'`), bookmark (`'bookmarks'`), tag admin
 * (`'phase7-admin-tag'`), and category admin (`'phase7-admin-category'`)
 * channels so the five channels' messages are independent
 * BroadcastChannels at the browser level.
 */
export const REVIEW_MODERATION_CHANNEL_NAME =
  'phase7-admin-review-moderation' as const;

// ─── Event types ────────────────────────────────────────────────────────────

/**
 * Event types for review moderation broadcast messages.
 *
 * Currently a single event type; the union exists so future
 * moderator-side flows (e.g. reassignment, appeal reopen) can extend
 * without breaking the discriminated-union contract.
 */
export type ReviewModerationEventType =
  'phase7:admin.review-moderation.invalidate';

/**
 * Discriminator for which mutation triggered the revalidation. Lets
 * receiving tabs log / branch on the source if needed.
 *
 * The union is currently a single member; extending it is a
 * source-compatible change because the `type` discriminator still
 * distinguishes events.
 */
export type ReviewModerationMutation = 'resolve';

/**
 * Base interface for all review moderation broadcast events.
 */
export interface BaseReviewModerationEvent {
  type: ReviewModerationEventType;
  /** The tab that sent this event. Used for same-tab filtering. */
  tabId: string;
  /** Unix timestamp when the event was created. */
  timestamp: number;
  /** The mutation that triggered the broadcast. */
  action: ReviewModerationMutation;
  /** The affected report id. */
  reportId: string;
  /** The offending review id, when the mutation targets a review. */
  reviewId: string | null;
}

/**
 * Event emitted when a review moderation mutation has been confirmed
 * by the server. Receiving tabs revalidate the admin queue and the
 * offending-review keys so the next render reflects the new state.
 */
export interface ReviewModerationInvalidatedEvent
  extends BaseReviewModerationEvent {
  type: 'phase7:admin.review-moderation.invalidate';
}

/**
 * Union of all possible review moderation broadcast events.
 */
export type ReviewModerationEvent = ReviewModerationInvalidatedEvent;

// ─── Channel singleton ──────────────────────────────────────────────────────

/**
 * The singleton BroadcastChannel instance for review moderation
 * events. Lazily initialized on first access.
 */
let reviewModerationChannel: BroadcastChannel | null = null;

/**
 * Flag indicating whether BroadcastChannel is available for the
 * review moderation channel. Same availability check as the auth,
 * bookmark, tag, and category channels.
 */
let isReviewModerationBroadcastChannelAvailable: boolean | null = null;

/**
 * Check if BroadcastChannel is available.
 */
function checkBroadcastChannelAvailable(): boolean {
  if (isReviewModerationBroadcastChannelAvailable !== null) {
    return isReviewModerationBroadcastChannelAvailable;
  }

  if (typeof BroadcastChannel === 'undefined') {
    isReviewModerationBroadcastChannelAvailable = false;
    return false;
  }

  try {
    // Try to construct to verify it works (some browsers have the
    // global but it throws on construction).
    new BroadcastChannel('test');
    isReviewModerationBroadcastChannelAvailable = true;
  } catch {
    isReviewModerationBroadcastChannelAvailable = false;
  }

  return isReviewModerationBroadcastChannelAvailable;
}

/**
 * Get the singleton review moderation BroadcastChannel.
 *
 * Lazily creates the channel on first call. Subsequent calls return
 * the same instance.
 *
 * @returns The BroadcastChannel instance, or null if unavailable.
 */
export function getReviewModerationChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!checkBroadcastChannelAvailable()) {
    return null;
  }

  if (reviewModerationChannel === null) {
    reviewModerationChannel = new BroadcastChannel(
      REVIEW_MODERATION_CHANNEL_NAME,
    );
  }

  return reviewModerationChannel;
}

/**
 * Close the review moderation channel (for cleanup/testing).
 * After calling this, `getReviewModerationChannel()` will create a new channel.
 */
export function closeReviewModerationChannel(): void {
  if (reviewModerationChannel !== null) {
    reviewModerationChannel.close();
    reviewModerationChannel = null;
  }
}

// ─── External subscribers ──────────────────────────────────────────────────

type ReviewModerationEventHandler = (event: ReviewModerationEvent) => void;

const reviewModerationSubscribers = new Set<ReviewModerationEventHandler>();

/**
 * Subscribe to review moderation broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab
 * events are filtered out by `tabId`).
 *
 * @param handler - Callback invoked for each review moderation event.
 * @returns Unsubscribe function.
 */
export function subscribeReviewModerationInvalidate(
  handler: ReviewModerationEventHandler,
): () => void {
  reviewModerationSubscribers.add(handler);

  return () => {
    reviewModerationSubscribers.delete(handler);
  };
}

/**
 * Dispatch an event to all external subscribers.
 * Internal use only — called by the channel message handler.
 */
function dispatchToReviewModerationSubscribers(
  event: ReviewModerationEvent,
): void {
  reviewModerationSubscribers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      // Prevent a buggy subscriber from breaking other subscribers
      console.error(
        '[review-moderation] Error in review moderation event subscriber:',
        err,
      );
    }
  });
}

// ─── Message handler ────────────────────────────────────────────────────────

/**
 * Handle an incoming review moderation broadcast message.
 * Filters out same-tab messages and dispatches to subscribers.
 */
function handleReviewModerationMessage(event: MessageEvent): void {
  // Validate the message structure
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const data = event.data as Partial<ReviewModerationInvalidatedEvent>;

  // Must have a valid type
  if (
    !data.type ||
    data.type !== 'phase7:admin.review-moderation.invalidate'
  ) {
    return;
  }

  // Must have a tabId
  if (!data.tabId || typeof data.tabId !== 'string') {
    return;
  }

  // Must have a mutation discriminator
  if (!data.action || data.action !== 'resolve') {
    return;
  }

  // Must have a reportId
  if (!data.reportId || typeof data.reportId !== 'string') {
    return;
  }

  // Filter out same-tab broadcasts (prevent event loops)
  const myTabId = getCurrentTabId();
  if (data.tabId === myTabId) {
    return;
  }

  // Dispatch to subscribers
  dispatchToReviewModerationSubscribers(data as ReviewModerationEvent);
}

// ─── Channel initialization ─────────────────────────────────────────────────

/**
 * Initialize the review moderation channel listener.
 * Called internally by `broadcastReviewModerationInvalidate()` but can
 * be called explicitly.
 *
 * @returns true if initialization succeeded, false if BroadcastChannel unavailable
 */
export function initReviewModerationChannel(): boolean {
  const channel = getReviewModerationChannel();

  if (channel === null) {
    return false;
  }

  // Only add listener once (channel is a singleton)
  if (
    !(channel as unknown as { _listenerAdded?: boolean })._listenerAdded
  ) {
    channel.addEventListener('message', handleReviewModerationMessage);
    (channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }

  return true;
}

// ─── Broadcasting ───────────────────────────────────────────────────────────

/**
 * Broadcast a review moderation invalidation to all other tabs.
 *
 * Called by `useResolveReviewReport` (TKT-7.5.C2) exactly once on
 * success. Receiving tabs revalidate the admin queue
 * (`invalidateReviewReportsList`) and, when `reviewId` is present,
 * the offending-review keys (`invalidateReviewById`).
 *
 * @param action   — the mutation that triggered the broadcast.
 *                   Currently always `'resolve'`.
 * @param reportId — the affected report id.
 * @param reviewId — the offending review id, when applicable. Pass
 *                   `null` when the mutation is a pure status change
 *                   that does not touch a specific review.
 */
export function broadcastReviewModerationInvalidate(
  action: ReviewModerationMutation,
  reportId: string,
  reviewId: string | null = null,
): void {
  // Ensure channel is initialized (sets up listener if not already)
  initReviewModerationChannel();

  const channel = getReviewModerationChannel();
  if (channel === null) {
    // BroadcastChannel unavailable — the local mutation's
    // `mutate(key)` invalidation still runs so the source tab is
    // correct.
    return;
  }

  if (!reportId || typeof reportId !== 'string') {
    // Defensive: never publish an event without a reportId. Receiving
    // tabs require the reportId to identify the affected row.
    return;
  }

  const fullEvent: ReviewModerationInvalidatedEvent = {
    type: 'phase7:admin.review-moderation.invalidate',
    action,
    reportId,
    reviewId: reviewId ?? null,
    tabId: getCurrentTabId(),
    timestamp: Date.now(),
  };

  channel.postMessage(fullEvent);
}
