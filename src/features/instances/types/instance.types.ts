/**
 * `instance.types.ts` — Story 5.7 instance types, lifecycle event payload
 * projections, error code union, and cache-key factories.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.A1.
 *
 * ## Purpose
 *
 * Single source of truth for the instance domain types, lifecycle event
 * payload projections, the `InstanceLifecycleErrorCode` union consumed by
 * every REST and WS hook in this story, and the SWR cache-key factories
 * used by `useInstance`, `useInstancePlayers`, and the realtime store.
 *
 * ## Type philosophy
 *
 * Types are feature-level projections of the verified service wrapper
 * outputs from Story 5.1 (`instances.service.ts`). The generated SDK
 * DTOs (`InstanceDetailResponseDto`, `InstancePlayerResponseDto`) are
 * extended with an `id` alias so SWR deduplication (via
 * `appendUniqueById`) works. Backend field names are preserved verbatim;
 * no handwritten backend models are duplicated.
 *
 * ## Lifecycle event payloads
 *
 * Three discriminated unions represent the events that the
 * `/instances` Socket.IO namespace emits during the lobby phase:
 *
 *   - `InstanceLifecycleEvent` — server-side status transitions
 *     (`instance_started`, `instance_closed`, `instance_cancelled`,
 *     `countdown_started`, `countdown_cancelled`).
 *   - `PlayerJoinEvent` — peer join notification.
 *   - `PlayerLeaveEvent` — peer leave notification.
 *
 * Every event payload includes `instanceId`, `at`, and `eventSequence`
 * so the realtime store can apply ordering and deduplication. The story
 * 5.8 question/answer payloads are intentionally out of scope here.
 *
 * ## Server authority
 *
 * The current user's role, the instance status, and the roster are all
 * sourced from the server. The client never infers a role from local
 * state and never transitions instance status client-side.
 *
 * ## SWR cache key factories
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are safe
 * to call inside `useMemo` and `useEffect` dependency arrays.
 */

import type {
  InstanceDetailResponseDto,
  InstanceDetailResponseDtoStatus,
  InstancePlayerResponseDto,
} from "@/lib/api/generated/schemas";

// ─── Status ────────────────────────────────────────────────────────────────

/**
 * Instance lifecycle status.
 *
 * The approved statuses for the Story 5.7 lobby surface. They mirror
 * the generated `InstanceDetailResponseDtoStatus` enum values:
 * `open`, `countdown`, `running`, `closed`, `finished`.
 *
 * `closed` and `finished` are terminal states — the lobby must render
 * the `InstanceClosedState` primitive (Batch C) and must not expose
 * further player actions. The `cancelled` status is reserved for the
 * server-driven explicit cancellation event and is normalised to
 * `closed` for rendering purposes.
 *
 * Status transitions are server-driven; the client never maps a
 * timestamp to a status.
 */
export type InstanceStatus = InstanceDetailResponseDtoStatus;

/**
 * Current user's role in an instance.
 *
 * `null` indicates the role is unknown (e.g. the detail hook has not
 * resolved yet, or the caller is unauthenticated). Permissive default
 * is the strictest permission set — see `useInstancePermissions`.
 */
export type InstanceRole = "host" | "player" | null;

// ─── Player status ────────────────────────────────────────────────────────

/**
 * Player status in an instance.
 *
 * Mirrors the generated `InstancePlayerResponseDtoStatus` enum values:
 * `joined`, `ready`, `playing`, `disconnected`, `finished`. The lobby
 * hides `playing` and `finished` rows (they belong to the play phase
 * in Story 5.8) and tracks `disconnected` players with a styled badge.
 */
export type InstancePlayerStatus = "joined" | "ready" | "playing" | "disconnected" | "finished";

// ─── Lifecycle error code union ────────────────────────────────────────────

