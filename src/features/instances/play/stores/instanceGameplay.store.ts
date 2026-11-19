import { create } from "zustand";

import type { QuizQuestionAuthorDto } from "@/lib/api/generated/schemas";

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
  submission: {
    questionId: string;
    submittedAt: string;
    accepted: boolean;
  } | null;
  result: AnswerResultDto | null;
  progress: PlayerProgressDto | null;
  leaderboard: LeaderboardEntryDto[];
  closure: InstanceClosedEventDto | null;
  finalLeaderboard: FinalLeaderboardDto | null;
  lastEventSequence: Partial<Record<GameplayEventName, number>>;
  isReconciling: boolean;
  allQuestions: QuizQuestionAuthorDto[];
  currentQuestionIndex: number;
  quizTitle: string;
  quizCategory?: string;
  difficulty?: string;
  durationPerQuestionMs: number;
}

export interface InstanceGameplayState {
  entries: Record<string, InstanceGameplayEntry>;
}

export interface InstanceGameplayActions {
  applyQuestionRevealed: (
    envelope: GameplayEventEnvelope<PlayerQuestionBundleDto>,
  ) => void;
  applyAnswerResult: (envelope: GameplayEventEnvelope<AnswerResultDto>) => void;
  applyLeaderboardUpdated: (
    envelope: GameplayEventEnvelope<LeaderboardUpdatedEventDto>,
  ) => void;
  applyPlayerProgress: (progress: PlayerProgressDto) => void;
  applyInstanceClosed: (
    envelope: GameplayEventEnvelope<InstanceClosedEventDto>,
  ) => void;
  applyFinalLeaderboard: (
    envelope: GameplayEventEnvelope<FinalLeaderboardDto>,
  ) => void;
  applySubmission: (questionId: string, submittedAt: string) => void;
  clearSubmission: (questionId: string) => void;
  initializeQuestions: (
    instanceId: string,
    questions: QuizQuestionAuthorDto[],
    meta: {
      quizTitle: string;
      quizCategory?: string;
      difficulty?: string;
      durationMs?: number;
      startedAt?: string;
    },
  ) => void;
  advanceQuestion: (instanceId: string) => void;
  setReconciling: (instanceId: string, isReconciling: boolean) => void;
  reset: (instanceId: string) => void;
  resetAll: () => void;
}

export type InstanceGameplayStore = InstanceGameplayState &
  InstanceGameplayActions;

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
    allQuestions: [],
    currentQuestionIndex: 0,
    quizTitle: "",
    durationPerQuestionMs: 30000,
  };
}

function isStaleEntry(
  entry: InstanceGameplayEntry,
  eventName: GameplayEventName,
  eventSequence: number,
): boolean {
  const last = entry.lastEventSequence[eventName];
  return (
    typeof eventSequence !== "number" ||
    (typeof last === "number" && eventSequence <= last)
  );
}

