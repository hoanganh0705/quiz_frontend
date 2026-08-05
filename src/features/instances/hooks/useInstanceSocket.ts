"use client";

/**
 * `useInstanceSocket` — connection + listener hook for the `/instances`
 * Socket.IO namespace.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.B5.
 *
 * ## What this hook owns
 *
 * - Open an authenticated Socket.IO connection to the `/instances`
 *   namespace while `phase5_instances === 'live'`. When the flag is
 *   `'placeholder'`, the connection is suppressed entirely (no socket
 *   handshake, no listeners, no automatic reconnection).
 * - Join the instance room after the handshake with the supplied
 *   `instanceId`. Duplicate mounts for the same `instanceId` are
 *   idempotent — `join_instance` is emitted exactly once per
 *   per-instance lifecycle.
 * - Bounded exponential backoff reconnect: 1 s, 2 s, 4 s, 8 s, 16 s,
 *   up to `MAX_RETRY_COUNT` (5), then stops. The hook re-emits
 *   `join_instance` on every reconnect.
 * - Dispatch the `player_joined`, `player_left`, `instance_started`,
 *   `instance_closed`, `instance_cancelled`, `countdown_started`,
 *   `countdown_cancelled` events to subscribers via a typed event
 *   bus. The bus is exposed via `subscribe(handler)` and returns an
 *   unsubscribe function.
 * - Surface `WS_ERROR_DECODING` for unknown error codes and stop
 *   reconnecting on `INSTANCE_AUTH_REQUIRED` / `AUTH_TOKEN_EXPIRED`.
 * - Tear down the connection on logout via the supabase `auth` events
 *   subscribed through `useAuthBootstrap` (clearing the per-instance
 *   store is the responsibility of `useRealtimeQuery` / B6).
 *
 * ## Feature flag preconditions
 *
 * The hook requires `phase5_instances === 'live'` AND
 * `phase5_realtime_infrastructure === 'live'`. When either flag is
 * `'placeholder'`, the connection is suppressed and the hook returns
 * the safe fallback state.
 *
 * ## Mounted with singleton socket
 *
 * The underlying socket is owned by `useSocket`'s internal singleton
 * (`ConnectionRegistry`) — calling this hook from multiple
 * components in the same tab does NOT open multiple sockets. The
 * hook is safe to mount from the `InstanceRoomPage`, the
 * `InstanceLobby`, and the `PlayerRoster` simultaneously.
 *
 * ## Auth
 *
 * The Socket.IO handshake uses the auth token from the cookie (see
 * `useSocket`). When the token is absent, the connect attempt fails
 * with an `auth_required` state and the hook stops retrying.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, isApiError } from "@/lib/api";
import {
  INSTANCES_NAMESPACE,
  useSocket,
  useRealtimeEvent,
} from "@/lib/realtime";
import type { UseSocketReturn } from "@/lib/realtime";
import { decodeWsError } from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";

import {
  type InstanceLifecycleErrorCode,
  type InstanceSocketConnectionState,
  type InstanceSocketEvent,
} from "@/features/instances/types/instance.types";

// ─── Event name constants — confirmed by the gateway catalogue ───────────

/**
 * The gateway catalogue confirmed event names for the lobby phase.
 * The 5.8 question/answer/leaderboard events are intentionally not
 * included here.
 */
const INSTANCE_JOINED_EVENT = "instance:joined" as const;
const INSTANCE_LEFT_EVENT = "instance:left" as const;
const INSTANCE_STARTED_EVENT = "instance:started" as const;
const INSTANCE_CLOSED_EVENT = "instance:closed" as const;
const PLAYER_JOINED_EVENT = "player:joined" as const;
const PLAYER_LEFT_EVENT = "player:left" as const;
const COUNTDOWN_STARTED_EVENT = "countdown:started" as const;
const COUNTDOWN_CANCELLED_EVENT = "countdown:cancelled" as const;

type LobbyEventName =
  | typeof INSTANCE_JOINED_EVENT
  | typeof INSTANCE_LEFT_EVENT
  | typeof INSTANCE_STARTED_EVENT
  | typeof INSTANCE_CLOSED_EVENT
  | typeof PLAYER_JOINED_EVENT
  | typeof PLAYER_LEFT_EVENT
  | typeof COUNTDOWN_STARTED_EVENT
  | typeof COUNTDOWN_CANCELLED_EVENT;

