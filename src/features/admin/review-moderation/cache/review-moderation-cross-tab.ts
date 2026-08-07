/**
 * `features/admin/review-moderation/cache/review-moderation-cross-tab.ts`
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.G2.
 * Phase 4 (cross-tab infra): rewritten on top of
 *   `createBroadcastChannel` (TKT-Phase-4.A1). The event types,
 *   validation, and the public subscribe / publish surface are
 *   preserved; the singleton / listener / same-tab boilerplate
 *   is now owned by the factory.
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
 *   - same-tab filtering via the factory's same-tab filter.
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

import { createBroadcastChannel } from '@/lib/broadcast';

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

const REVIEW_MODERATION_VALID_MUTATIONS = new Set<ReviewModerationMutation>([
  'resolve',
]);

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

// ─── Factory-backed channel ────────────────────────────────────────────────

/**
 * Singleton factory instance for the `phase7-admin-review-moderation`
 * channel.
 */
const reviewModerationChannel = createBroadcastChannel<ReviewModerationEvent>(
  REVIEW_MODERATION_CHANNEL_NAME,
  {
    validate: (data): ReviewModerationEvent | null => {
      if (typeof data !== 'object' || data === null) return null;
      const d = data as Partial<ReviewModerationInvalidatedEvent>;
      if (d.type !== 'phase7:admin.review-moderation.invalidate') return null;
      if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
      if (typeof d.timestamp !== 'number') return null;
      if (
        typeof d.action !== 'string' ||
        !REVIEW_MODERATION_VALID_MUTATIONS.has(d.action as ReviewModerationMutation)
      ) {
        return null;
      }
      if (typeof d.reportId !== 'string' || d.reportId.length === 0) return null;
      // reviewId is optional (string | null). Accept null or a string.
      if (d.reviewId !== null && typeof d.reviewId !== 'string') return null;
      return d as ReviewModerationEvent;
    },
  },
);

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Back-compat accessor for the singleton channel. Returns the
 * underlying `BroadcastChannel` instance.
 */
export function getReviewModerationChannel(): BroadcastChannel | null {
  return reviewModerationChannel.getChannel();
}

/**
 * Back-compat initializer. The factory installs the listener on
 * first `subscribe` call, so explicit init is rarely needed.
 */
export function initReviewModerationChannel(): BroadcastChannel | null {
  return reviewModerationChannel.ensureChannel();
}

/**
 * Close the review moderation channel (for cleanup/testing).
 * After calling this, the factory closes the channel and the next
 * `subscribe` call recreates a fresh channel.
 */
export function closeReviewModerationChannel(): void {
  reviewModerationChannel.closeChannel();
}

/**
 * Subscribe to review moderation broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab
 * events are filtered out by the factory).
 *
 * @param handler - Callback invoked for each review moderation event.
 * @returns Unsubscribe function.
 */
export function subscribeReviewModerationInvalidate(
  handler: (event: ReviewModerationEvent) => void,
): () => void {
  return reviewModerationChannel.subscribe(handler);
}

/**
 * Broadcast a review moderation invalidation to all other tabs.
 *
 * Called by `useResolveReviewReport` (TKT-7.5.C2) exactly once on
 * success. Receiving tabs revalidate the admin queue
 * (`invalidateReviewReportsList`) and the offending review keys
 * (`invalidateReviewById`) when `reviewId` is present.
 *
 * @param action    — the mutation that triggered the broadcast.
 *                    Closed union: `'resolve'`.
 * @param reportId  — the affected report id (required).
 * @param reviewId  — the affected review id, when the mutation
 *                    targets a review (pass `null` when the
 *                    mutation is a pure status change).
 */
export function broadcastReviewModerationInvalidate(
  action: ReviewModerationMutation,
  reportId: string,
  reviewId: string | null,
): void {
  if (!reportId || typeof reportId !== 'string') {
    // Defensive: never publish an event without a reportId.
    return;
  }
  if (!REVIEW_MODERATION_VALID_MUTATIONS.has(action)) return;
  reviewModerationChannel.publish({
    type: 'phase7:admin.review-moderation.invalidate',
    action,
    reportId,
    reviewId,
  });
}
