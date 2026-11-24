"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";
import {
  INSTANCES_NAMESPACE,
  useSocket,
  useRealtimeEvent,
} from "@/lib/realtime";
import type { UseSocketReturn } from "@/lib/realtime";
import { decodeWsError } from "@/lib/realtime";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import {
  type InstanceLifecycleErrorCode,
  type InstancePlayer,
  type InstanceSocketConnectionState,
  type InstanceSocketEvent,
} from "@/features/instances/types/instance.types";

const INSTANCE_JOINED_EVENT = "instance:joined" as const;
const INSTANCE_JOINED_ALT_EVENT = "instance_joined" as const;
const INSTANCE_LEFT_EVENT = "instance:left" as const;
const INSTANCE_LEFT_ALT_EVENT = "instance_left" as const;
const INSTANCE_STARTED_EVENT = "instance:started" as const;
const INSTANCE_STARTED_ALT_EVENT = "instance_started" as const;
const INSTANCE_CLOSED_EVENT = "instance:closed" as const;
const INSTANCE_CLOSED_ALT_EVENT = "instance_closed" as const;
const PLAYER_JOINED_EVENT = "player:joined" as const;
const PLAYER_JOINED_ALT_EVENT = "player_joined" as const;
const PLAYER_LEFT_EVENT = "player:left" as const;
const PLAYER_LEFT_ALT_EVENT = "player_left" as const;
const COUNTDOWN_STARTED_EVENT = "countdown:started" as const;
const COUNTDOWN_STARTED_ALT_EVENT = "countdown_started" as const;
const COUNTDOWN_CANCELLED_EVENT = "countdown:cancelled" as const;
const COUNTDOWN_CANCELLED_ALT_EVENT = "countdown_cancelled" as const;

type LobbyEventName =
  | typeof INSTANCE_JOINED_EVENT
  | typeof INSTANCE_JOINED_ALT_EVENT
  | typeof INSTANCE_LEFT_EVENT
  | typeof INSTANCE_LEFT_ALT_EVENT
  | typeof INSTANCE_STARTED_EVENT
  | typeof INSTANCE_STARTED_ALT_EVENT
  | typeof INSTANCE_CLOSED_EVENT
  | typeof INSTANCE_CLOSED_ALT_EVENT
  | typeof PLAYER_JOINED_EVENT
  | typeof PLAYER_JOINED_ALT_EVENT
  | typeof PLAYER_LEFT_EVENT
  | typeof PLAYER_LEFT_ALT_EVENT
  | typeof COUNTDOWN_STARTED_EVENT
  | typeof COUNTDOWN_STARTED_ALT_EVENT
  | typeof COUNTDOWN_CANCELLED_EVENT
  | typeof COUNTDOWN_CANCELLED_ALT_EVENT;

const EMIT_JOIN_EVENT = "join_instance" as const;
const EMIT_LEAVE_EVENT = "leave_instance" as const;

export interface UseInstanceSocketResult {
  connectionState: InstanceSocketConnectionState;
  lastError: ApiError | null;

  subscribe: (handler: (event: InstanceSocketEvent) => void) => () => void;

  emitJoin: () => Promise<void>;

  emitLeave: () => Promise<void>;
}

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

