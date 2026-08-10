/**
 * `features/admin/tag-admin/cache/tag-cross-tab.ts`
 *
 * Source epic:   Epic 7.3 — Tag admin CRUD + restore.
 * Source ticket: TKT-7.3.G2.
 *
 * ## Purpose
 *
 * Cross-tab invalidation channel for tag admin mutations. When an
 * admin performs a tag mutation (create / update / delete / restore)
 * in one tab, every other tab that has `/admin/tags` open (or any
 * other surface reading `tags:*` SWR keys) must revalidate its
 * caches so the new state shows up on the next render.
 *
 * ## Design
 *
 * Mirrors the Phase 3 / Phase 6 cross-tab pattern (`bookmarks-
 * broadcast-channel.ts` is the closest analogue):
 *
 *   - dedicated `BroadcastChannel` named `'phase7-admin-tag'` so the
 *     tab-event payloads are independent of the auth and bookmark
 *     channels.
 *   - singleton channel instance (lazily created on first broadcast)
 *     so listeners register exactly once per tab.
 *   - same-tab filtering via `getCurrentTabId()` so the source tab
 *     does not echo its own broadcast.
 *   - graceful degradation: when `BroadcastChannel` is unavailable
 *     (older browsers, private mode, server-side rendering), broadcast
 *     and subscribe are both safe no-ops. Local-tab invalidation is
 *     unaffected.
 *   - external subscribers via `subscribeTagAdminInvalidate(handler)` —
 *     any caller can listen without coupling to the channel
 *     internals.
 *
 * ## Event shape
 *
 * Single event type: `admin:7.1.tag.invalidate`. The payload
 * carries `mutation` (the kind of mutation that triggered the
 * revalidation) and `tagId` (the affected tag id). The receiving
 * tab invalidates the admin list and public tag caches; the exact
 * keys are documented in `tag-cache-keys.ts` and revalidated via
 * `invalidateTagAdminList` + `invalidatePublicTagCaches`.
 *
 * ## Wiring
 *
 * Every mutation hook (`useCreateTag`, `useUpdateTag`,
 * `useDeleteTag`, `useRestoreTag`) calls
 * `broadcastTagAdminInvalidate(...)` once on success. The
 * `TagAdminPage` (or any tab receiving the event) listens via
 * `subscribeTagAdminInvalidate(handler)` and invalidates the
 * documented caches — the page wiring lives in `TagAdminPage`'s
 * mount effect (TKT-7.3.F2 follow-up) and the public revalidation
 * also lives in any consumer that wants to refresh on the event.
 */

import {
  getCurrentTabId,
} from '@/lib/api/core/broadcast-channel';

// ─── Channel name ───────────────────────────────────────────────────────────

/**
 * Channel name used for all tag admin broadcasts. Distinct from the
 * auth (`'auth'`) and bookmarks (`'bookmarks'`) channels so the
 * three channels' messages are independent BroadcastChannels at the
 * browser level.
 */
export const TAG_ADMIN_CHANNEL_NAME = 'phase7-admin-tag' as const;

import { logger } from '@/shared/log';

// ─── Event types ────────────────────────────────────────────────────────────

/**
 * Event types for tag admin broadcast messages.
 *
 * Currently a single event type; the union exists so future tag
 * admin events (e.g. `admin:7.1.tag.bulk-invalidate`) can be added
 * without breaking the discriminated-union contract.
 */
export type TagAdminEventType = 'admin:7.1.tag.invalidate';

/**
 * Discriminator for which mutation triggered the revalidation. Lets
 * receiving tabs log / branch on the source if needed.
 */
export type TagAdminMutation = 'create' | 'update' | 'delete' | 'restore';

/**
 * Base interface for all tag admin broadcast events.
 */
export interface BaseTagAdminEvent {
  type: TagAdminEventType;
  /** The tab that sent this event. Used for same-tab filtering. */
  tabId: string;
  /** Unix timestamp when the event was created. */
  timestamp: number;
  /** The mutation that triggered the broadcast. */
  mutation: TagAdminMutation;
  /** The affected tag id. */
  tagId: string;
}

/**
 * Event emitted when any tag admin mutation has been confirmed by
 * the server. Receiving tabs revalidate the admin tag list and the
 * public tag caches so the next render reflects the new state.
 */
export interface TagAdminInvalidatedEvent extends BaseTagAdminEvent {
  type: 'admin:7.1.tag.invalidate';
}

/**
 * Union of all possible tag admin broadcast events.
 */
export type TagAdminEvent = TagAdminInvalidatedEvent;

// ─── Channel singleton ──────────────────────────────────────────────────────

/**
 * The singleton BroadcastChannel instance for tag admin events.
 * Lazily initialized on first access.
 */
let tagAdminChannel: BroadcastChannel | null = null;

/**
 * Flag indicating whether BroadcastChannel is available for the
 * tag admin channel. Same availability check as the auth and
 * bookmark channels.
 */
let isTagAdminBroadcastChannelAvailable: boolean | null = null;

/**
 * Check if BroadcastChannel is available.
 */
function checkBroadcastChannelAvailable(): boolean {
  if (isTagAdminBroadcastChannelAvailable !== null) {
    return isTagAdminBroadcastChannelAvailable;
  }

  if (typeof BroadcastChannel === 'undefined') {
    isTagAdminBroadcastChannelAvailable = false;
    return false;
  }

  try {
    // Try to construct to verify it works (some browsers have the
    // global but it throws on construction).
    new BroadcastChannel('test');
    isTagAdminBroadcastChannelAvailable = true;
  } catch {
    isTagAdminBroadcastChannelAvailable = false;
  }

  return isTagAdminBroadcastChannelAvailable;
}

