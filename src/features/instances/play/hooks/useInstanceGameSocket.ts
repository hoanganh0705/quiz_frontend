"use client";

/**
 * `useInstanceGameSocket` — connection + subscriber bus + answer emit hook
 * for the `/instances` Socket.IO namespace during the gameplay phase.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.B1.
 *
 * ## What this hook owns
 *
 * - Open an authenticated Socket.IO connection to the `/instances`
 *   namespace while `phase5_instances_play === 'live'` AND
 *   `phase5_realtime_infrastructure === 'live'`. When the flag is
 *   `'placeholder'`, the connection is suppressed entirely (no socket
 *   handshake, no listeners, no automatic reconnection).
 * - Join the instance's gameplay room after the handshake with the
 *   supplied `instanceId`. Duplicate mounts for the same `instanceId`
 *   are idempotent — `join_instance_game` is emitted exactly once per
 *   per-instance gameplay lifecycle.
 * - Bounded exponential backoff reconnect: 1 s, 2 s, 4 s, 8 s, 16 s,
 *   up to `MAX_RETRY_COUNT` (5), then stops. The hook re-emits
 *   `join_instance_game` on every reconnect.
 * - Dispatch the `question_revealed`, `answer_result`,
 *   `leaderboard_updated`, `instance_closed`, and
 *   `instance_final_leaderboard` events to subscribers via a typed
 *   subscriber bus. The bus is exposed via `subscribe(envelope => void)`
 *   and returns an unsubscribe function.
 * - Emit answer submissions via `emitAnswer`. Returns a typed
 *   `AnswerSubmissionAckDto` or an `ApiError`.
 * - Validate `payloadVersion` on every envelope; reject mismatched
 *   payloads with `PAYLOAD_VERSION_MISMATCH`.
 * - Surface typed WS error codes (`AUTH_REQUIRED`, `TIMEOUT`,
 *   `DISCONNECT`, `MALFORMED_EVENT`, etc.) and stop reconnecting on
 *   auth failures.
 * - Tear down the connection on logout via the auth events; reset the
 *   per-instance gameplay store via the lifecycle bridge.
 *
 * ## Feature flag preconditions
 *
 * The hook requires `phase5_instances_play === 'live'` AND
 * `phase5_realtime_infrastructure === 'live'`. When either flag is
 * `'placeholder'`, the connection is suppressed and the hook returns
 * the safe fallback state.
 *
 * ## Mounted with singleton socket
 *
 * The underlying socket is owned by `useSocket`'s internal singleton
 * (`ConnectionRegistry`) — calling this hook from multiple components
 * in the same tab does NOT open multiple sockets.
 *
 * ## Auth
 *
 * The Socket.IO handshake uses the auth token from the cookie (see
 * `useSocket`). When the token is absent, the connect attempt fails
 * with an `auth_required` state and the hook stops retrying.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";
import {
  INSTANCES_NAMESPACE,
  useSocket,
  useRealtimeEvent,
} from "@/lib/realtime";
import type { UseSocketReturn } from "@/lib/realtime";
import { decodeWsError } from "@/lib/realtime";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

import {
  type AnswerSubmissionAckDto,
  type AnswerSubmissionDto,
  type GameplayEventEnvelope,
  type GameplaySocketConnectionState,
  type GameplayWsErrorCode,
  type InstanceClosedEventDto,
  type LeaderboardEntryDto,
  type PlayerQuestionBundleDto,
  type AnswerResultDto,
  type FinalLeaderboardDto,
} from "../types/gameplay.types";

// ─── Current payload version ──────────────────────────────────────────────

/**
 * Increment this value whenever the backend changes any gameplay
 * envelope shape. Mismatched versions surface
 * `PAYLOAD_VERSION_MISMATCH` in the client and the envelope is dropped.
 *
 * Synced with the server-side `PAYLOAD_VERSION` constant in the gateway.
 */
export const GAMEPLAY_PAYLOAD_VERSION = 1 as const;

// ─── Event name constants — confirmed by the gateway catalogue ───────────

