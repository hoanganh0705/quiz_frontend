/**
 * Attempts Broadcast Channel — user-scoped cross-tab attempt-lifecycle
 * invalidation.
 *
 * Source epic:   Story 4.13 / 4.14 / 4.15 (Phase 4 attempt lifecycle).
 * Source ticket: TKT-4.1.B2.
 * Phase 4 (cross-tab infra): rewritten on top of
 *   `createBroadcastChannel` (TKT-Phase-4.A1). The event types,
 *   validation, and the public subscribe / publish surface are
 *   preserved; the singleton / listener / same-tab boilerplate
 *   is now owned by the factory.
 *
 * ## Purpose
 *
 * Mirrors the design of `broadcast-channel.ts` (Epic 2.7) and
 * `bookmarks-broadcast-channel.ts` (Story 3.10). Cross-tab notification
 * of attempt-lifecycle mutations (`start`, `submit`, `withdraw`,
 * `abandon`, `complete`) so every tab can revalidate its SWR caches
 * keyed on the same `attemptId` and rerender any subscribed
 * `<AttemptRunner />` / `<AttemptSummaryListItem />` UI.
 *
 * The channel name `attempts` is chosen to mirror the auth (`auth`)
 * and bookmarks (`bookmarks`) channel-naming convention.
 *
 * ## Message Types
 *
 * | Type                  | Direction | Payload                                  |
 * |-----------------------|-----------|------------------------------------------|
 * | `attempts/changed`    | → others  | `userId`, `attemptId`, `kind`, `tabId`,  |
 * |                       |           | `timestamp`                              |
 *
 * `kind` is one of `'start' | 'submit' | 'withdraw' | 'abandon' | 'complete'`.
 * The receiving tab (the `<AttemptRunner />` orchestrator's listener,
 * the `useMyAttempts` SWR hook, etc.) inspects `kind` to decide whether
 * to drop an in-flight optimistic mutation or just revalidate.
 *
 * ## User + attempt scoping
 *
 * `userId` scopes the invalidation to the authenticated user; receiving
 * tabs ignore events published by other users. `attemptId` scopes
 * which attempt's caches to revalidate; receiving tabs only revalidate
 * the cached key for that `attemptId` (or, for the `useMyAttempts`
 * list, re-fetch the list).
 *
 * ## Same-tab filtering
 *
 * Each tab has a unique `tabId` so it can ignore its own broadcasts.
 * The tab identity is shared with the auth and bookmark channels via
 * `getCurrentTabId()` from `broadcast-channel.ts`.
 *
 * ## Graceful degradation
 *
 * Falls back gracefully when `BroadcastChannel` is unavailable (older
 * browsers, private browsing, server-side rendering). Subscribers
 * simply never receive the event in those environments; the source
 * tab's own `mutate(key)` invalidation still runs so the source tab is
 * correct.
 */
import { createBroadcastChannel } from '@/lib/broadcast';

/**
 * Channel name used for all attempt broadcasts.
 *
 * Distinct from `auth` and `bookmarks` so the three channels'
 * `MessageEvent` payloads are independent at the browser level.
 */
export const ATTEMPTS_CHANNEL_NAME = 'attempts';

/**
 * Event types for attempt broadcast messages.
 *
 * A single event type, unioned so future attempt events (e.g.
 * `attempts/review-available`) can be added without breaking the
 * discriminated-union contract.
 */
export type AttemptEventType = 'attempts/changed';

/**
 * Discriminator describing which attempt-lifecycle mutation produced
 * the event. Receiving tabs consult this to decide whether to drop a
 * in-flight optimistic mutation (e.g. an unresolved `attempts/changed`
 * with `kind: 'complete'` cancels a pending `submit-answer` mutation).
 */
export type AttemptChangeKind =
  | 'start'
  | 'submit'
  | 'withdraw'
  | 'abandon'
  | 'complete';

