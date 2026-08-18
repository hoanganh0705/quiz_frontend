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

export const GAMEPLAY_PAYLOAD_VERSION = 1 as const;

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

export interface UseInstanceGameSocketResult {
connectionState: GameplaySocketConnectionState;
lastError: ApiError | null;

subscribe: (handler: (envelope: GameplayEventEnvelope<unknown>) => void) => () => void;

emitAnswer: (submission: AnswerSubmissionDto) => Promise<AnswerSubmissionAckDto>;

payloadVersion: number;
}

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

export function useInstanceGameSocket(
instanceId: string | null,
): UseInstanceGameSocketResult {
const playFlag = getFeatureFlagValue("multiplayer_play_live");
const realtimeFlag = getFeatureFlagValue("realtime_infrastructure_live");
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

useEffect(() => {
joinedInstancesRef.current.clear();
  }, [instanceId]);

useEffect(() => {
if (!isFlagPlaceholder && !isAuthenticated) {
joinedInstancesRef.current.clear();
disconnect();
    }
  }, [isFlagPlaceholder, isAuthenticated, disconnect]);

const buildHandler = useCallback(
<T>(eventName: GameplayEventName) => {
return (raw: unknown) => {
const typed = coerceToGameplayEnvelope<T>(eventName, raw);
if (typed !== null) {
dispatch(typed);
        } else {

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