const EMIT_JOIN_GAME_EVENT = "join_instance_game" as const;
const EMIT_LEAVE_GAME_EVENT = "leave_instance_game" as const;
const EMIT_ANSWER_EVENT = "submit_answer" as const;

const QUESTION_REVEALED_EVENT = "question_revealed" as const;
const ANSWER_RESULT_EVENT = "answer_result" as const;
const LEADERBOARD_UPDATED_EVENT = "leaderboard_updated" as const;
const INSTANCE_CLOSED_EVENT = "instance_closed" as const;
const INSTANCE_FINAL_LEADERBOARD_EVENT = "instance_final_leaderboard" as const;

type GameplayEventName =
  | typeof QUESTION_REVEALED_EVENT
  | typeof ANSWER_RESULT_EVENT
  | typeof LEADERBOARD_UPDATED_EVENT
  | typeof INSTANCE_CLOSED_EVENT
  | typeof INSTANCE_FINAL_LEADERBOARD_EVENT;

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseInstanceGameSocketResult {
  connectionState: GameplaySocketConnectionState;
  lastError: ApiError | null;
  /** Subscribe to gameplay Socket.IO envelopes. Returns an unsubscribe function. */
  subscribe: (handler: (envelope: GameplayEventEnvelope<unknown>) => void) => () => void;
  /**
   * Emit an answer submission. Returns a typed acknowledgement or throws
   * an `ApiError`.
   */
  emitAnswer: (submission: AnswerSubmissionDto) => Promise<AnswerSubmissionAckDto>;
  /** Current payload version for envelope validation. */
  payloadVersion: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function mapWsErrorToGameplayCode(
  code: string | undefined,
): GameplayWsErrorCode {
  if (!code) return "UNKNOWN";
  switch (code) {
    case "DUPLICATE_ANSWER":
      return "DUPLICATE_ANSWER";
    case "ANSWER_WINDOW_CLOSED":
      return "ANSWER_WINDOW_CLOSED";
    case "INVALID_OPTION":
      return "INVALID_OPTION";
    case "NOT_PARTICIPANT":
      return "NOT_PARTICIPANT";
    case "INSTANCE_NOT_STARTED":
      return "INSTANCE_NOT_STARTED";
    case "INSTANCE_CLOSED":
      return "INSTANCE_CLOSED";
    case "INSTANCE_NOT_FOUND":
      return "INSTANCE_NOT_FOUND";
    case "SEQUENCE_MISMATCH":
      return "SEQUENCE_MISMATCH";
    case "PAYLOAD_VERSION_MISMATCH":
      return "PAYLOAD_VERSION_MISMATCH";
    case "MALFORMED_EVENT":
      return "MALFORMED_EVENT";
    case "AUTH_REQUIRED":
    case "AUTH_TOKEN_EXPIRED":
    case "AUTH_INVALID_TOKEN":
      return "AUTH_REQUIRED";
    case "TIMEOUT":
      return "TIMEOUT";
    case "DISCONNECT":
      return "DISCONNECT";
    case "FORBIDDEN":
      return "FORBIDDEN";
    default:
      return "UNKNOWN";
  }
}

function mapSocketConnectionState(
  state: UseSocketReturn["connectionState"],
): GameplaySocketConnectionState {
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
 * Coerce a raw Socket.IO frame into the typed `GameplayEventEnvelope`.
 * Returns `null` when the frame is malformed or the `payloadVersion`
 * does not match.
 *
 * The function is defensive — unknown fields are passed through,
 * missing fields are filled with safe defaults.
 */
function coerceToGameplayEnvelope<T>(
  eventName: GameplayEventName,
  raw: unknown,
): GameplayEventEnvelope<T> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const instanceId =
    typeof obj.instanceId === "string" ? obj.instanceId : "";
  const eventSequence =
    typeof obj.eventSequence === "number" ? obj.eventSequence : 0;
  const emittedAt =
    typeof obj.emittedAt === "string"
      ? obj.emittedAt
      : new Date().toISOString();
  const payloadVersion =
    typeof obj.payloadVersion === "number"
      ? obj.payloadVersion
      : GAMEPLAY_PAYLOAD_VERSION;

  // Validate payload version.
  if (payloadVersion !== GAMEPLAY_PAYLOAD_VERSION) {
    return null;
  }

  const data = obj.data;

  switch (eventName) {
    case QUESTION_REVEALED_EVENT:
      return {
        event: QUESTION_REVEALED_EVENT,
        data: data as T,
        instanceId,
        eventSequence,
        emittedAt,
        payloadVersion,
      } as GameplayEventEnvelope<T>;
    case ANSWER_RESULT_EVENT:
      return {
        event: ANSWER_RESULT_EVENT,
        data: data as T,
        instanceId,
        eventSequence,
        emittedAt,
        payloadVersion,
      } as GameplayEventEnvelope<T>;
    case LEADERBOARD_UPDATED_EVENT:
      return {
        event: LEADERBOARD_UPDATED_EVENT,
        data: data as T,
        instanceId,
        eventSequence,
        emittedAt,
        payloadVersion,
      } as GameplayEventEnvelope<T>;
    case INSTANCE_CLOSED_EVENT:
      return {
        event: INSTANCE_CLOSED_EVENT,
        data: data as T,
        instanceId,
        eventSequence,
        emittedAt,
        payloadVersion,
      } as GameplayEventEnvelope<T>;
    case INSTANCE_FINAL_LEADERBOARD_EVENT:
      return {
        event: INSTANCE_FINAL_LEADERBOARD_EVENT,
        data: data as T,
        instanceId,
        eventSequence,
        emittedAt,
        payloadVersion,
      } as GameplayEventEnvelope<T>;
    default:
      return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useInstanceGameSocket(
  instanceId: string | null,
): UseInstanceGameSocketResult {
  const playFlag = getFeatureFlagValue("phase5_instances_play");
  const realtimeFlag = getFeatureFlagValue("phase5_realtime_infrastructure");
  const enabled =
    playFlag === "live" && realtimeFlag === "live";
  const isFlagPlaceholder = !enabled;

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

  // ─── Subscriber registry ───────────────────────────────────────────────
  //
  // The hook owns a `Set<handler>` of subscribers. Each registered
  // `useRealtimeEvent` callback dispatches every incoming envelope to
  // every subscriber. Handlers receive the typed `GameplayEventEnvelope`
  // and never the raw Socket.IO frame.

  const subscribersRef =
    useRef<Set<(envelope: GameplayEventEnvelope<unknown>) => void>>(
      new Set(),
    );

  const dispatch = useCallback(
    (envelope: GameplayEventEnvelope<unknown>) => {
      subscribersRef.current.forEach((handler) => {
        try {
          handler(envelope);
        } catch {
          // Subscriber errors are isolated — one bad handler does not
          // starve the others.
        }
      });
    },
    [],
  );

  const subscribe = useCallback(
    (
      handler: (envelope: GameplayEventEnvelope<unknown>) => void,
    ) => {
      subscribersRef.current.add(handler);
      return () => {
        subscribersRef.current.delete(handler);
      };
    },
    [],
  );

  // ─── Map lastError to the gameplay WS error union ────────────────────
  //
  // Pure derivation — combines the upstream `error` from `useSocket`
  // with the locally-captured `connect_error` frame.

  const mappedLastError = useMemo<ApiError | null>(() => {
    const source = connectError ?? error;
    if (source === null) return null;
    const mappedCode = mapWsErrorToGameplayCode(source.code);
    const baseMessage = source.message ?? "Socket error";
    return ApiError.fromInput({
      status: 0,
      code: mappedCode,
      message: baseMessage,
    });
  }, [error, connectError]);

  // ─── Track join state per instanceId ───────────────────────────────────

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
      socket.emit(EMIT_JOIN_GAME_EVENT, {
        instanceId,
        payloadVersion: GAMEPLAY_PAYLOAD_VERSION,
      });
      joinedInstancesRef.current.add(instanceId);
    } catch (cause: unknown) {
      if (isApiError(cause)) {
        throw cause;
      }
      throw coerceToApiError(cause);
    }
  }, [isFlagPlaceholder, isAuthenticated, instanceId, socket]);

  // ─── Emit answer ─────────────────────────────────────────────────────

  const emitAnswer = useCallback(
    async (submission: AnswerSubmissionDto): Promise<AnswerSubmissionAckDto> => {
      if (
        isFlagPlaceholder ||
        instanceId === null ||
        !isAuthenticated ||
        socket === null
      ) {
        throw ApiError.fromInput({
          status: 0,
          code: "AUTH_REQUIRED",
          message: "Not authenticated",
        });
      }
      if (connectionState !== "connected") {
        throw ApiError.fromInput({
          status: 0,
          code: "DISCONNECT",
          message: "Socket not connected",
        });
      }
      try {
        // Socket.IO emit acknowledgement — resolves with the ack payload.
        const ack = await new Promise<AnswerSubmissionAckDto>(
          (resolve, reject) => {
            socket.emit(
              EMIT_ANSWER_EVENT,
              {
                instanceId,
                ...submission,
                clientToken: submission.clientToken ?? crypto.randomUUID(),
              },
              (response: unknown) => {
                if (isApiError(response)) {
                  reject(response);
                } else {
                  resolve(response as AnswerSubmissionAckDto);
                }
              },
            );
          },
        );
        return ack;
      } catch (cause: unknown) {
        if (isApiError(cause)) {
          throw cause;
        }
        const decoded = decodeWsError(cause);
        const code = mapWsErrorToGameplayCode(decoded.code);
        throw ApiError.fromInput({
          status: 0,
          code,
          message: decoded.message ?? "Submission failed",
        });
      }
    },
    [isFlagPlaceholder, isAuthenticated, instanceId, socket, connectionState],
  );

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
  // `GameplayEventEnvelope` and dispatches it to subscribers.

  const buildHandler = useCallback(
    <T>(eventName: GameplayEventName) => {
      return (raw: unknown) => {
        const typed = coerceToGameplayEnvelope<T>(eventName, raw);
        if (typed !== null) {
          dispatch(typed);
        } else {
          // Malformed or version-mismatched envelope — surface the error.
          setConnectError(
            ApiError.fromInput({
              status: 0,
              code: "MALFORMED_EVENT",
              message: `Malformed or version-mismatched ${String(eventName)} envelope`,
            }),
          );
        }
      };
    },
    [dispatch],
  );

  const isConnected = connectionState === "connected" && enabled;

  useRealtimeEvent(
    socket,
    isConnected ? QUESTION_REVEALED_EVENT : null,
    buildHandler<PlayerQuestionBundleDto>(QUESTION_REVEALED_EVENT),
    { enabled: isConnected },
  );
  useRealtimeEvent(
    socket,
    isConnected ? ANSWER_RESULT_EVENT : null,
    buildHandler<AnswerResultDto>(ANSWER_RESULT_EVENT),
    { enabled: isConnected },
  );
  useRealtimeEvent(
    socket,
    isConnected ? LEADERBOARD_UPDATED_EVENT : null,
    buildHandler<LeaderboardEntryDto[]>(LEADERBOARD_UPDATED_EVENT),
    { enabled: isConnected },
  );
  useRealtimeEvent(
    socket,
    isConnected ? INSTANCE_CLOSED_EVENT : null,
    buildHandler<InstanceClosedEventDto>(INSTANCE_CLOSED_EVENT),
    { enabled: isConnected },
  );
  useRealtimeEvent(
    socket,
    isConnected ? INSTANCE_FINAL_LEADERBOARD_EVENT : null,
    buildHandler<FinalLeaderboardDto>(INSTANCE_FINAL_LEADERBOARD_EVENT),
    { enabled: isConnected },
  );

  // ─── Decode any raw connect_error frames ───────────────────────────────

  useEffect(() => {
    if (socket === null) return;
    const handler = (raw: unknown) => {
      const decoded = decodeWsError(raw);
      const mappedCode = mapWsErrorToGameplayCode(decoded.code);
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
    connectionState: isFlagPlaceholder
      ? "idle"
      : mapSocketConnectionState(connectionState),
    lastError: mappedLastError,
    subscribe,
    emitAnswer,
    payloadVersion: GAMEPLAY_PAYLOAD_VERSION,
  };
}