/**
 * Get the singleton tag admin BroadcastChannel.
 *
 * Lazily creates the channel on first call. Subsequent calls return
 * the same instance.
 *
 * @returns The BroadcastChannel instance, or null if unavailable
 */
export function getTagAdminChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!checkBroadcastChannelAvailable()) {
    return null;
  }

  if (tagAdminChannel === null) {
    tagAdminChannel = new BroadcastChannel(TAG_ADMIN_CHANNEL_NAME);
  }

  return tagAdminChannel;
}

/**
 * Close the tag admin channel (for cleanup/testing).
 * After calling this, `getTagAdminChannel()` will create a new channel.
 */
export function closeTagAdminChannel(): void {
  if (tagAdminChannel !== null) {
    tagAdminChannel.close();
    tagAdminChannel = null;
  }
}

// ─── External subscribers ──────────────────────────────────────────────────

type TagAdminEventHandler = (event: TagAdminEvent) => void;

const tagAdminSubscribers = new Set<TagAdminEventHandler>();

/**
 * Subscribe to tag admin broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab
 * events are filtered out by `tabId`).
 *
 * @param handler - Callback invoked for each tag admin event.
 * @returns Unsubscribe function.
 */
export function subscribeTagAdminInvalidate(
  handler: TagAdminEventHandler,
): () => void {
  tagAdminSubscribers.add(handler);

  return () => {
    tagAdminSubscribers.delete(handler);
  };
}

/**
 * Dispatch an event to all external subscribers.
 * Internal use only — called by the channel message handler.
 */
function dispatchToTagAdminSubscribers(event: TagAdminEvent): void {
  tagAdminSubscribers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      // Prevent a buggy subscriber from breaking other subscribers
      logger.error('admin.tag.broadcast', 'Error in tag admin event subscriber', err);
    }
  });
}

// ─── Message handler ────────────────────────────────────────────────────────

/**
 * Handle an incoming tag admin broadcast message.
 * Filters out same-tab messages and dispatches to subscribers.
 */
function handleTagAdminMessage(event: MessageEvent): void {
  // Validate the message structure
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const data = event.data as Partial<TagAdminInvalidatedEvent>;

  // Must have a valid type
  if (!data.type || data.type !== 'admin:7.1.tag.invalidate') {
    return;
  }

  // Must have a tabId
  if (!data.tabId || typeof data.tabId !== 'string') {
    return;
  }

  // Must have a mutation discriminator
  if (
    !data.mutation ||
    !['create', 'update', 'delete', 'restore'].includes(data.mutation)
  ) {
    return;
  }

  // Must have a tagId
  if (!data.tagId || typeof data.tagId !== 'string') {
    return;
  }

  // Filter out same-tab broadcasts (prevent event loops)
  const myTabId = getCurrentTabId();
  if (data.tabId === myTabId) {
    return;
  }

  // Dispatch to subscribers
  dispatchToTagAdminSubscribers(data as TagAdminEvent);
}

// ─── Channel initialization ─────────────────────────────────────────────────

/**
 * Initialize the tag admin channel listener.
 * Called internally by `broadcastTagAdminInvalidate()` but can be
 * called explicitly.
 *
 * @returns true if initialization succeeded, false if BroadcastChannel unavailable
 */
export function initTagAdminChannel(): boolean {
  const channel = getTagAdminChannel();

  if (channel === null) {
    return false;
  }

  // Only add listener once (channel is a singleton)
  if (!(channel as unknown as { _listenerAdded?: boolean })._listenerAdded) {
    channel.addEventListener('message', handleTagAdminMessage);
    (channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }

  return true;
}

// ─── Broadcasting ───────────────────────────────────────────────────────────

/**
 * Broadcast a tag admin invalidation to all other tabs.
 *
 * Called by the four mutation hooks (`useCreateTag`, `useUpdateTag`,
 * `useDeleteTag`, `useRestoreTag`) once on success. Receiving tabs
 * revalidate the admin tag list (`TAG_ADMIN_LIST_KEY`) and the
 * public tag caches via the helpers in `tag-cache-keys.ts`.
 *
 * @param mutation — the mutation that triggered the broadcast.
 * @param tagId — the affected tag id.
 */
export function broadcastTagAdminInvalidate(
  mutation: TagAdminMutation,
  tagId: string,
): void {
  // Ensure channel is initialized (sets up listener if not already)
  initTagAdminChannel();

  const channel = getTagAdminChannel();
  if (channel === null) {
    // BroadcastChannel unavailable — the local mutation's
    // `mutate(key)` invalidation still runs so the source tab is
    // correct.
    return;
  }

  if (!tagId || typeof tagId !== 'string') {
    // Defensive: never publish an event without a tagId. Receiving
    // tabs require the tagId to identify the affected row.
    return;
  }

  const fullEvent: TagAdminInvalidatedEvent = {
    type: 'admin:7.1.tag.invalidate',
    mutation,
    tagId,
    tabId: getCurrentTabId(),
    timestamp: Date.now(),
  };

  channel.postMessage(fullEvent);
}
