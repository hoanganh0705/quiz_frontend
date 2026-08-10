/**
 * `features/admin/achievement-admin/broadcast.ts`
 *
 * Source epic:   Epic 7.8 — Achievement Admin: Re-evaluate per User and Revoke Badge.
 * Source ticket: TKT-7.8.G2.
 *
 * ## Purpose
 *
 * Cross-tab invalidation channel for achievement admin mutations. When an
 * admin performs a re-evaluation or badge revocation in one tab, every
 * other tab that has the achievement admin page open must revalidate
 * its caches so the new badge state shows up on the next render.
 *
 * ## Design
 *
 * Mirrors the Phase 7.7 tournament admin cross-tab pattern:
 *
 *   - dedicated `BroadcastChannel` named `'phase7-admin-achievement'`
 *   - singleton channel instance (lazily created on first broadcast)
 *   - same-tab filtering via `getCurrentTabId()` so the source tab
 *     does not echo its own broadcast
 *   - graceful degradation: when `BroadcastChannel` is unavailable
 *     (older browsers, private mode, server-side rendering), broadcast
 *     and subscribe are both safe no-ops. Local-tab invalidation via
 *     SWR is unaffected.
 *
 * ## Event shape
 *
 * Single event type: `admin:7.1.achievement-admin.invalidate`.
 * The payload carries `action` ('reevaluate' | 'revoke'), `userId`,
 * optional `badgeId`, and `requestId`. Receiving tabs invalidate
 * the documented SWR keys via the helpers in `cache-keys.ts`.
 */

import { getCurrentTabId } from '@/lib/api/core/broadcast-channel';
import { logger } from '@/shared/log';

import { invalidateAchievementAdmin } from './cache-keys';

// ─── Channel name ────────────────────────────────────────────────────────

/**
 * Channel name used for all achievement admin broadcasts.
 * Distinct from other admin channels so messages are independent
 * at the browser level.
 */
export const ACHIEVEMENT_ADMIN_CHANNEL_NAME = 'phase7-admin-achievement' as const;

// ─── Event types ─────────────────────────────────────────────────────────

/**
 * Event types for achievement admin broadcast messages.
 */
export type AchievementAdminEventType = 'admin:7.1.achievement-admin.invalidate';

/**
 * Discriminator for which mutation triggered the revalidation.
 */
export type AchievementAdminMutation = 'reevaluate' | 'revoke';

/**
 * Base interface for all achievement admin broadcast events.
 */
export interface BaseAchievementAdminEvent {
  type: AchievementAdminEventType;
  /** The tab that sent this event. Used for same-tab filtering. */
  tabId: string;
  /** Unix timestamp when the event was created. */
  timestamp: number;
  /** The mutation that triggered the broadcast. */
  action: AchievementAdminMutation;
  /** The affected user id. */
  userId: string;
  /** The affected badge id (only for revoke mutations). */
  badgeId?: string;
  /** The request id from the server response. */
  requestId: string;
}

/**
 * Event emitted when any achievement admin mutation has been confirmed.
 * Receiving tabs revalidate the admin badge list and history caches.
 */
export interface AchievementAdminInvalidatedEvent extends BaseAchievementAdminEvent {
  type: 'admin:7.1.achievement-admin.invalidate';
}

/**
 * Union of all possible achievement admin broadcast events.
 */
export type AchievementAdminEvent = AchievementAdminInvalidatedEvent;

// ─── Channel singleton ────────────────────────────────────────────────────

let achievementAdminChannel: BroadcastChannel | null = null;
let isAchievementAdminBroadcastChannelAvailable: boolean | null = null;

function checkBroadcastChannelAvailable(): boolean {
  if (isAchievementAdminBroadcastChannelAvailable !== null) {
    return isAchievementAdminBroadcastChannelAvailable;
  }

  if (typeof BroadcastChannel === 'undefined') {
    isAchievementAdminBroadcastChannelAvailable = false;
    return false;
  }

  try {
    new BroadcastChannel('test');
    isAchievementAdminBroadcastChannelAvailable = true;
  } catch {
    isAchievementAdminBroadcastChannelAvailable = false;
  }

  return isAchievementAdminBroadcastChannelAvailable;
}

function getAchievementAdminChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!checkBroadcastChannelAvailable()) {
    return null;
  }

  if (achievementAdminChannel === null) {
    achievementAdminChannel = new BroadcastChannel(ACHIEVEMENT_ADMIN_CHANNEL_NAME);
  }

  return achievementAdminChannel;
}

export function closeAchievementAdminChannel(): void {
  if (achievementAdminChannel !== null) {
    achievementAdminChannel.close();
    achievementAdminChannel = null;
  }
}

export function resetAchievementAdminBroadcastChannelAvailability(): void {
  isAchievementAdminBroadcastChannelAvailable = null;
}

// ─── External subscribers ────────────────────────────────────────────────

type AchievementAdminEventHandler = (event: AchievementAdminEvent) => void;

const achievementAdminSubscribers = new Set<AchievementAdminEventHandler>();

/**
 * Subscribe to achievement admin broadcast events.
 *
 * The handler is called for events from other tabs (same-tab
 * events are filtered out by `tabId`).
 *
 * @param handler - Callback invoked for each achievement admin event.
 * @returns Unsubscribe function.
 */
export function subscribeAchievementAdminInvalidate(
  handler: AchievementAdminEventHandler,
): () => void {
  achievementAdminSubscribers.add(handler);

  return () => {
    achievementAdminSubscribers.delete(handler);
  };
}

function dispatchToAchievementAdminSubscribers(
  event: AchievementAdminEvent,
): void {
  achievementAdminSubscribers.forEach((h) => {
    try {
      h(event);
    } catch (err) {
      logger.error(
        'admin.achievement.broadcast',
        'Error in achievement admin event subscriber',
        err,
      );
    }
  });
}

// ─── Message handler ─────────────────────────────────────────────────────

function handleAchievementAdminMessage(event: MessageEvent): void {
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const data = event.data as Partial<BaseAchievementAdminEvent>;

  if (!data.type || data.type !== 'admin:7.1.achievement-admin.invalidate') {
    return;
  }

  if (!data.tabId || typeof data.tabId !== 'string') {
    return;
  }

  if (!data.action || !['reevaluate', 'revoke'].includes(data.action)) {
    return;
  }

  if (!data.userId || typeof data.userId !== 'string') {
    return;
  }

  // Filter out same-tab broadcasts
  const myTabId = getCurrentTabId();
  if (data.tabId === myTabId) {
    return;
  }

  dispatchToAchievementAdminSubscribers(data as AchievementAdminInvalidatedEvent);
}

// ─── Channel initialization ───────────────────────────────────────────────

function initAchievementAdminChannel(): boolean {
  const channel = getAchievementAdminChannel();

  if (channel === null) {
    return false;
  }

  const channelObj = channel as unknown as { _listenerAdded?: boolean };
  if (!channelObj._listenerAdded) {
    channel.addEventListener('message', handleAchievementAdminMessage);
    channelObj._listenerAdded = true;
  }

  return true;
}

// ─── Broadcasting ────────────────────────────────────────────────────────

/**
 * Broadcast an achievement admin invalidation to all other tabs.
 *
 * Called by the mutation hooks (`useReevaluateUserAchievements`,
 * `useRevokeUserBadge`) once on success. Receiving tabs invalidate
 * the documented caches via `invalidateAchievementAdmin()`.
 *
 * @param payload - the broadcast payload
 */
export function broadcastAchievementAdminMutation(
  payload: {
    action: AchievementAdminMutation;
    userId: string;
    badgeId?: string;
    requestId: string;
  },
): void {
  initAchievementAdminChannel();

  const channel = getAchievementAdminChannel();
  if (channel === null) {
    // BroadcastChannel unavailable — local mutation's SWR invalidation still runs
    return;
  }

  if (!payload.userId || typeof payload.userId !== 'string') {
    return;
  }

  const fullEvent: AchievementAdminInvalidatedEvent = {
    type: 'admin:7.1.achievement-admin.invalidate',
    action: payload.action,
    userId: payload.userId,
    badgeId: payload.badgeId,
    requestId: payload.requestId,
    tabId: getCurrentTabId(),
    timestamp: Date.now(),
  };

  channel.postMessage(fullEvent);
}

/**
 * Default handler for achievement admin invalidation events.
 * Invalidates the user's badge and history caches.
 *
 * @param event - the broadcast event
 */
export function handleAchievementAdminInvalidation(
  event: AchievementAdminEvent,
): void {
  void invalidateAchievementAdmin(event.userId);
}