/**
 * Error codes returned by the instance REST and Socket.IO endpoints.
 *
 * These codes are surfaced by `getInstance`, `getInstancePlayers`,
 * the lifecycle mutation hooks, and the `/instances` socket's error
 * frames. Components branch on these codes using `getUserCopy` from
 * Epic 5.1 D3 — never on HTTP status codes.
 *
 * The REST union is a strict subset of the global `ErrorCode` union
 * (`error-codes.ts`); the `UNAUTHORIZED`, `FORBIDDEN`, and
 * `INVALID_PREFERENCE_VALUE` codes are shared with the global table.
 * The WS-only `INSTANCE_AUTH_REQUIRED` code is the Story 5.7
 * mapping for `AUTH_TOKEN_EXPIRED` / `AUTH_INVALID_TOKEN` error frames
 * emitted on the `/instances` namespace.
 *
 * The story 5.7 backend documents the `INSTANCE_ALREADY_STARTED`,
 * `INSTANCE_ALREADY_CLOSED`, `INSTANCE_NOT_IN_COUNTDOWN`, and
 * `MIN_PLAYERS_NOT_MET` REST responses on the start route — these are
 * folded into `INSTANCE_INVALID_TRANSITION` for the player-facing copy
 * because the UI cannot meaningfully distinguish them. The underlying
 * transport code is preserved via `ApiError.code` for telemetry.
 */
export type InstanceLifecycleErrorCode =
  | "INSTANCE_NOT_FOUND"
  | "INSTANCE_CLOSED"
  | "INSTANCE_FULL"
  | "INSTANCE_ALREADY_JOINED"
  | "INSTANCE_NOT_JOINED"
  | "INSTANCE_HOST_REQUIRED"
  | "INSTANCE_FORBIDDEN"
  | "INSTANCE_INVALID_TRANSITION"
  | "INSTANCE_AUTH_REQUIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "GLOBAL_NOT_FOUND"
  | "GLOBAL_FORBIDDEN"
  | "GLOBAL_UNAUTHENTICATED"
  | "GLOBAL_VALIDATION_FAILED"
  | "GLOBAL_INTERNAL_ERROR";

/**
 * Every InstanceLifecycleErrorCode value as a readonly array.
 *
 * Useful for type-level tests and exhaustive `switch` checks.
 */
export const INSTANCE_LIFECYCLE_ERROR_CODES = [
  "INSTANCE_NOT_FOUND",
  "INSTANCE_CLOSED",
  "INSTANCE_FULL",
  "INSTANCE_ALREADY_JOINED",
  "INSTANCE_NOT_JOINED",
  "INSTANCE_HOST_REQUIRED",
  "INSTANCE_FORBIDDEN",
  "INSTANCE_INVALID_TRANSITION",
  "INSTANCE_AUTH_REQUIRED",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "GLOBAL_NOT_FOUND",
  "GLOBAL_FORBIDDEN",
  "GLOBAL_UNAUTHENTICATED",
  "GLOBAL_VALIDATION_FAILED",
  "GLOBAL_INTERNAL_ERROR",
] as const satisfies readonly InstanceLifecycleErrorCode[];

// ─── Domain types ─────────────────────────────────────────────────────────

/**
 * Instance summary derived from the detail projection.
 *
 * The Story 5.7 lobby uses the full detail endpoint; the summary type
 * is kept for future dashboards and the per-instance realtime store.
 */
export interface InstanceSummary {
  id: string;
  instanceId: string;
  quizId: string;
  quizTitle: string;
  quizSlug: string;
  status: InstanceStatus;
  hostUserId: string;
  hostUsername: string;
  hostDisplayName: string | null;
  maxPlayers: number | null;
  difficulty: string;
  durationMs: number;
  passingScorePercent: number;
  rewardXp: number;
  createdAt: string;
  startedAt: string | null;
  closedAt: string | null;
  updatedAt: string;
}

