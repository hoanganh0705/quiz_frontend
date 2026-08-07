/**
 * `features/admin/tournament-admin/cache/tournament-admin-cross-tab.ts`
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.G2.
 *
 * ## Purpose
 *
 * Cross-tab invalidation channel for tournament admin mutations. When an
 * admin performs a tournament mutation (create / update / delete) in one
 * tab, every other tab that has `/admin/tournaments` open must revalidate
 * its caches so the new state shows up on the next render.
 *
 * ## Design
 *
 * Mirrors the Phase 4 / Phase 6 cross-tab pattern:
 *
 *   - dedicated `BroadcastChannel` named `'phase7-admin-tournament'` so the
 *     tab-event payloads are independent of the auth, bookmarks, and other
 *     admin channels.
 *   - singleton channel instance (lazily created on first broadcast)
 *     so listeners register exactly once per tab.
 *   - same-tab filtering via `getCurrentTabId()` so the source tab
 *     does not echo its own broadcast.
 *   - graceful degradation: when `BroadcastChannel` is unavailable
 *     (older browsers, private mode, server-side rendering), broadcast
 *     and subscribe are both safe no-ops. Local-tab invalidation is
 *     unaffected.
 *   - external subscribers via `subscribeTournamentAdminInvalidate(handler)` —
 *     any caller can listen without coupling to the channel
 *     internals.
 *
 * ## Event shape
 *
 * Single event type: `phase7:admin.tournament-admin.invalidate`. The payload
 * carries `mutation` (the kind of mutation that triggered the
 * revalidation) and `tournamentId` (the affected tournament id). The receiving
 * tab invalidates the admin list and public tournament caches via the
 * helpers in `tournament-admin-cache-keys.ts`.
 *
 * ## Wiring
 *
 * Every mutation hook (`useCreateTournament`, `useUpdateTournament`,
 * `useDeleteTournament`) calls `broadcastTournamentAdminInvalidate(...)`
 * once on success. The `TournamentAdminPage` listens via
 * `subscribeTournamentAdminInvalidate(handler)` and invalidates the
 * documented caches.
 */

import { getCurrentTabId } from '@/lib/api/core/broadcast-channel';

// ─── Channel name ─────────────────────────────────────────────────────────

/**
 * Channel name used for all tournament admin broadcasts. Distinct from the
 * auth (`'auth'`), bookmarks (`'bookmarks'`), and other admin
 * channels so the messages are independent BroadcastChannels at the
 * browser level.
 */
export const TOURNAMENT_ADMIN_CHANNEL_NAME = 'phase7-admin-tournament' as const;

// ─── Event types ──────────────────────────────────────────────────────────

/**
 * Event types for tournament admin broadcast messages.
 *
 * Currently a single event type; the union exists so future tournament
 * admin events can be added without breaking the discriminated-union contract.
 */
export type TournamentAdminEventType = 'phase7:admin.tournament-admin.invalidate';

/**
 * Discriminator for which mutation triggered the revalidation. Lets
 * receiving tabs log / branch on the source if needed.
 */
export type TournamentAdminMutation = 'create' | 'update' | 'delete';

/**
 * Base interface for all tournament admin broadcast events.
 */
export interface BaseTournamentAdminEvent {
  type: TournamentAdminEventType;
  /** The tab that sent this event. Used for same-tab filtering. */
  tabId: string;
  /** Unix timestamp when the event was created. */
  timestamp: number;
  /** The mutation that triggered the broadcast. */
  mutation: TournamentAdminMutation;
  /** The affected tournament id. */
  tournamentId: string;
}

/**
 * Event emitted when any tournament admin mutation has been confirmed by
 * the server. Receiving tabs revalidate the admin tournament list and the
 * public tournament caches so the next render reflects the new state.
 */
export interface TournamentAdminInvalidatedEvent extends BaseTournamentAdminEvent {
  type: 'phase7:admin.tournament-admin.invalidate';
}

/**
 * Union of all possible tournament admin broadcast events.
 */
export type TournamentAdminEvent = TournamentAdminInvalidatedEvent;

// ─── Channel singleton ─────────────────────────────────────────────────────

/**
 * The singleton BroadcastChannel instance for tournament admin events.
 * Lazily initialized on first access.
 */
let tournamentAdminChannel: BroadcastChannel | null = null;

/**
 * Flag indicating whether BroadcastChannel is available.
 */
let isTournamentAdminBroadcastChannelAvailable: boolean | null = null;

/**
 * Check if BroadcastChannel is available.
 */
function checkBroadcastChannelAvailable(): boolean {
  if (isTournamentAdminBroadcastChannelAvailable !== null) {
    return isTournamentAdminBroadcastChannelAvailable;
  }

  if (typeof BroadcastChannel === 'undefined') {
    isTournamentAdminBroadcastChannelAvailable = false;
    return false;
  }

  try {
    new BroadcastChannel('test');
    isTournamentAdminBroadcastChannelAvailable = true;
  } catch {
    isTournamentAdminBroadcastChannelAvailable = false;
  }

  return isTournamentAdminBroadcastChannelAvailable;
}

/**
 * Get the singleton tournament admin BroadcastChannel.
 *
 * Lazily creates the channel on first call. Subsequent calls return
 * the same instance.
 *
 * @returns The BroadcastChannel instance, or null if unavailable
 */