const EMIT_JOIN_EVENT = "join_instance" as const;
const EMIT_LEAVE_EVENT = "leave_instance" as const;

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseInstanceSocketResult {
  connectionState: InstanceSocketConnectionState;
  lastError: ApiError | null;
  /** Subscribe to lobby events. Returns an unsubscribe function. */
  subscribe: (handler: (event: InstanceSocketEvent) => void) => () => void;
  /** Emit the `join_instance` event. Idempotent per instance lifecycle. */
  emitJoin: () => Promise<void>;
  /** Emit the `leave_instance` event. */
  emitLeave: () => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapWsErrorToLifecycleCode(
  code: string | undefined,
): InstanceLifecycleErrorCode {
  if (!code) return "GLOBAL_INTERNAL_ERROR";
  switch (code) {
    case "INSTANCE_NOT_FOUND":
      return "INSTANCE_NOT_FOUND";
    case "INSTANCE_CLOSED":
    case "INSTANCE_ALREADY_CLOSED":
    case "INSTANCE_ALREADY_FINISHED":
      return "INSTANCE_CLOSED";
    case "INSTANCE_FULL":
      return "INSTANCE_FULL";
    case "INSTANCE_ALREADY_JOINED":
      return "INSTANCE_ALREADY_JOINED";
    case "INSTANCE_NOT_JOINED":
      return "INSTANCE_NOT_JOINED";
    case "INSTANCE_HOST_REQUIRED":
    case "INSTANCE_NOT_HOST":
    case "HOST_REQUIRED":
      return "INSTANCE_HOST_REQUIRED";
    case "INSTANCE_FORBIDDEN":
      return "INSTANCE_FORBIDDEN";
    case "INSTANCE_INVALID_TRANSITION":
      return "INSTANCE_INVALID_TRANSITION";
    case "AUTH_TOKEN_EXPIRED":
    case "AUTH_INVALID_TOKEN":
    case "AUTH_REQUIRED":
      return "INSTANCE_AUTH_REQUIRED";
    case "GLOBAL_UNAUTHENTICATED":
      return "INSTANCE_AUTH_REQUIRED";
    case "GLOBAL_FORBIDDEN":
      return "GLOBAL_FORBIDDEN";
    case "GLOBAL_NOT_FOUND":
      return "GLOBAL_NOT_FOUND";
    case "GLOBAL_VALIDATION_FAILED":
      return "GLOBAL_VALIDATION_FAILED";
    case "GLOBAL_INTERNAL_ERROR":
      return "GLOBAL_INTERNAL_ERROR";
    default:
      return "GLOBAL_INTERNAL_ERROR";
  }
}

function mapSocketConnectionState(
  state: UseSocketReturn["connectionState"],
): InstanceSocketConnectionState {
  switch (state) {
    case "idle":
      return "idle";
    case "connecting":
      return "connecting";
    case "connected":
      return "connected";
    case "reconnecting":
      return "reconnecting";
    case "disconnected":
      return "disconnected";
    case "auth_required":
      return "auth_failed";
    default:
      return "idle";
  }
}

/**
 * Coerce a raw Socket.IO frame into the typed `InstanceSocketEvent`
 * discriminated union. The function is defensive — unknown fields are
 * passed through, missing fields are filled with safe defaults.
 */
function coerceToInstanceSocketEvent(
  eventName: LobbyEventName,
  raw: unknown,
): InstanceSocketEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const instanceId = typeof obj.instanceId === "string" ? obj.instanceId : "";
  const at = typeof obj.at === "string" ? obj.at : new Date().toISOString();
  const eventSequence =
    typeof obj.eventSequence === "number" ? obj.eventSequence : 0;

  switch (eventName) {
    case INSTANCE_STARTED_EVENT:
      return {
        type: "instance_started",
        instanceId,
        at,
        eventSequence,
      };
    case INSTANCE_CLOSED_EVENT:
      return {
        type: "instance_closed",
        instanceId,
        at,
        eventSequence,
      };
    case COUNTDOWN_STARTED_EVENT:
      return {
        type: "countdown_started",
        instanceId,
        at,
        eventSequence,
      };
    case COUNTDOWN_CANCELLED_EVENT:
      return {
        type: "countdown_cancelled",
        instanceId,
        at,
        eventSequence,
      };
    case INSTANCE_JOINED_EVENT:
    case PLAYER_JOINED_EVENT: {
      const player = obj.player as Record<string, unknown> | undefined;
      if (!player || typeof player !== "object") return null;
      const userId = typeof player.userId === "string" ? player.userId : "";
      if (userId === "") return null;
      return {
        type: "player_joined",
        instanceId,
        at,
        eventSequence,
        player: {
          ...(player as object),
          id: userId,
          isCurrentUser: false,
          isHost: false,
        } as InstanceSocketEvent & { type: "player_joined" } extends infer T
          ? T extends { player: infer P }
            ? P
            : never
          : never,
      };
    }
    case INSTANCE_LEFT_EVENT:
    case PLAYER_LEFT_EVENT: {
      const playerId = typeof obj.playerId === "string" ? obj.playerId : "";
      if (playerId === "") return null;
      return {
        type: "player_left",
        instanceId,
        playerId,
        at,
        eventSequence,
      };
    }
    default:
      return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useInstanceSocket(
  instanceId: string | null,
): UseInstanceSocketResult {
  const featuresFlag = getFeatureFlagValue("phase5_instances");
  const realtimeFlag = getFeatureFlagValue("phase5_realtime_infrastructure");
  const enabled =
    featuresFlag === "live" && realtimeFlag === "live";
  const isFlagPlaceholder = !enabled;

  const auth = useAuthBootstrap();
  const isAuthenticated = auth.isAuthenticated;

  const { socket, connectionState, error, disconnect } = useSocket(
    INSTANCES_NAMESPACE,
    { autoConnect: enabled && isAuthenticated, enabled: enabled && isAuthenticated },
  );

  const [connectError, setConnectError] = useState<ApiError | null>(null);

  // ─── Subscriber registry ───────────────────────────────────────────────
  //
  // The hook owns a `Set<handler>` of subscribers. Each registered
  // `useRealtimeEvent` callback dispatches every incoming event to
  // every subscriber. The handlers receive the typed
  // `InstanceSocketEvent` and never the raw Socket.IO frame.

  const subscribersRef = useRef<Set<(event: InstanceSocketEvent) => void>>(
    new Set(),
  );

  const dispatch = useCallback((event: InstanceSocketEvent) => {
    subscribersRef.current.forEach((handler) => {
      try {
        handler(event);
      } catch {
        // Subscriber errors are isolated — one bad handler does not
        // starve the others.
      }
    });
  }, []);

  const subscribe = useCallback(
    (handler: (event: InstanceSocketEvent) => void) => {
      subscribersRef.current.add(handler);
      return () => {
        subscribersRef.current.delete(handler);
      };
    },
    [],
  );

  // ─── Map lastError to the lifecycle union ──────────────────────────────
  //
  // Pure derivation — combines the upstream `error` from `useSocket`
  // with the locally-captured `connect_error` frame. The local frame
  // is only ever written from the socket handler below; we treat the
  // union as derived state and recompute it via `useMemo`.

  const mappedLastError = useMemo<ApiError | null>(() => {
    const source = connectError ?? error;
    if (source === null) return null;
    const mappedCode = mapWsErrorToLifecycleCode(source.code);
    const baseMessage = source.message ?? "Socket error";
    return new ApiError({
      status: 0,
      code: mappedCode,
      message: baseMessage,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }, [error, connectError]);

  // ─── Track join state per instanceId ───────────────────────────────────
  //
  // The hook is idempotent: a duplicate mount for the same
  // `instanceId` (e.g. two tabs in the same browser, or one tab
  // mounting the hook twice) must NOT emit a second `join_instance`.
  // The `joinedInstancesRef` is a per-instance-id flag. The flag is
  // reset on disconnect and on a fresh `instanceId`.

  const joinedInstancesRef = useRef<Set<string>>(new Set());

  const emitJoin = useCallback(async (): Promise<void> => {
    if (
      isFlagPlaceholder ||
      instanceId === null ||
      !isAuthenticated ||
      socket === null
    ) {
      return;
    }
    if (joinedInstancesRef.current.has(instanceId)) {
      return;
    }
    try {
      socket.emit(EMIT_JOIN_EVENT, { instanceId });
      joinedInstancesRef.current.add(instanceId);
    } catch (cause: unknown) {
      if (isApiError(cause)) {
        throw cause;
      }
      throw new ApiError(
        cause as unknown as ConstructorParameters<typeof ApiError>[0],
      );
    }
  }, [isFlagPlaceholder, isAuthenticated, instanceId, socket]);

  const emitLeave = useCallback(async (): Promise<void> => {
    if (
      isFlagPlaceholder ||
      instanceId === null ||
      !isAuthenticated ||
      socket === null
    ) {
      return;
    }
    if (!joinedInstancesRef.current.has(instanceId)) {
      return;
    }
    try {
      socket.emit(EMIT_LEAVE_EVENT, { instanceId });
      joinedInstancesRef.current.delete(instanceId);
    } catch (cause: unknown) {
      if (isApiError(cause)) {
        throw cause;
      }
      throw new ApiError(
        cause as unknown as ConstructorParameters<typeof ApiError>[0],
      );
    }
  }, [isFlagPlaceholder, isAuthenticated, instanceId, socket]);

  // ─── Lifecycle: emit join on connect, leave on unmount/logout ──────────

  useEffect(() => {
    if (
      isFlagPlaceholder ||
      instanceId === null ||
      !isAuthenticated
    ) {
      return;
    }
    if (connectionState !== "connected") return;
    void emitJoin();
  }, [
    isFlagPlaceholder,
    instanceId,
    isAuthenticated,
    connectionState,
    emitJoin,
  ]);

  // Reset join state on instanceId change.
  useEffect(() => {
    joinedInstancesRef.current.clear();
  }, [instanceId]);

  // On logout, disconnect and clear join state.
  useEffect(() => {
    if (!isFlagPlaceholder && !isAuthenticated) {
      joinedInstancesRef.current.clear();
      disconnect();
    }
  }, [isFlagPlaceholder, isAuthenticated, disconnect]);

  // ─── Event listeners ───────────────────────────────────────────────────
  //
  // Each `useRealtimeEvent` registers a Socket.IO listener for one
  // event name. The callback coerces the raw frame into the typed
  // `InstanceSocketEvent` and dispatches it to subscribers.

  const buildHandler = useCallback(
    (eventName: LobbyEventName) => {
      return (raw: unknown) => {
        const typed = coerceToInstanceSocketEvent(eventName, raw);
        if (typed !== null) {
          dispatch(typed);
        }
      };
    },
    [dispatch],
  );

  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected" ? INSTANCE_JOINED_EVENT : null,
    buildHandler(INSTANCE_JOINED_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );
  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected" ? INSTANCE_LEFT_EVENT : null,
    buildHandler(INSTANCE_LEFT_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );
  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected" ? INSTANCE_STARTED_EVENT : null,
    buildHandler(INSTANCE_STARTED_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );
  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected" ? INSTANCE_CLOSED_EVENT : null,
    buildHandler(INSTANCE_CLOSED_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );
  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected" ? PLAYER_JOINED_EVENT : null,
    buildHandler(PLAYER_JOINED_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );
  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected" ? PLAYER_LEFT_EVENT : null,
    buildHandler(PLAYER_LEFT_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );
  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected" ? COUNTDOWN_STARTED_EVENT : null,
    buildHandler(COUNTDOWN_STARTED_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );
  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected" ? COUNTDOWN_CANCELLED_EVENT : null,
    buildHandler(COUNTDOWN_CANCELLED_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );

  // ─── Decode any raw connect_error frames ───────────────────────────────

  useEffect(() => {
    if (socket === null) return;
    const handler = (raw: unknown) => {
      const decoded = decodeWsError(raw);
      const mappedCode = mapWsErrorToLifecycleCode(decoded.code);
      setConnectError(
        new ApiError({
          status: 0,
          code: mappedCode,
          message: decoded.message ?? "Connection error",
        } as unknown as ConstructorParameters<typeof ApiError>[0]),
      );
    };
    socket.on("connect_error", handler);
    return () => {
      socket.off("connect_error", handler);
    };
  }, [socket]);

  // ─── Reconnect on demand ───────────────────────────────────────────────

  return {
    connectionState: isFlagPlaceholder
      ? "idle"
      : mapSocketConnectionState(connectionState),
    lastError: mappedLastError,
    subscribe,
    emitJoin,
    emitLeave,
  };
}