/**
 * Instance detail for the lobby surface.
 *
 * Extends the generated `InstanceDetailResponseDto` with an `id` alias
 * (matching the `tournament.types.ts` pattern) and a normalised
 * `currentUserRole` projection. The backend does not yet emit a
 * `currentUserRole` field; the projection is populated server-side
 * once the Story 5.7 detail endpoint is extended. Until then, the
 * hook derives the role from the roster + host user id (see
 * `useInstancePermissions`).
 */
export type InstanceDetail = InstanceDetailResponseDto & {
  /** Alias of `instanceId` for SWR deduplication. */
  id: string;
  /** Current user's role in the instance. `null` when unknown. */
  currentUserRole: InstanceRole;
};

/**
 * Instance player for the roster.
 *
 * Extends the generated `InstancePlayerResponseDto` with an `id` alias
 * (matching the `tournament.types.ts` pattern). The `id` field is
 * `userId` so the realtime store can deduplicate by `playerId` as
 * specified by the master plan.
 */
export type InstancePlayer = InstancePlayerResponseDto & {
  /** Alias of `userId` for SWR deduplication. */
  id: string;
  /** True when the player is the current user. Derived client-side for rendering only. */
  isCurrentUser: boolean;
  /** Convenience projection — true when the player is the host. */
  isHost: boolean;
};

// ─── Lifecycle event payload discriminated unions ─────────────────────────

/**
 * Discriminator for lifecycle events emitted by the `/instances`
 * namespace during the lobby phase (Story 5.7). The full play phase
 * (`question_revealed`, `answer_result`, `leaderboard_updated`) is
 * out of scope and is added by Story 5.8.
 */
export type InstanceLifecycleEventType =
  | "instance_started"
  | "instance_closed"
  | "instance_cancelled"
  | "countdown_started"
  | "countdown_cancelled";

/**
 * Server-driven lifecycle event payload.
 *
 * Each event includes `instanceId`, `at` (ISO 8601 timestamp), and an
 * `eventSequence` monotonic counter — the realtime store (B6)
 * deduplicates by `eventSequence` and drops stale numeric values.
 */
export interface InstanceLifecycleEvent {
  type: InstanceLifecycleEventType;
  instanceId: string;
  at: string;
  eventSequence: number;
  /** Final status after the transition. Only present for terminal events. */
  status?: InstanceStatus;
}

/**
 * Player join event payload.
 */
export interface PlayerJoinEvent {
  type: "player_joined";
  instanceId: string;
  player: InstancePlayer;
  at: string;
  eventSequence: number;
}

/**
 * Player leave event payload.
 */
export interface PlayerLeaveEvent {
  type: "player_left";
  instanceId: string;
  playerId: string;
  at: string;
  eventSequence: number;
}

/**
 * Union of every lobby-phase event payload emitted by the
 * `/instances` namespace.
 *
 * The realtime store consumes this union and dispatches updates
 * to the per-instance selectors. Components subscribe via
 * `useRealtimeQuery` (B6) which never re-derives the event type
 * from the raw Socket.IO frame.
 */
export type InstanceSocketEvent =
  | InstanceLifecycleEvent
  | PlayerJoinEvent
  | PlayerLeaveEvent;

/**
 * Realtime Socket.IO connection state for the per-instance Socket.IO
 * connection. Mirrors the `SocketConnectionState` union from Epic 5.1
 * so the selection shape is consistent with `useSocket`.
 */
export type InstanceSocketConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "auth_failed";

// ─── Mutation result shapes ───────────────────────────────────────────────

/**
 * Result of a successful join mutation.
 *
 * The backend returns a `JoinInstanceResponseDto` containing a
 * human-readable `message`; the hook synthesises a richer result
 * shape from the SWR revalidation pass after the join succeeds.
 */
export interface InstanceJoinOutcome {
  instanceId: string;
  currentUserRole: InstanceRole;
  joinedAt: string;
}

/**
 * Result of a successful leave mutation.
 *
 * Leave is exposed as a socket emit (per the master plan); the
 * REST leave endpoint is intentionally not part of the public
 * mutation surface in Story 5.7. The shape is preserved for the
 * mutation hook contract.
 */
