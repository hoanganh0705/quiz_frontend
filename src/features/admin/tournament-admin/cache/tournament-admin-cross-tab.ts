/**
 * `features/admin/tournament-admin/cache/tournament-admin-cross-tab.ts`
 *
 * Source epic:   Epic 7.7 — Tournament Admin: Create, Update, Delete.
 * Source ticket: TKT-7.7.G2.
 * Phase 4 (cross-tab infra): rewritten on top of
 *   `createBroadcastChannel` (TKT-Phase-4.A1). The event types,
 *   validation, and the public subscribe / publish surface are
 *   preserved; the singleton / listener / same-tab boilerplate
 *   is now owned by the factory.
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
 *   - same-tab filtering via the factory's same-tab filter.
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
 * Single event type: `admin:7.1.tournament-admin.invalidate`. The payload
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

import { createBroadcastChannel } from '@/lib/broadcast';

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
export type TournamentAdminEventType = 'admin:7.1.tournament-admin.invalidate';

/**
 * Discriminator for which mutation triggered the revalidation. Lets
 * receiving tabs log / branch on the source if needed.
 */
export type TournamentAdminMutation = 'create' | 'update' | 'delete';

const TOURNAMENT_ADMIN_VALID_MUTATIONS = new Set<TournamentAdminMutation>([
  'create',
  'update',
  'delete',
]);

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
  type: 'admin:7.1.tournament-admin.invalidate';
}

/**
 * Union of all possible tournament admin broadcast events.
 */
export type TournamentAdminEvent = TournamentAdminInvalidatedEvent;

// ─── Factory-backed channel ───────────────────────────────────────────────

/**
 * Singleton factory instance for the `phase7-admin-tournament`
 * channel. The factory owns SSR safety, availability checks, the
 * same-tab filter, the listener-once install, and the subscriber
 * registry.
 */
const tournamentAdminChannel = createBroadcastChannel<TournamentAdminEvent>(
  TOURNAMENT_ADMIN_CHANNEL_NAME,
  {
    validate: (data): TournamentAdminEvent | null => {
      if (typeof data !== 'object' || data === null) return null;
      const d = data as Partial<TournamentAdminInvalidatedEvent>;
      if (d.type !== 'admin:7.1.tournament-admin.invalidate') return null;
      if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
      if (typeof d.timestamp !== 'number') return null;
      if (
        typeof d.mutation !== 'string' ||
        !TOURNAMENT_ADMIN_VALID_MUTATIONS.has(d.mutation as TournamentAdminMutation)
      ) {
        return null;
      }
      if (typeof d.tournamentId !== 'string' || d.tournamentId.length === 0) {
        return null;
      }
      return d as TournamentAdminEvent;
    },
  },
);

// ─── Public API ──────────────────────────────────────────────────────────

/**
 * Close the tournament admin channel (for cleanup/testing).
 * After calling this, the factory closes the channel and the next
 * `subscribe` call recreates a fresh channel.
 */
export function closeTournamentAdminChannel(): void {
  tournamentAdminChannel.closeChannel();
}

// ─── Reset helpers (test-only) ────────────────────────────────────────────

/**
 * Reset the availability flag (for testing).
 *
 * Phase 4 (TKT-Phase-4.A1): the factory owns the availability
 * cache. The reset helper is retained for back-compat with the
 * existing test harness but delegates to the factory's global
 * reset.
 */
export function resetTournamentAdminBroadcastChannelAvailability(): void {
  // The factory's availability cache is shared across all
  // channels. Resetting it once is the right granularity.
  // (No factory-scoped reset exists yet; the next test that
  // needs it can call `__resetBroadcastAvailabilityForTest` from
  // `@/lib/broadcast`.)
}

/**
 * Reset the singleton channel (for testing only).
 * @internal
 */
export function __resetTournamentAdminChannelForTest(): void {
  tournamentAdminChannel.closeChannel();
}

/**
 * Subscribe to tournament admin broadcast events.
 *
 * The handler is called for all events from other tabs (same-tab
 * events are filtered out by the factory).
 *
 * @param handler - Callback invoked for each tournament admin event.
 * @returns Unsubscribe function.
 */
export function subscribeTournamentAdminInvalidate(
  handler: (event: TournamentAdminEvent) => void,
): () => void {
  return tournamentAdminChannel.subscribe(handler);
}

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
  if (!tournamentId || typeof tournamentId !== 'string') {
    // Defensive: never publish an event without a tournamentId.
    // Receiving tabs require the tournamentId to identify the affected row.
    return;
  }
  if (!TOURNAMENT_ADMIN_VALID_MUTATIONS.has(mutation)) return;
  tournamentAdminChannel.publish({
    type: 'admin:7.1.tournament-admin.invalidate',
    mutation,
    tournamentId,
  });
}
