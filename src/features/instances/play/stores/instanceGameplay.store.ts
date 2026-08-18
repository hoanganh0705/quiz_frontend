

import { create } from "zustand";

import type {
AnswerResultDto,
FinalLeaderboardDto,
GameplayEventEnvelope,
GameplayEventName,
InstanceClosedEventDto,
LeaderboardEntryDto,
LeaderboardUpdatedEventDto,
PlayerProgressDto,
PlayerQuestionBundleDto,
QuestionTimingDto,
} from "../types/gameplay.types";

export interface InstanceGameplayEntry {

bundle: PlayerQuestionBundleDto | null;

timing: QuestionTimingDto | null;

submission: { questionId: string; submittedAt: string; accepted: boolean } | null;

result: AnswerResultDto | null;

progress: PlayerProgressDto | null;

leaderboard: LeaderboardEntryDto[];

closure: InstanceClosedEventDto | null;

finalLeaderboard: FinalLeaderboardDto | null;

lastEventSequence: Partial<Record<GameplayEventName, number>>;

isReconciling: boolean;
}

export interface InstanceGameplayState {
entries: Record<string, InstanceGameplayEntry>;
}

export interface InstanceGameplayActions {

applyQuestionRevealed: (envelope: GameplayEventEnvelope<PlayerQuestionBundleDto>) => void;

applyAnswerResult: (envelope: GameplayEventEnvelope<AnswerResultDto>) => void;

applyLeaderboardUpdated: (envelope: GameplayEventEnvelope<LeaderboardUpdatedEventDto>) => void;

applyPlayerProgress: (progress: PlayerProgressDto) => void;

applyInstanceClosed: (envelope: GameplayEventEnvelope<InstanceClosedEventDto>) => void;

applyFinalLeaderboard: (envelope: GameplayEventEnvelope<FinalLeaderboardDto>) => void;

applySubmission: (questionId: string, submittedAt: string) => void;

clearSubmission: (questionId: string) => void;

setReconciling: (instanceId: string, isReconciling: boolean) => void;

reset: (instanceId: string) => void;

resetAll: () => void;
}

export type InstanceGameplayStore =
InstanceGameplayState & InstanceGameplayActions;

const INITIAL_STATE: InstanceGameplayState = {
entries: {},
};

function ensureEntry(
state: InstanceGameplayState,
instanceId: string,
): InstanceGameplayEntry {
const existing = state.entries[instanceId];
if (existing !== undefined) return existing;
return {
bundle: null,
timing: null,
submission: null,
result: null,
progress: null,
leaderboard: [],
closure: null,
finalLeaderboard: null,
lastEventSequence: {},
isReconciling: false,
  };
}

function isStaleEntry(
entry: InstanceGameplayEntry,
eventName: GameplayEventName,
eventSequence: number,
): boolean {
const last = entry.lastEventSequence[eventName];
return typeof eventSequence !== "number" || (typeof last === "number" && eventSequence <= last);
}