export interface InstanceLeaveOutcome {
  instanceId: string;
  leftAt: string;
}

/**
 * Result of a successful start (host) mutation.
 */
export interface InstanceStartOutcome {
  instanceId: string;
  status: InstanceStatus;
  startedAt: string;
}

/**
 * Result of a successful close (host) mutation.
 */
export interface InstanceCloseOutcome {
  instanceId: string;
  status: InstanceStatus;
  closedAt: string;
}

/**
 * Local mutation state machine for the lobby CTAs.
 *
 * Mirrors the `RegistrationMutationState` (TKT-5.3.A1) and
 * `NotificationMutationState` (TKT-5.4.A1) state machines.
 *
 * State transitions:
 *   idle → pending (on mutation call)
 *   pending → success (on success)
 *   pending → error (on failure)
 *   success → idle (after 1 s or on next interaction)
 *   error → idle (when user resets or retries)
 */
export type InstanceLifecycleMutationState =
  | "idle"
  | "pending"
  | "success"
  | "error";

// ─── Permissions ──────────────────────────────────────────────────────────

/**
 * Derived permission set for the current user against an instance.
 *
 * Source of truth is the server-provided `currentUserRole` and
 * `status` on `InstanceDetail`. The client never grants a permission
 * based on local state alone. When `role` is `null` (unauthenticated
 * or detail not yet resolved) every permission is `false`.
 */
export interface InstancePermissions {
  canJoin: boolean;
  canLeave: boolean;
  canStart: boolean;
  canCancel: boolean;
  canClose: boolean;
  role: InstanceRole;
  isAuthenticated: boolean;
}

// ─── SWR cache keys ───────────────────────────────────────────────────────

/**
 * SWR cache keys for the Story 5.7 instance surfaces.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are safe
 * to call inside `useMemo` and `useEffect` dependency arrays.
 *
 * ## Invalidation strategy
 *
 * After a successful join/leave/start/close mutation, the affected
 * keys must be invalidated:
 *   1. `detail` — the user's role and the instance status may change
 *   2. `players` — the roster may change after join/leave
 *
 * Use `INSTANCE_CACHE_KEYS.all()` to get the full invalidation set
 * in one call.
 */
export const INSTANCE_CACHE_KEYS = {
  /**
   * SWR key for a single instance detail.
   */
  detail(instanceId: string) {
    return ["instances", "detail", instanceId] as const;
  },

  /**
   * SWR key for the player roster of an instance.
   */
  players(instanceId: string) {
    return ["instances", "players", instanceId] as const;
  },

  /**
   * SWR key for the per-instance realtime store.
   *
   * Used by `useRealtimeQuery` (B6) to read the realtime-derived
   * merge state. The REST hooks do not consult this key — it is
   * owned exclusively by the realtime bridge.
   */
  realtime(instanceId: string) {
    return ["instances", "realtime", instanceId] as const;
  },

  /**
   * Returns the full invalidation key set for after a lifecycle
   * mutation. Use this to invalidate all instance-related SWR keys
   * after a successful join/leave/start/close mutation:
   *   - Instance detail (role, status, etc.)
   *   - Player roster
   *
   * @example
   *   const keys = INSTANCE_CACHE_KEYS.all(instanceId);
   *   await Promise.all([
   *     mutate(keys.detail, undefined, { revalidate: true }),
   *     mutate(keys.players, undefined, { revalidate: true }),
   *   ]);
   */
  all(instanceId: string) {
    return {
      detail: this.detail(instanceId),
      players: this.players(instanceId),
    } as const;
  },
} as const;

/**
 * Type helper for `INSTANCE_CACHE_KEYS.all()` return value.
 */
export type InstanceInvalidationKeys = ReturnType<
  (typeof INSTANCE_CACHE_KEYS)["all"]
>;
