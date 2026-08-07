/**
 * Profile Broadcast Channel — user-scoped cross-tab profile-mutation
 * invalidation.
 *
 * Source epic:   Story 4.6 (personal area: profile + settings).
 * Source ticket: TKT-4.1.B2.
 * Phase 4 (cross-tab infra): rewritten on top of
 *   `createBroadcastChannel` (TKT-Phase-4.A1). The event types,
 *   validation, and the public subscribe / publish surface are
 *   preserved; the singleton / listener / same-tab boilerplate
 *   is now owned by the factory.
 *
 * ## Purpose
 *
 * Cross-tab notification of profile mutations (PATCH /users/me, PATCH
 * /users/me/settings) so every tab can revalidate the cached
 * `useMe` / `useMySettings` SWR keys.
 *
 * ## Channel naming
 *
 * Channel name `profile` mirrors the existing `auth` and `bookmarks`
 * conventions.
 *
 * ## Message Types
 *
 * | Type                 | Direction | Payload                            |
 * |----------------------|-----------|------------------------------------|
 * | `profile/updated`    | → others  | `userId`, `kind`, `tabId`,         |
 * |                      |           | `timestamp`, optional `patch` keys |
 *
 * `kind` is one of `'me' | 'settings' | 'avatar' | 'preferences'`.
 * Receiving tabs (the `useMe` SWR hook, the settings page, the
 * user-pill in the header, etc.) revalidate the corresponding cache.
 *
 * ## User scoping
 *
 * The payload carries `userId` so receiving tabs ignore events from
 * other users (the user-switching case).
 *
 * ## Same-tab filtering
 *
 * Each tab has a unique `tabId` so it can ignore its own broadcasts.
 * The tab identity is shared with the auth / bookmarks / attempts
 * channels via `getCurrentTabId()` from `broadcast-channel.ts`.
 *
 * ## Graceful degradation
 *
 * Same fallback contract as the auth / bookmarks / attempts channels.
 */
import { createBroadcastChannel } from '@/lib/broadcast';

const PROFILE_VALID_KINDS = new Set(['me', 'settings', 'avatar', 'preferences']);

/**
 * Channel name used for all profile broadcasts.
 */
export const PROFILE_CHANNEL_NAME = 'profile';

/**
 * Event types for profile broadcast messages.
 *
 * A single event type, unioned so future profile events (e.g.
 * `profile/achievement-unlocked`) can be added without breaking the
 * discriminated-union contract.
 */
export type ProfileEventType = 'profile/updated';

/**
 * Discriminator describing which profile surface was mutated.
 *
 * Receiving tabs subscribe to whichever kinds they care about
 * (`useMe` cares about `'me'`, the settings page cares about
 * `'settings'`, etc.).
 */
export type ProfileUpdateKind =
  | 'me'
  | 'settings'
  | 'avatar'
  | 'preferences';

export interface BaseProfileEvent {
  type: ProfileEventType;
  tabId: string;
  timestamp: number;
}

/**
 * Event emitted when a server-confirmed profile mutation occurs.
 * Receiving tabs revalidate the corresponding SWR key.
 *
 * The payload omits sensitive content (no email, no password hash,
 * no raw settings blob); the `kind` discriminator is enough for the
 * receiving tab to know which SWR key to revalidate, and the next SWR
 * fetch pulls the canonical payload from the server with the user's
 * auth token.
 */
export interface ProfileUpdatedEvent extends BaseProfileEvent {
  type: 'profile/updated';
  /** Authenticated user's ID whose profile changed. */
  userId: string;
  /** Which surface was mutated. */
  kind: ProfileUpdateKind;
}

/**
 * Union of all possible profile broadcast events.
 */
export type ProfileEvent = ProfileUpdatedEvent;

// ─── Factory-backed channel ───────────────────────────────────────────────

/**
 * Singleton factory instance for the `profile` channel. The factory
 * owns SSR safety, availability checks, the same-tab filter, the
 * listener-once install, and the subscriber registry. This module
 * owns the event-type validation and the public subscribe / publish
 * helpers.
 */
const profileChannel = createBroadcastChannel<ProfileEvent>(PROFILE_CHANNEL_NAME, {
  validate: (data): ProfileEvent | null => {
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Partial<ProfileUpdatedEvent>;
    if (d.type !== 'profile/updated') return null;
    if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
    if (typeof d.userId !== 'string' || d.userId.length === 0) return null;
    if (typeof d.kind !== 'string' || !PROFILE_VALID_KINDS.has(d.kind)) return null;
    return d as ProfileEvent;
  },
});

// ─── Public API ──────────────────────────────────────────────────────────

/** Close the profile channel (for cleanup/testing). */
export function closeProfileChannel(): void {
  profileChannel.closeChannel();
}

/**
 * Back-compat accessor for the singleton channel. Returns the
 * underlying `BroadcastChannel` instance (or `null` in SSR /
 * when the API is unavailable).
 */
export function getProfileChannel(): BroadcastChannel | null {
  return profileChannel.getChannel();
}

/**
 * Subscribe to profile broadcast events. Same-tab events are
 * filtered out by the factory.
 * @returns Unsubscribe function
 */
export function subscribeToProfileEvents(
  handler: (event: ProfileEvent) => void,
): () => void {
  return profileChannel.subscribe(handler);
}

/**
 * Broadcast a profile mutation to all other tabs.
 *
 * @example
 *   broadcastProfileUpdated({ userId: 'u-1', kind: 'settings' });
 */
export function broadcastProfileUpdated(params: {
  userId: string;
  kind: ProfileUpdateKind;
}): void {
  // Always instantiate the channel up-front (mirrors the original
  // module's behavior).
  profileChannel.ensureChannel();
  if (!params.userId || typeof params.userId !== 'string' || !params.kind) {
    return;
  }
  profileChannel.publish({
    type: 'profile/updated',
    userId: params.userId,
    kind: params.kind,
  });
}