export function getTournamentAdminChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!checkBroadcastChannelAvailable()) {
    return null;
  }

  if (tournamentAdminChannel === null) {
    tournamentAdminChannel = new BroadcastChannel(TOURNAMENT_ADMIN_CHANNEL_NAME);
  }

  return tournamentAdminChannel;
}

/**
 * Close the tournament admin channel (for cleanup/testing).
 * After calling this, `getTournamentAdminChannel()` will create a new channel.
 */
export function closeTournamentAdminChannel(): void {
  if (tournamentAdminChannel !== null) {
    tournamentAdminChannel.close();
    tournamentAdminChannel = null;
  }
}

/**
 * Reset the availability flag (for testing).
 */
export function resetTournamentAdminBroadcastChannelAvailability(): void {
  isTournamentAdminBroadcastChannelAvailable = null;
}

/**
 * Reset the singleton channel (for testing only).
 * @internal
 */
export function __resetTournamentAdminChannelForTest(): void {
  tournamentAdminChannel = null;
}

// ─── External subscribers ─────────────────────────────────────────────────

type TournamentAdminEventHandler = (event: TournamentAdminEvent) => void;

const tournamentAdminSubscribers = new Set<TournamentAdminEventHandler>();

/**
 * Subscribe to tournament admin broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab
 * events are filtered out by `tabId`).
 *
 * @param handler - Callback invoked for each tournament admin event.
 * @returns Unsubscribe function.
 */
export function subscribeTournamentAdminInvalidate(
  handler: TournamentAdminEventHandler,
): () => void {
  tournamentAdminSubscribers.add(handler);

  return () => {
    tournamentAdminSubscribers.delete(handler);
  };
}

/**
 * Dispatch an event to all external subscribers.
 * Internal use only — called by the channel message handler.
 */
function dispatchToTournamentAdminSubscribers(
  event: TournamentAdminEvent,
): void {
  tournamentAdminSubscribers.forEach((handler) => {
    try {
      handler(event);
    } catch (err) {
      console.error(
        '[tournament-admin] Error in tournament admin event subscriber:',
        err,
      );
    }
  });
}

// ─── Message handler ──────────────────────────────────────────────────────

/**
 * Handle an incoming tournament admin broadcast message.
 * Filters out same-tab messages and dispatches to subscribers.
 */
function handleTournamentAdminMessage(event: MessageEvent): void {
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const data = event.data as Partial<TournamentAdminInvalidatedEvent>;

  // Must have a valid type
  if (!data.type || data.type !== 'phase7:admin.tournament-admin.invalidate') {
    return;
  }

  // Must have a tabId
  if (!data.tabId || typeof data.tabId !== 'string') {
    return;
  }

  // Must have a mutation discriminator
  if (!data.mutation || !['create', 'update', 'delete'].includes(data.mutation)) {
    return;
  }

  // Must have a tournamentId
  if (!data.tournamentId || typeof data.tournamentId !== 'string') {
    return;
  }

  // Filter out same-tab broadcasts (prevent event loops)
  const myTabId = getCurrentTabId();
  if (data.tabId === myTabId) {
    return;
  }

  // Dispatch to subscribers
  dispatchToTournamentAdminSubscribers(data as TournamentAdminEvent);
}

// ─── Channel initialization ───────────────────────────────────────────────

/**
 * Initialize the tournament admin channel listener.
 * Called internally by `broadcastTournamentAdminInvalidate()` but can be
 * called explicitly.
 *
 * @returns true if initialization succeeded, false if BroadcastChannel unavailable
 */
export function initTournamentAdminChannel(): boolean {
  const channel = getTournamentAdminChannel();

  if (channel === null) {
    return false;
  }

  // Only add listener once (channel is a singleton)
  const channelObj = channel as unknown as { _listenerAdded?: boolean };
  if (!channelObj._listenerAdded) {
    channel.addEventListener('message', handleTournamentAdminMessage);
    channelObj._listenerAdded = true;
  }

  return true;
}

// ─── Broadcasting ────────────────────────────────────────────────────────

/**
 * Broadcast a tournament admin invalidation to all other tabs.
 *
 * Called by the three mutation hooks (`useCreateTournament`,
 * `useUpdateTournament`, `useDeleteTournament`) once on success.
 * Receiving tabs revalidate the admin tournament list and the public
 * tournament caches via the helpers in `tournament-admin-cache-keys.ts`.
 *
 * @param mutation — the mutation that triggered the broadcast.
 * @param tournamentId — the affected tournament id.
 */
export function broadcastTournamentAdminInvalidate(
  mutation: TournamentAdminMutation,
  tournamentId: string,
): void {
  // Ensure channel is initialized (sets up listener if not already)
  initTournamentAdminChannel();

  const channel = getTournamentAdminChannel();
  if (channel === null) {
    // BroadcastChannel unavailable — the local mutation's
    // `mutate(key)` invalidation still runs so the source tab is correct.
    return;
  }

  if (!tournamentId || typeof tournamentId !== 'string') {
    // Defensive: never publish an event without a tournamentId.
    // Receiving tabs require the tournamentId to identify the affected row.
    return;
  }

  const fullEvent: TournamentAdminInvalidatedEvent = {
    type: 'phase7:admin.tournament-admin.invalidate',
    mutation,
    tournamentId,
    tabId: getCurrentTabId(),
    timestamp: Date.now(),
  };

  channel.postMessage(fullEvent);
}