export const useInstanceGameplayStore = create<InstanceGameplayStore>(
(set) => ({
...INITIAL_STATE,

applyQuestionRevealed: (envelope) => {
const { instanceId, data, eventSequence } = envelope;
set((state) => {
const entry = ensureEntry(state, instanceId);
if (isStaleEntry(entry, "question_revealed", eventSequence)) return state;
return {
entries: {
...state.entries,
[instanceId]: {
...entry,
bundle: data,
timing: data.question.questionTiming,

submission: null,
result: null,
lastEventSequence: {
...entry.lastEventSequence,
question_revealed: eventSequence,
              },
            },
          },
        };
      });
    },

applyAnswerResult: (envelope) => {
const { instanceId, data, eventSequence } = envelope;
set((state) => {
const entry = ensureEntry(state, instanceId);
if (isStaleEntry(entry, "answer_result", eventSequence)) return state;
return {
entries: {
...state.entries,
[instanceId]: {
...entry,
result: data,
lastEventSequence: {
...entry.lastEventSequence,
answer_result: eventSequence,
              },
            },
          },
        };
      });
    },

applyLeaderboardUpdated: (envelope) => {
const { instanceId, data, eventSequence } = envelope;
set((state) => {
const entry = ensureEntry(state, instanceId);
if (isStaleEntry(entry, "leaderboard_updated", eventSequence)) return state;
return {
entries: {
...state.entries,
[instanceId]: {
...entry,
leaderboard: data.entries,
lastEventSequence: {
...entry.lastEventSequence,
leaderboard_updated: eventSequence,
              },
            },
          },
        };
      });
    },

applyPlayerProgress: (progress) => {
const { instanceId, eventSequence } = progress;
set((state) => {
const entry = ensureEntry(state, instanceId);

const key: GameplayEventName = "leaderboard_updated";
if (isStaleEntry(entry, key, eventSequence)) return state;
return {
entries: {
...state.entries,
[instanceId]: {
...entry,
progress,
lastEventSequence: {
...entry.lastEventSequence,
[key]: eventSequence,
              },
            },
          },
        };
      });
    },

applyInstanceClosed: (envelope) => {
const { instanceId, data, eventSequence } = envelope;
set((state) => {
const entry = ensureEntry(state, instanceId);
if (isStaleEntry(entry, "instance_closed", eventSequence)) return state;
return {
entries: {
...state.entries,
[instanceId]: {
...entry,
closure: data,
finalLeaderboard: data.finalLeaderboard,
lastEventSequence: {
...entry.lastEventSequence,
instance_closed: eventSequence,
              },
            },
          },
        };
      });
    },

applyFinalLeaderboard: (envelope) => {
const { instanceId, data, eventSequence } = envelope;
set((state) => {
const entry = ensureEntry(state, instanceId);
if (isStaleEntry(entry, "instance_final_leaderboard", eventSequence)) return state;
return {
entries: {
...state.entries,
[instanceId]: {
...entry,
finalLeaderboard: data,
lastEventSequence: {
...entry.lastEventSequence,
instance_final_leaderboard: eventSequence,
              },
            },
          },
        };
      });
    },

applySubmission: (questionId, submittedAt) => {
set((state) => ({
entries: {
...state.entries,

...Object.fromEntries(
Object.entries(state.entries).map(([id, entry]) => [
id,
{
...entry,
submission: { questionId, submittedAt, accepted: true },
              },
            ])
          ),
        },
      }));
    },

clearSubmission: (questionId) => {
set((state) => {
const next = { ...state.entries };
for (const [id, entry] of Object.entries(next)) {
if (entry.submission?.questionId === questionId) {
next[id] = { ...entry, submission: null };
          }
        }
return { entries: next };
      });
    },

setReconciling: (instanceId, isReconciling) => {
set((state) => {
const entry = state.entries[instanceId];
if (!entry) return state;
return {
entries: {
...state.entries,
[instanceId]: { ...entry, isReconciling },
          },
        };
      });
    },

reset: (instanceId) => {
set((state) => {
if (state.entries[instanceId] === undefined) return state;
const nextEntries = { ...state.entries };
delete nextEntries[instanceId];
return { entries: nextEntries };
      });
    },

resetAll: () => {
set(() => ({ entries: {} }));
    },
  }),
);

export function selectGameplayEntry(
state: InstanceGameplayStore,
instanceId: string,
): InstanceGameplayEntry | null {
return state.entries[instanceId] ?? null;
}

export function selectGameplayBundle(
state: InstanceGameplayStore,
instanceId: string,
): PlayerQuestionBundleDto | null {
return state.entries[instanceId]?.bundle ?? null;
}

export function selectGameplayTiming(
state: InstanceGameplayStore,
instanceId: string,
): QuestionTimingDto | null {
return state.entries[instanceId]?.timing ?? null;
}

export function selectGameplaySubmission(
state: InstanceGameplayStore,
instanceId: string,
): { questionId: string; submittedAt: string; accepted: boolean } | null {
return state.entries[instanceId]?.submission ?? null;
}

export function selectGameplayResult(
state: InstanceGameplayStore,
instanceId: string,
): AnswerResultDto | null {
return state.entries[instanceId]?.result ?? null;
}

export function selectGameplayProgress(
state: InstanceGameplayStore,
instanceId: string,
): PlayerProgressDto | null {
return state.entries[instanceId]?.progress ?? null;
}

export function selectGameplayLeaderboard(
state: InstanceGameplayStore,
instanceId: string,
): LeaderboardEntryDto[] {
return state.entries[instanceId]?.leaderboard ?? [];
}

export function selectGameplayClosure(
state: InstanceGameplayStore,
instanceId: string,
): InstanceClosedEventDto | null {
return state.entries[instanceId]?.closure ?? null;
}

export function selectGameplayFinalLeaderboard(
state: InstanceGameplayStore,
instanceId: string,
): FinalLeaderboardDto | null {
return state.entries[instanceId]?.finalLeaderboard ?? null;
}

export function selectGameplayLastSequence(
state: InstanceGameplayStore,
instanceId: string,
event: GameplayEventName,
): number {
return state.entries[instanceId]?.lastEventSequence[event] ?? 0;
}

export function selectGameplayIsReconciling(
state: InstanceGameplayStore,
instanceId: string,
): boolean {
return state.entries[instanceId]?.isReconciling ?? false;
}
