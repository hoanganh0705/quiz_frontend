/**
 * Profile Broadcast Channel — user-scoped cross-tab profile-mutation
 * invalidation.
 *
 * Source epic:   Story 4.6 (personal area: profile + settings).
 * Source ticket: TKT-4.1.B2.
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
import { getCurrentTabId } from './broadcast-channel';

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

// ─── Channel Singleton ───────────────────────────────────────────────────────

let profileChannel: BroadcastChannel | null = null;
let isProfileBroadcastChannelAvailable: boolean | null = null;

function checkBroadcastChannelAvailable(): boolean {
  if (isProfileBroadcastChannelAvailable !== null) {
    return isProfileBroadcastChannelAvailable;
  }
  if (typeof BroadcastChannel === 'undefined') {
    isProfileBroadcastChannelAvailable = false;
    return false;
  }
  try {
    new BroadcastChannel('profile.test');
    isProfileBroadcastChannelAvailable = true;
  } catch {
    isProfileBroadcastChannelAvailable = false;
  }
  return isProfileBroadcastChannelAvailable;
}

/**
 * Get the singleton profile BroadcastChannel.
 * @returns The BroadcastChannel instance, or null if unavailable
 */
export function getProfileChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!checkBroadcastChannelAvailable()) return null;
  if (profileChannel === null) {
    profileChannel = new BroadcastChannel(PROFILE_CHANNEL_NAME);
  }
  return profileChannel;
}

/** Close the profile channel (for cleanup/testing). */
export function closeProfileChannel(): void {
  if (profileChannel !== null) {
    profileChannel.close();
    profileChannel = null;
  }
}

// ─── External Subscribers ─────────────────────────────────────────────────────

type ProfileEventHandler = (event: ProfileEvent) => void;
const profileSubscribers = new Set<ProfileEventHandler>();

/**
 * Subscribe to profile broadcast events.
 * Same-tab events are filtered out by `tabId` in the message handler.
 * @returns Unsubscribe function
 */
export function subscribeToProfileEvents(
  handler: ProfileEventHandler,
): () => void {
  profileSubscribers.add(handler);
  return () => {
    profileSubscribers.delete(handler);
  };
}

function dispatchToProfileSubscribers(event: ProfileEvent): void {
  profileSubscribers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      console.error('[profile] Error in profile event subscriber:', err);
    }
  });
}

// ─── Message Handler ─────────────────────────────────────────────────────────

function handleProfileMessage(event: MessageEvent): void {
  if (!event.data || typeof event.data !== 'object') return;
  const data = event.data as Partial<ProfileUpdatedEvent>;
  if (data.type !== 'profile/updated') return;
  if (!data.tabId || typeof data.tabId !== 'string') return;
  if (!data.userId || typeof data.userId !== 'string') return;
  if (
    !data.kind ||
    !['me', 'settings', 'avatar', 'preferences'].includes(data.kind)
  ) {
    return;
  }
  const myTabId = getCurrentTabId();
  if (data.tabId === myTabId) return;
  dispatchToProfileSubscribers(data as ProfileEvent);
}

// ─── Channel Initialization ───────────────────────────────────────────────────

export function initProfileChannel(): boolean {
  const channel = getProfileChannel();
  if (channel === null) return false;
  if (!(channel as unknown as { _listenerAdded?: boolean })._listenerAdded) {
    channel.addEventListener('message', handleProfileMessage);
    (channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }
  return true;
}

// ─── Broadcasting ───────────────────────────────────────────────────────────

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
  initProfileChannel();
  const channel = getProfileChannel();
  if (channel === null) return;
  if (
    !params.userId ||
    typeof params.userId !== 'string' ||
    !params.kind
  ) {
    return;
  }
  const fullEvent: ProfileUpdatedEvent = {
    type: 'profile/updated',
    userId: params.userId,
    kind: params.kind,
    tabId: getCurrentTabId(),
    timestamp: Date.now(),
  };
  channel.postMessage(fullEvent);
}