function coerceToInstanceSocketEvent(
  eventName: LobbyEventName,
  raw: unknown,
): InstanceSocketEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const instanceId = typeof obj.instanceId === "string" ? obj.instanceId : "";
  const at = typeof obj.at === "string" ? obj.at : new Date().toISOString();
  const eventSequence =
    typeof obj.eventSequence === "number" && obj.eventSequence > 0
      ? obj.eventSequence
      : Date.now();

  switch (eventName) {
    case INSTANCE_STARTED_EVENT:
    case INSTANCE_STARTED_ALT_EVENT:
      return {
        type: "instance_started",
        instanceId,
        at,
        eventSequence,
        status: "running",
      };
    case INSTANCE_CLOSED_EVENT:
    case INSTANCE_CLOSED_ALT_EVENT:
      return {
        type: "instance_closed",
        instanceId,
        at,
        eventSequence,
        status: "closed",
      };
    case COUNTDOWN_STARTED_EVENT:
    case COUNTDOWN_STARTED_ALT_EVENT: {
      const countdownStartedAt =
        typeof obj.countdownStartedAt === "string"
          ? obj.countdownStartedAt
          : at;
      return {
        type: "countdown_started",
        instanceId,
        at,
        eventSequence,
        status: "countdown",
        countdownStartedAt,
      };
    }
    case COUNTDOWN_CANCELLED_EVENT:
    case COUNTDOWN_CANCELLED_ALT_EVENT:
      return {
        type: "countdown_cancelled",
        instanceId,
        at,
        eventSequence,
        status: "open",
      };
    case INSTANCE_JOINED_EVENT:
    case INSTANCE_JOINED_ALT_EVENT:
    case PLAYER_JOINED_EVENT:
    case PLAYER_JOINED_ALT_EVENT: {
      const playerObj =
        obj.player && typeof obj.player === "object"
          ? (obj.player as Record<string, unknown>)
          : obj;
      const userId =
        typeof playerObj.userId === "string" && playerObj.userId
          ? playerObj.userId
          : typeof obj.userId === "string"
            ? obj.userId
            : "";
      if (userId === "") return null;
      return {
        type: "player_joined",
        instanceId,
        at,
        eventSequence,
        player: {
          id: userId,
          userId,
          username:
            typeof playerObj.username === "string"
              ? playerObj.username
              : "Player",
          displayName:
            typeof playerObj.displayName === "string"
              ? playerObj.displayName
              : typeof playerObj.username === "string"
                ? playerObj.username
                : "Player",
          avatarUrl:
            typeof playerObj.avatarUrl === "string"
              ? playerObj.avatarUrl
              : null,
          joinedAt:
            typeof playerObj.joinedAt === "string" ? playerObj.joinedAt : at,
          isCurrentUser: false,
          isHost: false,
        } as unknown as InstancePlayer,
      };
    }
    case INSTANCE_LEFT_EVENT:
    case INSTANCE_LEFT_ALT_EVENT:
    case PLAYER_LEFT_EVENT:
    case PLAYER_LEFT_ALT_EVENT: {
      const playerId =
        typeof obj.playerId === "string" && obj.playerId
          ? obj.playerId
          : typeof obj.userId === "string"
            ? obj.userId
            : "";
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

interface SocketSubscriptionManager {
  joinedRooms: Set<string>;
  subscribers: Map<string, number>;
  leaveTimers: Map<string, ReturnType<typeof setTimeout>>;
}

const socketStateMap = new WeakMap<object, SocketSubscriptionManager>();

function getSocketState(socket: object): SocketSubscriptionManager {
  let state = socketStateMap.get(socket);
  if (!state) {
    state = {
      joinedRooms: new Set(),
      subscribers: new Map(),
      leaveTimers: new Map(),
    };
    socketStateMap.set(socket, state);
  }
  return state;
}

export function useInstanceSocket(
  instanceId: string | null,
): UseInstanceSocketResult {
  const enabled = true;

  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  const { socket, connectionState, error, disconnect } = useSocket(
    INSTANCES_NAMESPACE,
    {
      autoConnect: enabled && isAuthenticated,
      enabled: enabled && isAuthenticated,
    },
  );

  const [connectError, setConnectError] = useState<ApiError | null>(null);

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

  const mappedLastError = useMemo<ApiError | null>(() => {
    const source = connectError ?? error;
    if (source === null) return null;
    const mappedCode = mapWsErrorToLifecycleCode(source.code);
    const baseMessage = source.message ?? "Socket error";
    return ApiError.fromInput({
      status: 0,
      code: mappedCode,
      message: baseMessage,
    });
  }, [error, connectError]);

  const joinedInstancesRef = useRef<Set<string>>(new Set());

  const emitJoin = useCallback(async (): Promise<void> => {
    if (instanceId !== null) {
      joinedInstancesRef.current.add(instanceId);
    }
    if (
      instanceId === null ||
      !isAuthenticated ||
      socket === null
    ) {
      return;
    }
    const state = getSocketState(socket);
    const pendingTimer = state.leaveTimers.get(instanceId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      state.leaveTimers.delete(instanceId);
    }
    if (state.joinedRooms.has(instanceId)) {
      return;
    }
    try {
      socket.emit(EMIT_JOIN_EVENT, { instanceId });
      state.joinedRooms.add(instanceId);
    } catch (cause: unknown) {
      if (isApiError(cause)) {
        throw cause;
      }
      throw coerceToApiError(cause);
    }
  }, [isAuthenticated, instanceId, socket]);

  const emitLeave = useCallback(async (): Promise<void> => {
    if (instanceId === null || !joinedInstancesRef.current.has(instanceId)) {
      return;
    }
    joinedInstancesRef.current.delete(instanceId);
    if (
      !isAuthenticated ||
      socket === null
    ) {
      return;
    }
    const state = getSocketState(socket);
    const pendingTimer = state.leaveTimers.get(instanceId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      state.leaveTimers.delete(instanceId);
    }
    if (!state.joinedRooms.has(instanceId)) {
      return;
    }
    try {
      socket.emit(EMIT_LEAVE_EVENT, { instanceId });
      state.joinedRooms.delete(instanceId);
      state.subscribers.set(instanceId, 0);
    } catch (cause: unknown) {
      if (isApiError(cause)) {
        throw cause;
      }
      throw coerceToApiError(cause);
    }
  }, [isAuthenticated, instanceId, socket]);

  useEffect(() => {
    if (
      instanceId === null ||
      !isAuthenticated ||
      socket === null
    ) {
      return;
    }

    const state = getSocketState(socket);
    const pendingTimer = state.leaveTimers.get(instanceId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      state.leaveTimers.delete(instanceId);
    }

    const currentCount = state.subscribers.get(instanceId) ?? 0;
    state.subscribers.set(instanceId, currentCount + 1);

    if (connectionState === "connected") {
      void emitJoin();
    }

    return () => {
      const activeState = getSocketState(socket);
      const remaining = Math.max(
        0,
        (activeState.subscribers.get(instanceId) ?? 1) - 1,
      );
      activeState.subscribers.set(instanceId, remaining);

      if (remaining === 0) {
        activeState.joinedRooms.delete(instanceId);
      }
    };
  }, [instanceId,
    isAuthenticated,
    connectionState,
    socket,
    emitJoin,
  ]);

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      const state = getSocketState(socket);
      state.joinedRooms.clear();
      if (instanceId !== null && isAuthenticated) {
        void emitJoin();
      }
    };

    const handleDisconnect = () => {
      const state = getSocketState(socket);
      state.joinedRooms.clear();
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, instanceId, isAuthenticated, emitJoin]);

  useEffect(() => {
    if (
      connectionState !== "connected" &&
      instanceId !== null &&
      socket !== null
    ) {
      const state = getSocketState(socket);
      state.joinedRooms.delete(instanceId);
    }
  }, [connectionState, instanceId, socket]);

  useEffect(() => {
    joinedInstancesRef.current.clear();
  }, [instanceId]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        const state = getSocketState(socket);
        state.joinedRooms.clear();
        state.subscribers.clear();
        state.leaveTimers.forEach((timer) => clearTimeout(timer));
        state.leaveTimers.clear();
      }
      disconnect();
    }
  }, [isAuthenticated, socket, disconnect]);

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
    enabled && connectionState === "connected" ? INSTANCE_JOINED_ALT_EVENT : null,
    buildHandler(INSTANCE_JOINED_ALT_EVENT),
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
    enabled && connectionState === "connected" ? INSTANCE_LEFT_ALT_EVENT : null,
    buildHandler(INSTANCE_LEFT_ALT_EVENT),
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
    enabled && connectionState === "connected" ? INSTANCE_STARTED_ALT_EVENT : null,
    buildHandler(INSTANCE_STARTED_ALT_EVENT),
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
    enabled && connectionState === "connected" ? INSTANCE_CLOSED_ALT_EVENT : null,
    buildHandler(INSTANCE_CLOSED_ALT_EVENT),
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
    enabled && connectionState === "connected" ? PLAYER_JOINED_ALT_EVENT : null,
    buildHandler(PLAYER_JOINED_ALT_EVENT),
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
    enabled && connectionState === "connected" ? PLAYER_LEFT_ALT_EVENT : null,
    buildHandler(PLAYER_LEFT_ALT_EVENT),
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
    enabled && connectionState === "connected" ? COUNTDOWN_STARTED_ALT_EVENT : null,
    buildHandler(COUNTDOWN_STARTED_ALT_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );
  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected"
      ? COUNTDOWN_CANCELLED_EVENT
      : null,
    buildHandler(COUNTDOWN_CANCELLED_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );
  useRealtimeEvent(
    socket,
    enabled && connectionState === "connected"
      ? COUNTDOWN_CANCELLED_ALT_EVENT
      : null,
    buildHandler(COUNTDOWN_CANCELLED_ALT_EVENT),
    { enabled: enabled && connectionState === "connected" },
  );

  useEffect(() => {
    if (socket === null) return;
    const handler = (raw: unknown) => {
      const decoded = decodeWsError(raw);
      const mappedCode = mapWsErrorToLifecycleCode(decoded.code);
      setConnectError(
        ApiError.fromInput({
          status: 0,
          code: mappedCode,
          message: decoded.message ?? "Connection error",
        }),
      );
    };
    socket.on("connect_error", handler);
    return () => {
      socket.off("connect_error", handler);
    };
  }, [socket]);

  return {
    connectionState: mapSocketConnectionState(connectionState),
    lastError: mappedLastError,
    subscribe,
    emitJoin,
    emitLeave,
  };
}