export interface BaseAttemptEvent {
  type: AttemptEventType;
  /** The tab that sent this event. Used for same-tab filtering. */
  tabId: string;
  /** Unix timestamp when the event was created. */
  timestamp: number;
}

/**
 * Event emitted when a server-confirmed attempt-lifecycle mutation
 * occurs. Receiving tabs revalidate:
 *
 *   - the per-attempt SWR cache keyed on `attemptId`
 *     (e.g. `['attempt', attemptId]`)
 *   - the `useMyAttempts` list cache (key `['my-attempts']`)
 *   - the `useMyAttemptStats` cache (key `['my-attempt-stats']`)
 *
 * The `kind` field lets listeners branch on which mutation actually
 * happened (e.g. dropping a pending optimistic toggle vs. just
 * invalidating a list).
 */
export interface AttemptsChangedEvent extends BaseAttemptEvent {
  type: 'attempts/changed';
  /** The authenticated user's ID whose attempt changed. */
  userId: string;
  /** The attempt whose lifecycle changed. */
  attemptId: string;
  /** Which lifecycle mutation produced this event. */
  kind: AttemptChangeKind;
}

/**
 * Union of all possible attempt broadcast events.
 */
export type AttemptEvent = AttemptsChangedEvent;

const ATTEMPT_VALID_KINDS = new Set<AttemptChangeKind>([
  'start',
  'submit',
  'withdraw',
  'abandon',
  'complete',
]);

// ─── Factory-backed channel ───────────────────────────────────────────────

/**
 * Singleton factory instance for the `attempts` channel.
 */
const attemptsChannel = createBroadcastChannel<AttemptEvent>(ATTEMPTS_CHANNEL_NAME, {
  validate: (data): AttemptEvent | null => {
    if (typeof data !== 'object' || data === null) return null;
    const d = data as Partial<AttemptsChangedEvent>;
    if (d.type !== 'attempts/changed') return null;
    if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
    if (typeof d.userId !== 'string' || d.userId.length === 0) return null;
    if (typeof d.attemptId !== 'string' || d.attemptId.length === 0) return null;
    if (typeof d.kind !== 'string' || !ATTEMPT_VALID_KINDS.has(d.kind as AttemptChangeKind)) {
      return null;
    }
    return d as AttemptEvent;
  },
});

// ─── Public API ──────────────────────────────────────────────────────────

/** Close the attempts channel (for cleanup/testing). */
export function closeAttemptsChannel(): void {
  attemptsChannel.closeChannel();
}

/**
 * Back-compat accessor for the singleton channel. Returns the
 * underlying `BroadcastChannel` instance.
 */
export function getAttemptsChannel(): BroadcastChannel | null {
  return attemptsChannel.getChannel();
}

/**
 * Subscribe to attempt broadcast events. Same-tab events are
 * filtered out by the factory.
 * @returns Unsubscribe function
 */
export function subscribeToAttemptEvents(
  handler: (event: AttemptEvent) => void,
): () => void {
  return attemptsChannel.subscribe(handler);
}

/**
 * Broadcast an attempt-lifecycle mutation to all other tabs.
 *
 * @example
 *   broadcastAttemptsChanged({
 *     userId: 'u-1', attemptId: 'att-42', kind: 'submit',
 *   });
 */
export function broadcastAttemptsChanged(params: {
  userId: string;
  attemptId: string;
  kind: AttemptChangeKind;
}): void {
  // Always instantiate the channel up-front (mirrors the original
  // module's behavior).
  attemptsChannel.ensureChannel();
  if (
    !params.userId ||
    typeof params.userId !== 'string' ||
    !params.attemptId ||
    typeof params.attemptId !== 'string' ||
    !params.kind
  ) {
    return;
  }
  attemptsChannel.publish({
    type: 'attempts/changed',
    userId: params.userId,
    attemptId: params.attemptId,
    kind: params.kind,
  });
}
