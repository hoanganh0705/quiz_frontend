

export interface QuestionTimingDto {

startsAt: string;

durationMs: number;

serverNow: string;
}

export interface PlayerQuestionDto {
id: string;
instanceId: string;
quizId: string;
quizTitle: string;

index: number;

total: number;
text: string;
mediaUrl?: string;
category?: string;
difficulty?: string;
difficultyMultiplier?: number;
basePoints?: number;
questionTiming: QuestionTimingDto;
}

export interface PlayerAnswerOptionDto {
id: string;

index: number;
text: string;
mediaUrl?: string;
}

export interface PlayerQuestionBundleDto {
question: PlayerQuestionDto;
options: PlayerAnswerOptionDto[];
}

export interface AnswerSubmissionDto {
questionId: string;
optionId: string;
submittedAt: string;
clientToken?: string;
}

export interface AnswerSubmissionAckDto {
questionId: string;
playerId: string;
submittedAt: string;
accepted: true;
submissionId: string;
}

export interface AnswerResultDto {
questionId: string;
playerId: string;

submittedOptionId: string | null;

accepted: boolean;

awardedPoints: number;

revealed: boolean;

isCorrect: boolean;

serverNow: string;

eventSequence: number;
}

export interface PlayerProgressDto {
instanceId: string;
playerId: string;
answeredCount: number;
totalQuestions: number;
currentScore: number;
rank: number | null;
isConnected: boolean;
eventSequence: number;
}

export interface LeaderboardEntryDto {
playerId: string;
displayName: string;
avatarUrl?: string;
score: number;
rank: number;
answeredCount: number;

lastAwardedAt: string | null;
eventSequence: number;
}

export interface LeaderboardUpdatedEventDto {
instanceId: string;
entries: LeaderboardEntryDto[];
updatedAt: string;
eventSequence: number;
}

export interface FinalLeaderboardDto {
instanceId: string;
closedAt: string;
entries: LeaderboardEntryDto[];
winnerPlayerId: string;
totalQuestions: number;
}

export interface InstanceClosedEventDto {
instanceId: string;
status: "closed" | "cancelled";
closedAt: string;
reason: string;
finalLeaderboard: FinalLeaderboardDto | null;
eventSequence: number;
}

export type GameplayEventName =
| "question_revealed"
  | "answer_result"
  | "leaderboard_updated"
  | "instance_closed"
  | "instance_final_leaderboard";

export type GameplayEventData =
| { name: "question_revealed"; data: PlayerQuestionBundleDto }
  | { name: "answer_result"; data: AnswerResultDto }
  | { name: "leaderboard_updated"; data: LeaderboardUpdatedEventDto }
  | { name: "instance_closed"; data: InstanceClosedEventDto }
  | { name: "instance_final_leaderboard"; data: FinalLeaderboardDto };

export interface GameplayEventEnvelope<T = unknown> {
event: GameplayEventName;
data: T;
instanceId: string;
eventSequence: number;
emittedAt: string;
payloadVersion: number;
}

export type GameplaySocketConnectionState =
| "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "auth_failed";

export type GameplayWsErrorCode =
| "DUPLICATE_ANSWER"
  | "ANSWER_WINDOW_CLOSED"
  | "INVALID_OPTION"
  | "NOT_PARTICIPANT"
  | "INSTANCE_NOT_STARTED"
  | "INSTANCE_CLOSED"
  | "INSTANCE_NOT_FOUND"
  | "SEQUENCE_MISMATCH"
  | "PAYLOAD_VERSION_MISMATCH"
  | "MALFORMED_EVENT"
  | "AUTH_REQUIRED"
  | "TIMEOUT"
  | "DISCONNECT"
  | "FORBIDDEN"
  | "UNKNOWN";

export const GAMEPLAY_WS_ERROR_CODES = [
"DUPLICATE_ANSWER",
"ANSWER_WINDOW_CLOSED",
"INVALID_OPTION",
"NOT_PARTICIPANT",
"INSTANCE_NOT_STARTED",
"INSTANCE_CLOSED",
"INSTANCE_NOT_FOUND",
"SEQUENCE_MISMATCH",
"PAYLOAD_VERSION_MISMATCH",
"MALFORMED_EVENT",
"AUTH_REQUIRED",
"TIMEOUT",
"DISCONNECT",
"FORBIDDEN",
"UNKNOWN",
] as const satisfies readonly GameplayWsErrorCode[];

export const GAMEPLAY_CACHE_KEYS = {

bundle(instanceId: string, questionId: string) {
return ["instances", "play", "bundle", instanceId, questionId] as const;
  },

leaderboard(instanceId: string) {
return ["instances", "play", "leaderboard", instanceId] as const;
  },

final(instanceId: string) {
return ["instances", "play", "final", instanceId] as const;
  },

realtime(instanceId: string) {
return ["instances", "play", "realtime", instanceId] as const;
  },

all(instanceId: string) {
return {
leaderboard: this.leaderboard(instanceId),
final: this.final(instanceId),
realtime: this.realtime(instanceId),
    } as const;
  },
} as const;

export type GameplayInvalidationKeys = ReturnType<
(typeof GAMEPLAY_CACHE_KEYS)["all"]
>;

export type AnswerSubmissionState =
| "idle"
  | "pending"
  | "accepted"
  | "rejected";