export const useInstanceGameplayStore = create<InstanceGameplayStore>(
  (set) => ({
    ...INITIAL_STATE,

    applyQuestionRevealed: (envelope) => {
      const { instanceId, data, eventSequence } = envelope;
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        if (isStaleEntry(entry, "question_revealed", eventSequence))
          return state;
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
        if (isStaleEntry(entry, "leaderboard_updated", eventSequence))
          return state;
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
        const last = entry.progress?.eventSequence;
        if (typeof last === "number" && eventSequence <= last) return state;
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              progress,
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
              finalLeaderboard: data.finalLeaderboard ?? entry.finalLeaderboard,
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
        if (isStaleEntry(entry, "instance_final_leaderboard", eventSequence))
          return state;
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              finalLeaderboard: data,
              closure: entry.closure
                ? { ...entry.closure, finalLeaderboard: data }
                : entry.closure,
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
      set((state) => {
        const next = { ...state.entries };
        for (const [id, entry] of Object.entries(next)) {
          if (entry.bundle?.question.id === questionId) {
            next[id] = {
              ...entry,
              submission: { questionId, submittedAt, accepted: true },
            };
          }
        }
        return { entries: next };
      });
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

    initializeQuestions: (instanceId, questions, meta) => {
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        if (questions.length === 0) return state;

        const durationPerQuestion = Math.max(
          10000,
          Math.round((meta.durationMs || 60000) / questions.length),
        );

        const firstQ = questions[0];
        const initialBundle: PlayerQuestionBundleDto = {
          question: {
            id: firstQ.questionId,
            instanceId,
            quizId: firstQ.quizVersionId,
            quizTitle: meta.quizTitle,
            index: firstQ.position ?? 1,
            total: questions.length,
            text: firstQ.questionText,
            mediaUrl: firstQ.imageUrl ?? undefined,
            category: meta.quizCategory,
            difficulty: meta.difficulty ?? "medium",
            basePoints: 100,
            questionTiming: {
              startsAt: meta.startedAt ?? new Date().toISOString(),
              durationMs: durationPerQuestion,
              serverNow: new Date().toISOString(),
            },
          },
          options: (firstQ.answerOptions ?? []).map((opt) => ({
            id: opt.answerOptionId,
            index: opt.position,
            text: opt.optionText,
            mediaUrl: opt.imageUrl ?? undefined,
          })),
        };

        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              allQuestions: questions,
              currentQuestionIndex: 0,
              quizTitle: meta.quizTitle,
              quizCategory: meta.quizCategory,
              difficulty: meta.difficulty,
              durationPerQuestionMs: durationPerQuestion,
              bundle: entry.bundle ?? initialBundle,
              timing: entry.timing ?? initialBundle.question.questionTiming,
              progress: entry.progress ?? {
                instanceId,
                playerId: "",
                answeredCount: 0,
                totalQuestions: questions.length,
                currentScore: 0,
                rank: 1,
                isConnected: true,
                eventSequence: Date.now(),
              },
            },
          },
        };
      });
    },

    advanceQuestion: (instanceId) => {
      set((state) => {
        const entry = state.entries[instanceId];
        if (!entry || entry.allQuestions.length === 0) return state;

        const nextIndex = entry.currentQuestionIndex + 1;
        if (nextIndex >= entry.allQuestions.length) {
          const finalEntries =
            entry.leaderboard.length > 0
              ? entry.leaderboard
              : [
                  {
                    playerId: entry.progress?.playerId ?? "player",
                    displayName: "Player",
                    score: entry.progress?.currentScore ?? 100,
                    rank: 1,
                    answeredCount: entry.allQuestions.length,
                    lastAwardedAt: new Date().toISOString(),
                    eventSequence: Date.now(),
                  },
                ];

          const finalLeaderboard: FinalLeaderboardDto = {
            instanceId,
            entries: finalEntries,
            winnerPlayerId: finalEntries[0]?.playerId ?? "",
            closedAt: new Date().toISOString(),
            totalQuestions: entry.allQuestions.length,
          };

          const closure: InstanceClosedEventDto = {
            instanceId,
            status: "closed",
            closedAt: new Date().toISOString(),
            reason: "normal",
            finalLeaderboard,
            eventSequence: Date.now(),
          };

          return {
            entries: {
              ...state.entries,
              [instanceId]: {
                ...entry,
                currentQuestionIndex: nextIndex,
                closure,
                finalLeaderboard,
              },
            },
          };
        }

        const nextQ = entry.allQuestions[nextIndex];
        const nextBundle: PlayerQuestionBundleDto = {
          question: {
            id: nextQ.questionId,
            instanceId,
            quizId: nextQ.quizVersionId,
            quizTitle: entry.quizTitle,
            index: nextQ.position ?? nextIndex + 1,
            total: entry.allQuestions.length,
            text: nextQ.questionText,
            mediaUrl: nextQ.imageUrl ?? undefined,
            category: entry.quizCategory,
            difficulty: entry.difficulty ?? "medium",
            basePoints: 100,
            questionTiming: {
              startsAt: new Date().toISOString(),
              durationMs: entry.durationPerQuestionMs,
              serverNow: new Date().toISOString(),
            },
          },
          options: (nextQ.answerOptions ?? []).map((opt) => ({
            id: opt.answerOptionId,
            index: opt.position,
            text: opt.optionText,
            mediaUrl: opt.imageUrl ?? undefined,
          })),
        };

        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              currentQuestionIndex: nextIndex,
              bundle: nextBundle,
              timing: nextBundle.question.questionTiming,
              submission: null,
              result: null,
              progress: entry.progress
                ? {
                    ...entry.progress,
                    answeredCount: nextIndex,
                    currentScore: entry.progress.currentScore + 100,
                  }
                : null,
            },
          },
        };
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

const EMPTY_LEADERBOARD: LeaderboardEntryDto[] = [];

export function selectGameplayLeaderboard(
  state: InstanceGameplayStore,
  instanceId: string,
): LeaderboardEntryDto[] {
  return state.entries[instanceId]?.leaderboard ?? EMPTY_LEADERBOARD;
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
  return state.entries[instanceId]?.lastEventSequence?.[event] ?? 0;
}

export function selectGameplayIsReconciling(
  state: InstanceGameplayStore,
  instanceId: string,
): boolean {
  return state.entries[instanceId]?.isReconciling ?? false;
}

export function selectCanAdvanceQuestion(
  state: InstanceGameplayStore,
  instanceId: string,
): boolean {
  const entry = state.entries[instanceId];
  if (!entry) return false;
  return entry.currentQuestionIndex + 1 < entry.allQuestions.length;
}

export function selectCurrentQuestionIndex(
  state: InstanceGameplayStore,
  instanceId: string,
): number {
  return state.entries[instanceId]?.currentQuestionIndex ?? 0;
}
