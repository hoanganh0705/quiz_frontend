/**
 * `cross-tab-broadcast.ts` — single import surface for cross-tab
 * invalidation events emitted by the optimistic-mutation
 * primitive.
 *
 * Source epic:   Epic 4.1.
 * Source ticket: TKT-4.1.B2.
 *
 * ## Status (Phase 11 / P2-120)
 *
 * Phase 11 cleanup noted that this module started life as a
 * *temporary* facade grouping the Phase-4 envelopes (`attempts/changed`
 * and `profile/updated`) behind one union so the E1 hook could
 * import from a single source. Once Phase 4 shipped and the
 * per-feature channels (`attempts-broadcast-channel.ts`,
 * `profile-broadcast-channel.ts`) became stable, the facade was a
 * candidate for retirement.
 *
 * However, `useOptimisticMutation` (Phase 6) leans on the
 * `emitPhase4Broadcast(env)` dispatcher and the
 * `Phase4BroadcastBareMessage` discriminated union to keep mutation
 * hooks (`useFollow` / `useUnfollow` / `useBlock` /
 * `useSendFriendRequest` / `useRespondFriendRequest`) terse.
 * Inlining the discriminator into `useOptimisticMutation` would
 * leak per-feature channel details into a shared primitive.
 *
 * Decision: keep the facade as permanent integration glue. The
 * P2-120 ticket is therefore closed by *documenting* the long-term
 * status, not by deleting the module. New event families should
 * either join the existing two (`attempts/changed`,
 * `profile/updated`) or open their own per-feature channel next to
 * `attempts-broadcast-channel.ts` / `profile-broadcast-channel.ts`
 * — do **not** add new branches to the `emitPhase4Broadcast`
 * dispatcher.
 *
 * ## Why a facade (not a new `BroadcastChannel`)
 *
 * TKT-4.1.B2's original sketch proposed a new channel name
 * `phase4/invalidation`. After auditing the existing convention
 * (`auth`, `bookmarks` — one channel per feature surface), the
 * facade-decided design is:
 *
 *   - Add per-feature channels next to the existing ones
 *     (`attempts-broadcast-channel.ts`, `profile-broadcast-channel.ts`).
 *   - This facade re-exports their types, payload shapes, and the
 *     two `broadcast*` emitters under one umbrella, so the E1 hook
 *     has a single import path.
 *   - No new `BroadcastChannel` global is opened; cross-tab
 *     invalidation continues to flow through the existing per-feature
 *     channels.
 *
 * The discriminator (`env.type`) is the same string already used
 * inside each per-feature channel (`attempts/changed`,
 * `profile/updated`), so a listener that subscribes to a single
 * channel still works the same way.
 *
 * ## Same-tab filtering
 *
 * Inherited from `broadcast-channel.ts`'s `getCurrentTabId()` — both
 * per-feature channels read the shared tab id from the auth module,
 * so a tab that emits via `emitPhase4Broadcast` will not see its own
 * message routed back through any `subscribeToAttemptEvents` /
 * `subscribeToProfileEvents` listener.
 */
import {
  broadcastAttemptsChanged,
  subscribeToAttemptEvents,
  type AttemptChangeKind,
  type AttemptEvent,
  type AttemptsChangedEvent,
  ATTEMPTS_CHANNEL_NAME,
} from "./attempts-broadcast-channel";
import {
  broadcastProfileUpdated,
  subscribeToProfileEvents,
  type ProfileUpdateKind,
  type ProfileEvent,
  type ProfileUpdatedEvent,
  PROFILE_CHANNEL_NAME,
} from "./profile-broadcast-channel";

// ─── Envelope ──────────────────────────────────────────────────────────────

/**
 * The shape of every Phase 4 cross-tab invalidation event, regardless
 * of which sub-channel it travels on. Discriminator is `type`.
 *
 * Kept as a union for the E1 hook so a single `switch (env.type)` can
 * route the invalidation to the correct SWR keys.
 */
export type Phase4BroadcastMessage = AttemptsChangedEvent | ProfileUpdatedEvent;

/**
t
 * narrowing key for `Phase4BroadcastMessage` is `type`.
 */
export type Phase4BroadcastBareMessage = Phase4BroadcastMessage;

export type Phase4BroadcastEnvelope = {
  [K in Phase4BroadcastMessage as K["type"]]: K;
};

/**
 * The payload shapes a listener may want to consume. Re-exported from
 * the per-feature modules for callers that don't want to import two
 * places; identical to `Phase4BroadcastMessage` but documented as a
 * "payload" for clarity.
 */
export type Phase4BroadcastPayload = Phase4BroadcastMessage;

// ─── Discriminated-extra types ──────────────────────────────────────────────

export type { AttemptChangeKind };
export type { ProfileUpdateKind };

// ─── Re-exports ─────────────────────────────────────────────────────────────

export {
  ATTEMPTS_CHANNEL_NAME,
  PROFILE_CHANNEL_NAME,
  broadcastAttemptsChanged,
  broadcastProfileUpdated,
  subscribeToAttemptEvents,
  subscribeToProfileEvents,
};

export type {
  AttemptEvent,
  AttemptsChangedEvent,
  ProfileEvent,
  ProfileUpdatedEvent,
};

// ─── Facade emit ────────────────────────────────────────────────────────────

/**
 * Emit a Phase 4 cross-tab invalidation. Routes `env.type` to the
 * matching per-feature `broadcast*` helper.
 *
 * @param env - The event to publish.
 */
export function emitPhase4Broadcast(env: Phase4BroadcastMessage): void {
  switch (env.type) {
    case "attempts/changed":
      broadcastAttemptsChanged({
        userId: env.userId,
        attemptId: env.attemptId,
        kind: env.kind,
      });
      return;
    case "profile/updated":
      broadcastProfileUpdated({
        userId: env.userId,
        kind: env.kind,
      });
      return;
    default: {
      // Type-narrowing safety net. Should be unreachable.
      const _exhaustive: never = env;
      throw new Error(
        `[cross-tab-broadcast] unknown event type: ${JSON.stringify(_exhaustive)}`,
      );
    }
  }
}
