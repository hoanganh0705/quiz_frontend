/**
 * `create-channel.ts` — factory for the canonical broadcast-channel
 * shape used by every cross-tab module in the codebase.
 *
 * Source epic: Phase 4 — Cross-tab sync infrastructure.
 * Source ticket: TKT-Phase-4.A1.
 *
 * ## Why this factory exists
 *
 * Before Phase 4, every broadcast channel module — auth, profile,
 * bookmarks, attempts, relationship, social-list-loaded,
 * tournament-admin, comment-moderation, review-moderation — was
 * hand-rolled from the same template:
 *
 *   1. Module-scoped `let channel: BroadcastChannel | null = null`
 *   2. `checkBroadcastChannelAvailable()` SSR-safe probe
 *   3. `getXxxChannel()` lazy constructor
 *   4. `closeXxxChannel()` for tests
 *   5. `Set<Handler>` of subscribers
 *   6. `subscribeXxx(handler)` / `dispatchToXxxSubscribers(...)`
 *   7. `handleXxxMessage(event: MessageEvent)` that validates the
 *      `tabId` / `type` discriminator and dispatches
 *   8. `initXxxChannel()` listener-install helper
 *
 * Each module implemented the same boilerplate (about 80–120 lines)
 * with three legitimate differences:
 *
 *   1. The channel name (`AUTH_CHANNEL_NAME`, `BOOKMARKS_CHANNEL_NAME`,
 *      `PHASE5_INVALIDATION`, etc.).
 *   2. The event payload type (`AuthEvent`, `ProfileEvent`,
 *      `BookmarkEvent`, …).
 *   3. The discriminator fields each handler validates (auth has
 *      four event types, profile has one, social-relationship has
 *      five).
 *
 * The differences are real and load-bearing. The boilerplate was
 * not — and was duplicated nine times. A bug in one module
 * (e.g. the listener-being-installed-twice trap the
 * `_listenerAdded` flag guards against) had to be fixed in nine
 * places. The audit calls this out as P1-9 / P1-10.
 *
 * ## What this factory does
 *
 * `createBroadcastChannel<TEvent>(name, options)` returns a small
 * `BroadcastChannelApi<TEvent>` value with:
 *
 *   - `name` — the channel name (re-exported for the docs).
 *   - `getChannel()` / `closeChannel()` — lazy singleton accessors.
 *   - `subscribe(handler)` — register a listener; returns
 *     `unsubscribe`. The handler is called only for events from
 *     OTHER tabs (same-tab filter is the factory's responsibility).
 *   - `publish(event)` — post an event to all other tabs. Stamps
 *     `tabId` and `timestamp` automatically.
 *   - `isAvailable()` — true when `BroadcastChannel` is constructable.
 *
 * Every channel created through this factory is functionally
 * identical except for the channel name and the validator
 * function. The factory owns the SSR / availability / same-tab /
 * listener-once / `Set<Handler>` discipline.
 *
 * ## Migration
 *
 * Each of the 9 modules is rewritten as a thin shell that delegates
 * to `createBroadcastChannel`. The published event types and the
 * subscriber signature are preserved so existing call sites
 * (`subscribeToAuthEvents`, `broadcastAuthEvent`, …) do not change.
 * The migration is purely internal.
 *
 * @see src/lib/api/core/broadcast-channel.ts (auth)
 * @see src/lib/api/core/profile-broadcast-channel.ts
 * @see src/lib/api/core/bookmarks-broadcast-channel.ts
 * @see src/lib/api/core/attempts-broadcast-channel.ts
 * @see src/lib/social/relationship-broadcast-channel.ts
 * @see src/lib/social/social-list-loaded-broadcast-channel.ts
 * @see src/features/admin/tournament-admin/cache/tournament-admin-cross-tab.ts
 * @see src/features/admin/comment-moderation/cache/comment-moderation-cross-tab.ts
 * @see src/features/admin/review-moderation/cache/review-moderation-cross-tab.ts
 * @see docs/frontend-cleanup-audit.md Phase 4
 */

import { getCurrentTabId as defaultGetCurrentTabId } from '@/lib/api/core/broadcast-channel';
import { logger } from '@/shared/log';

// ─── Public types ──────────────────────────────────────────────────────────

/**
 * Validator function run on every incoming message before
 * dispatching to subscribers. Return `null` to drop the message;
 * return the validated event to deliver it to subscribers.
 *
 * The factory never re-validates; the channel-specific module owns
 * the discriminator / payload checks so future event types can be
 * added without touching the factory.
 */
export type ChannelValidator<TEvent> = (
  data: unknown,
) => TEvent | null;

/**
 * Subscriber handler. Receives only events from OTHER tabs (the
 * factory's same-tab filter drops the source tab's own broadcasts).
 */
export type ChannelSubscriber<TEvent> = (event: TEvent) => void;

/**
 * The shape every broadcast-channel module exposes to the rest of
 * the application. Channel-specific modules typically re-export
 * these as their own `subscribeXxx` / `broadcastXxx` / `closeXxx`
 * helpers so call sites don't need to know about the factory.
 */
export interface BroadcastChannelApi<TEvent> {
  /** The `BroadcastChannel` name (re-exported for docs / debugging). */
  readonly name: string;
  /** `true` when `BroadcastChannel` is constructable in this env. */
  isAvailable(): boolean;
  /**
   * Lazily construct (or return the existing) singleton channel.
   * Returns `null` in SSR / when the API is unavailable.
   */
  getChannel(): BroadcastChannel | null;
  /**
   * Eagerly construct the singleton channel (returns `null` in
   * SSR / when the API is unavailable). Used by channel wrappers
   * that want to construct the channel before validation, so
   * test harnesses can probe the channel instance.
   */
  ensureChannel(): BroadcastChannel | null;
  /** Close the singleton channel; the next `getChannel()` recreates. */
  closeChannel(): void;
  /**
   * Detach every registered subscriber without closing the
   * underlying BroadcastChannel. Used by logout-reset hooks that
   * want to clear handlers but keep the channel instance so test
   * harnesses (and any in-flight subscribers) keep working.
   */
  unsubscribeAll(): void;
  /**
   * Register a subscriber. Returns an unsubscribe function. The
   * subscriber is NOT called for events emitted by this same tab.
   */
  subscribe(handler: ChannelSubscriber<TEvent>): () => void;
  /**
   * Publish an event to all other tabs. The factory stamps
   * `tabId` and the timestamp field automatically — callers
   * pass only the channel-specific fields.
   */
  publish: (event: object) => void;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

/**
 * Cache the `BroadcastChannel` availability probe per JS realm
 * (the env check is the same for every channel). Cached lazily.
 */
let cachedAvailability: boolean | null = null;

function isBroadcastChannelAvailable(): boolean {
  if (cachedAvailability !== null) return cachedAvailability;
  if (typeof BroadcastChannel === 'undefined') {
    cachedAvailability = false;
    return false;
  }
  try {
    // Some browsers expose the global but throw on construction
    // (older Safari, secure contexts, certain private-mode flags).
    // We probe once per realm so all subsequent channel lookups
    // short-circuit on the cached result. The probe is wrapped in
    // a try/catch so a throw here is converted to `false` rather
    // than bubbling up.
    new BroadcastChannel('phase4-factory-probe');
    cachedAvailability = true;
  } catch {
    cachedAvailability = false;
  }
  return cachedAvailability;
}

/**
 * Reset the availability cache. Test-only.
 *
 * @internal
 */
export function __resetBroadcastAvailabilityForTest(): void {
  cachedAvailability = null;
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Build a `BroadcastChannelApi<TEvent>` for the given channel
 * name and event validator.
 *
 * The factory accepts either of two event shapes:
 *   - `{ tabId, timestamp, ...rest }` (standard) — the factory
 *     stamps `tabId` and `timestamp` automatically.
 *   - `{ tabId, at, ...rest }` (legacy) — the factory accepts
 *     either `timestamp` or `at` on the event; `at` is set when
 *     the caller uses the legacy union. The factory's validator
 *     sees the wire shape and the publisher stamps whichever
 *     field the type declares.
 *
 * @param name - The `BroadcastChannel` name. Must be unique within
 *   the JS realm; collisions share the underlying browser channel.
 * @param options - Channel-specific configuration.
 * @param options.validate - Function that runs on every incoming
 *   message; returns the validated event or `null` to drop it.
 *   The factory calls this with the raw `MessageEvent.data` after
 *   applying the same-tab filter.
 * @param options.timestampField - The field name to use for the
 *   event timestamp. Defaults to `'timestamp'`. Use `'at'` for
 *   legacy channels whose event shape uses `at: number` instead
 *   of `timestamp: number`.
 * @param options.getCurrentTabId - Override the tab-id source.
 *   Defaults to `getCurrentTabId` from the auth channel. Channels
 *   that historically had their own sessionStorage key (e.g. the
 *   social-list-loaded channel which uses `'social:list-loaded:tabId'`)
 *   pass their own accessor so the same-tab filter aligns with the
 *   test surface.
 *
 * @example
 *   const profileChannel = createBroadcastChannel<ProfileEvent>(
 *     'profile',
 *     {
 *       validate: (data) => {
 *         if (!isProfileEvent(data)) return null;
 *         return data;
 *       },
 *     },
 *   );
 *
 *   profileChannel.subscribe((event) => {
 *     // revalidate SWR cache for `event.userId`.
 *   });
 *
 *   profileChannel.publish({ userId: 'u-1', kind: 'me' });
 */
export function createBroadcastChannel<TEvent extends { tabId: string }>(
  name: string,
  options: {
    validate: ChannelValidator<TEvent>;
    /**
     * Field name to use for the event timestamp. Defaults to
     * `'timestamp'`. The factory stamps the field automatically
     * on publish and omits it from the publish input type so
     * callers don't pass it.
     */
    timestampField?: 'timestamp' | 'at';
    /**
     * Override the tab-id source. Defaults to the auth channel's
     * `getCurrentTabId`. Accepts a getter so the factory reads
     * the value at call time, not at channel creation.
     */
    getCurrentTabId?: () => string;
  },
): BroadcastChannelApi<TEvent> {
  const stampField = options.timestampField ?? 'timestamp';
  const readTabId = options.getCurrentTabId ?? defaultGetCurrentTabId;
  // Singleton state per channel name. The factory is called once
  // per channel at module init; the closures below own the
  // channel instance + subscriber set.
  let channel: BroadcastChannel | null = null;
  const subscribers = new Set<ChannelSubscriber<TEvent>>();
  let listenerInstalled = false;

  function getChannel(): BroadcastChannel | null {
    if (typeof window === 'undefined') return null;
    if (!isBroadcastChannelAvailable()) return null;
    if (channel === null) {
      channel = new BroadcastChannel(name);
    }
    return channel;
  }

  function installListener(): void {
    if (listenerInstalled) return;
    const ch = getChannel();
    if (ch === null) return;
    ch.addEventListener('message', (event: MessageEvent) => {
      const validated = options.validate(event.data);
      if (validated === null) return;
      // Same-tab filter: drop events the source tab emitted.
      if (validated.tabId === readTabId()) return;
      dispatchToSubscribers(validated);
    });
    listenerInstalled = true;
  }

  function dispatchToSubscribers(event: TEvent): void {
    subscribers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        // A buggy subscriber must not break sibling subscribers.
        // Channel-named prefix helps debugging.
        logger.error('broadcast.subscriber', `error in ${name}`, err);
      }
    });
  }

  function subscribe(handler: ChannelSubscriber<TEvent>): () => void {
    // Install the listener on first subscribe so SSR / unmount
    // paths never create a channel they don't use.
    installListener();
    subscribers.add(handler);
    return () => {
      subscribers.delete(handler);
    };
  }

  function publish(event: object): void {
    // Always create the channel on publish (even when the channel
    // is later dropped by the publisher's validation), so test
    // harnesses can probe the underlying `BroadcastChannel`
    // instance.
    const ch = getChannel();
    if (ch === null) return;
    // Install the listener lazily so SSR / unmount paths never
    // register a listener for a channel that isn't used.
    installListener();
    const fullEvent = {
      ...event,
      tabId: readTabId(),
      [stampField]: Date.now(),
    } as TEvent;
    ch.postMessage(fullEvent);
  }

  function ensureChannel(): BroadcastChannel | null {
    return getChannel();
  }

  function closeChannel(): void {
    if (channel !== null) {
      channel.close();
      channel = null;
    }
    listenerInstalled = false;
    subscribers.clear();
  }

  /**
   * Drop every registered subscriber without closing the
   * underlying `BroadcastChannel` instance. The next
   * `subscribe()` call will reuse the same instance.
   */
  function unsubscribeAll(): void {
    subscribers.clear();
  }

  return {
    name,
    isAvailable: isBroadcastChannelAvailable,
    getChannel,
    ensureChannel,
    closeChannel,
    unsubscribeAll,
    subscribe,
    publish,
  };
}
