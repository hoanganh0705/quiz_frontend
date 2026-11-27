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

export interface BattlePlayerStatus {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  status: string;
}

export interface InstanceGameplayEntry {
  bundle: PlayerQuestionBundleDto | null;
  timing: QuestionTimingDto | null;
  submission: {
    questionId: string;
    submittedAt: string;
    accepted: boolean;
    selectedOptionId?: string;
  } | null;
  selectedAnswers: Record<string, string>;
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
  totalDurationMs: number;
  playerId: string;
  quizId: string | null;
  attemptId: string | null;
  playerSubmitted: boolean;
  players: BattlePlayerStatus[];
  hostUserId: string | null;
}

export interface InstanceGameplayState {
  entries: Record<string, InstanceGameplayEntry>;
}

export interface PlayerBattleOutcome {
  score?: number | null;
  answeredCount?: number | null;
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
  applySubmission: (
    questionId: string,
    submittedAt: string,
    selectedOptionId?: string,
  ) => void;
  selectQuestionAnswer: (
    instanceId: string,
    questionId: string,
    optionId: string,
  ) => void;
  clearSubmission: (questionId: string) => void;
  setQuizId: (instanceId: string, quizId: string | null) => void;
  setAttemptId: (instanceId: string, attemptId: string | null) => void;
  setHostUserId: (instanceId: string, hostUserId: string | null) => void;
  hydrateSelectedAnswers: (
    instanceId: string,
    answers: Record<string, string>,
  ) => void;
  setPlayers: (instanceId: string, players: BattlePlayerStatus[]) => void;
  markPlayerFinished: (instanceId: string, userId: string) => void;
  markPlayerDisconnected: (instanceId: string, userId: string) => void;
  submitPlayerBattle: (
    instanceId: string,
    outcome?: PlayerBattleOutcome,
  ) => { allPlayersFinished: boolean };
  initializeQuestions: (
    instanceId: string,
    questions: QuizQuestionAuthorDto[],
    meta: {
      quizTitle: string;
      quizCategory?: string;
      difficulty?: string;
      durationMs?: number;
      startedAt?: string;
      serverNow?: string;
      playerId?: string;
    },
  ) => void;
  goToQuestion: (instanceId: string, index: number) => void;
  advanceQuestion: (instanceId: string) => void;
  finishBattle: (
    instanceId: string,
    reason?: InstanceClosedEventDto["reason"],
    outcome?: PlayerBattleOutcome,
  ) => void;
  setReconciling: (instanceId: string, isReconciling: boolean) => void;
  reset: (instanceId: string) => void;
  resetAll: () => void;
}

export type InstanceGameplayStore = InstanceGameplayState &
  InstanceGameplayActions;

const INITIAL_STATE: InstanceGameplayState = {
  entries: {},
};

const EMPTY_SELECTED_ANSWERS: Record<string, string> = {};
const EMPTY_QUESTIONS: QuizQuestionAuthorDto[] = [];
const EMPTY_LEADERBOARD: LeaderboardEntryDto[] = [];
const EMPTY_PLAYERS: BattlePlayerStatus[] = [];

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
    selectedAnswers: {},
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
    totalDurationMs: 60000,
    playerId: "",
    quizId: null,
    attemptId: null,
    playerSubmitted: false,
    players: [],
    hostUserId: null,
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

function areAllActivePlayersFinished(players: BattlePlayerStatus[]): boolean {
  const active = players.filter((p) => p.status !== "disconnected");
  if (active.length === 0) return true;
  return active.every((p) => p.status === "finished");
}

function buildQuestionBundle(
  instanceId: string,
  question: QuizQuestionAuthorDto,
  index: number,
  total: number,
  meta: {
    quizTitle: string;
    quizCategory?: string;
    difficulty?: string;
    timing: QuestionTimingDto;
  },
): PlayerQuestionBundleDto {
  return {
    question: {
      id: question.questionId,
      instanceId,
      quizId: question.quizVersionId,
      quizTitle: meta.quizTitle,
      index: question.position ?? index + 1,
      total,
      text: question.questionText,
      mediaUrl: question.imageUrl ?? undefined,
      category: meta.quizCategory,
      difficulty: meta.difficulty ?? "medium",
      basePoints: 100,
      questionTiming: meta.timing,
    },
    options: (question.answerOptions ?? []).map((opt, optIdx) => {
      const rawOpt = opt as unknown as {
        answerOptionId?: string;
        optionId?: string;
        position?: number;
        optionText?: string;
        value?: string;
        imageUrl?: string;
        mediaUrl?: string;
      };
      return {
        id: rawOpt.answerOptionId ?? rawOpt.optionId ?? `opt-${optIdx}`,
        index: rawOpt.position ?? optIdx,
        text: rawOpt.optionText ?? rawOpt.value ?? "",
        mediaUrl: rawOpt.imageUrl ?? rawOpt.mediaUrl ?? undefined,
      };
    }),
  };
}

function computeScoreFromAnswers(
  questions: QuizQuestionAuthorDto[],
  selectedAnswers: Record<string, string>,
  pointsPerQuestion = 100,
): { answeredCount: number; score: number } {
  let answeredCount = 0;
  let score = 0;

  for (const question of questions) {
    const selectedId = selectedAnswers[question.questionId];
    if (!selectedId) continue;
    answeredCount += 1;

    const chosenOption = question.answerOptions?.find((opt: unknown) => {
      const raw = opt as {
        answerOptionId?: string;
        optionId?: string;
        isCorrect?: boolean;
      };
      return (
        (raw.answerOptionId && raw.answerOptionId === selectedId) ||
        (raw.optionId && raw.optionId === selectedId)
      );
    }) as { isCorrect?: boolean } | undefined;

    if (chosenOption?.isCorrect === true) {
      score += pointsPerQuestion;
    }
  }

  return { answeredCount, score };
}

function buildFinalLeaderboard(
  instanceId: string,
  entry: InstanceGameplayEntry,
  answeredCount: number,
  computedScore: number,
): FinalLeaderboardDto {
  const effectivePlayerId = entry.playerId || entry.progress?.playerId || "";
  const effectiveScore = Math.max(
    computedScore,
    entry.progress?.currentScore ?? 0,
  );
  const nowIso = new Date().toISOString();
  const nowSeq = Date.now();

  let finalEntries: LeaderboardEntryDto[] =
    entry.leaderboard.length > 0
      ? entry.leaderboard.map((item) =>
          effectivePlayerId && item.playerId === effectivePlayerId
            ? {
                ...item,
                score: Math.max(item.score, effectiveScore),
                answeredCount: Math.max(item.answeredCount, answeredCount),
              }
            : item,
        )
      : [
          {
            playerId: effectivePlayerId || "player",
            displayName: "You",
            score: effectiveScore,
            rank: 1,
            answeredCount,
            lastAwardedAt: nowIso,
            eventSequence: nowSeq,
          },
        ];

  finalEntries = [...finalEntries]
    .sort((a, b) => b.score - a.score)
    .map((e, idx) => ({ ...e, rank: idx + 1 }));

  return {
    instanceId,
    entries: finalEntries,
    winnerPlayerId: finalEntries[0]?.playerId ?? "",
    closedAt: nowIso,
    totalQuestions:
      entry.allQuestions.length || entry.progress?.totalQuestions || 0,
  };
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
        const existingSelection = entry.selectedAnswers[data.question.id];
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              bundle: data,
              timing: data.question.questionTiming,
              submission: existingSelection
                ? {
                    questionId: data.question.id,
                    submittedAt: new Date().toISOString(),
                    accepted: true,
                    selectedOptionId: existingSelection,
                  }
                : null,
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
        const nextScore =
          (entry.progress?.currentScore ?? 0) + (data.awardedPoints ?? 0);
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              result: data,
              progress: entry.progress
                ? {
                    ...entry.progress,
                    currentScore: Math.max(
                      entry.progress.currentScore,
                      nextScore,
                    ),
                  }
                : entry.progress,
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
        const normalizedEntries = data.entries.map((item) => ({
          ...item,
          score: Math.round(item.score ?? 0),
        }));
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              leaderboard: normalizedEntries,
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
        const normalizedFinal = data.finalLeaderboard
          ? {
              ...data.finalLeaderboard,
              totalQuestions:
                data.finalLeaderboard.totalQuestions > 0
                  ? data.finalLeaderboard.totalQuestions
                  : entry.allQuestions.length ||
                    entry.finalLeaderboard?.totalQuestions ||
                    0,
              entries: data.finalLeaderboard.entries.map((item) => ({
                ...item,
                score: Math.round(item.score ?? 0),
              })),
            }
          : null;
        const normalizedClosure: InstanceClosedEventDto = {
          ...data,
          finalLeaderboard: normalizedFinal ?? entry.finalLeaderboard,
        };
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              closure: normalizedClosure,
              finalLeaderboard: normalizedFinal ?? entry.finalLeaderboard,
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
        const normalizedData: FinalLeaderboardDto = {
          ...data,
          totalQuestions:
            data.totalQuestions > 0
              ? data.totalQuestions
              : entry.allQuestions.length ||
                entry.finalLeaderboard?.totalQuestions ||
                0,
          entries: data.entries.map((item) => ({
            ...item,
            score: Math.round(item.score ?? 0),
          })),
        };
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              finalLeaderboard: normalizedData,
              closure: entry.closure
                ? { ...entry.closure, finalLeaderboard: normalizedData }
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

    applySubmission: (questionId, submittedAt, selectedOptionId) => {
      set((state) => {
        const next = { ...state.entries };
        for (const [id, entry] of Object.entries(next)) {
          if (entry.bundle?.question.id === questionId) {
            const nextSelected = selectedOptionId
              ? { ...entry.selectedAnswers, [questionId]: selectedOptionId }
              : entry.selectedAnswers;
            const { answeredCount, score } = computeScoreFromAnswers(
              entry.allQuestions,
              nextSelected,
              entry.bundle?.question.basePoints ?? 100,
            );
            next[id] = {
              ...entry,
              selectedAnswers: nextSelected,
              submission: {
                questionId,
                submittedAt,
                accepted: true,
                selectedOptionId,
              },
              progress: entry.progress
                ? {
                    ...entry.progress,
                    answeredCount: Math.max(
                      answeredCount,
                      Object.keys(nextSelected).length,
                    ),
                    currentScore: Math.max(entry.progress.currentScore, score),
                  }
                : entry.progress,
            };
          }
        }
        return { entries: next };
      });
    },

    selectQuestionAnswer: (instanceId, questionId, optionId) => {
      set((state) => {
        const entry = state.entries[instanceId];
        if (!entry) return state;

        const nowIso = new Date().toISOString();
        const nextSelected: Record<string, string> = {
          ...entry.selectedAnswers,
          [questionId]: optionId,
        };
        const { answeredCount, score } = computeScoreFromAnswers(
          entry.allQuestions,
          nextSelected,
          entry.bundle?.question.basePoints ?? 100,
        );

        const nextScore = Math.max(score, entry.progress?.currentScore ?? 0);
        const effectivePlayerId =
          entry.playerId || entry.progress?.playerId || "";

        const nextLeaderboard =
          effectivePlayerId && entry.leaderboard.length > 0
            ? [...entry.leaderboard]
                .map((item) =>
                  item.playerId === effectivePlayerId
                    ? {
                        ...item,
                        score: Math.max(item.score, nextScore),
                        answeredCount: Math.max(
                          item.answeredCount,
                          answeredCount,
                        ),
                      }
                    : item,
                )
                .sort((a, b) => b.score - a.score)
                .map((item, idx) => ({ ...item, rank: idx + 1 }))
            : entry.leaderboard;

        const playerRank = effectivePlayerId
          ? (nextLeaderboard.find((l) => l.playerId === effectivePlayerId)
              ?.rank ??
            entry.progress?.rank ??
            1)
          : (entry.progress?.rank ?? 1);

        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              selectedAnswers: nextSelected,
              submission:
                entry.bundle?.question.id === questionId
                  ? {
                      questionId,
                      submittedAt: nowIso,
                      accepted: true,
                      selectedOptionId: optionId,
                    }
                  : entry.submission,
              leaderboard: nextLeaderboard,
              progress: entry.progress
                ? {
                    ...entry.progress,
                    playerId: effectivePlayerId || entry.progress.playerId,
                    answeredCount,
                    currentScore: nextScore,
                    rank: playerRank,
                  }
                : null,
            },
          },
        };
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

    setQuizId: (instanceId, quizId) => {
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              quizId,
            },
          },
        };
      });
    },

    setAttemptId: (instanceId, attemptId) => {
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              attemptId,
            },
          },
        };
      });
    },

    setHostUserId: (instanceId, hostUserId) => {
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              hostUserId,
            },
          },
        };
      });
    },

    hydrateSelectedAnswers: (instanceId, answers) => {
      set((state) => {
        const entry = state.entries[instanceId];
        if (!entry) return state;

        const merged: Record<string, string> = {
          ...answers,
          ...entry.selectedAnswers,
        };
        const answeredCount = Object.keys(merged).length;
        const activeQuestionId = entry.bundle?.question.id;
        const activeOptionId = activeQuestionId
          ? merged[activeQuestionId]
          : undefined;

        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              selectedAnswers: merged,
              submission:
                activeQuestionId && activeOptionId
                  ? {
                      questionId: activeQuestionId,
                      submittedAt: new Date().toISOString(),
                      accepted: true,
                      selectedOptionId: activeOptionId,
                    }
                  : entry.submission,
              progress: entry.progress
                ? {
                    ...entry.progress,
                    answeredCount: Math.max(
                      entry.progress.answeredCount,
                      answeredCount,
                    ),
                  }
                : entry.progress,
            },
          },
        };
      });
    },

    setPlayers: (instanceId, players) => {
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        // Preserve local "finished" state for the current player once submitted
        // in case a concurrent REST poll returns stale status before DB commits.
        const mergedPlayers = players.map((p) => {
          const existing = entry.players.find((ep) => ep.userId === p.userId);
          if (
            (entry.playerSubmitted && p.userId === entry.playerId) ||
            existing?.status === "finished"
          ) {
            return { ...p, status: "finished" };
          }
          return p;
        });

        const shouldAutoClose =
          entry.playerSubmitted &&
          entry.closure === null &&
          areAllActivePlayersFinished(mergedPlayers);

        if (!shouldAutoClose) {
          return {
            entries: {
              ...state.entries,
              [instanceId]: {
                ...entry,
                players: mergedPlayers,
              },
            },
          };
        }

        const { answeredCount, score } = computeScoreFromAnswers(
          entry.allQuestions,
          entry.selectedAnswers,
          entry.bundle?.question.basePoints ?? 100,
        );
        const finalLeaderboard = buildFinalLeaderboard(
          instanceId,
          entry,
          answeredCount,
          score,
        );
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
              players: mergedPlayers,
              closure,
              finalLeaderboard,
            },
          },
        };
      });
    },

    markPlayerFinished: (instanceId, userId) => {
      set((state) => {
        const entry = state.entries[instanceId];
        if (!entry) return state;

        const nextPlayers = entry.players.map((p) =>
          p.userId === userId ? { ...p, status: "finished" } : p,
        );

        const shouldAutoClose =
          entry.playerSubmitted &&
          entry.closure === null &&
          areAllActivePlayersFinished(nextPlayers);

        if (!shouldAutoClose) {
          return {
            entries: {
              ...state.entries,
              [instanceId]: {
                ...entry,
                players: nextPlayers,
              },
            },
          };
        }

        const { answeredCount, score } = computeScoreFromAnswers(
          entry.allQuestions,
          entry.selectedAnswers,
          entry.bundle?.question.basePoints ?? 100,
        );
        const finalLeaderboard = buildFinalLeaderboard(
          instanceId,
          entry,
          answeredCount,
          score,
        );
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
              players: nextPlayers,
              closure,
              finalLeaderboard,
            },
          },
        };
      });
    },

    markPlayerDisconnected: (instanceId, userId) => {
      set((state) => {
        const entry = state.entries[instanceId];
        if (!entry) return state;

        const nextPlayers = entry.players.map((p) =>
          p.userId === userId && p.status !== "finished"
            ? { ...p, status: "disconnected" }
            : p,
        );

        const shouldAutoClose =
          entry.playerSubmitted &&
          entry.closure === null &&
          areAllActivePlayersFinished(nextPlayers);

        if (!shouldAutoClose) {
          return {
            entries: {
              ...state.entries,
              [instanceId]: {
                ...entry,
                players: nextPlayers,
              },
            },
          };
        }

        const { answeredCount, score } = computeScoreFromAnswers(
          entry.allQuestions,
          entry.selectedAnswers,
          entry.bundle?.question.basePoints ?? 100,
        );
        const finalLeaderboard = buildFinalLeaderboard(
          instanceId,
          entry,
          answeredCount,
          score,
        );
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
              players: nextPlayers,
              closure,
              finalLeaderboard,
            },
          },
        };
      });
    },

    submitPlayerBattle: (instanceId, outcome) => {
      let allFinished = true;

      set((state) => {
        const entry = state.entries[instanceId];
        if (!entry) return state;

        const effectivePlayerId =
          entry.playerId || entry.progress?.playerId || "";

        const nextPlayers =
          entry.players.length > 0
            ? entry.players.map((p) =>
                effectivePlayerId && p.userId === effectivePlayerId
                  ? { ...p, status: "finished" }
                  : p,
              )
            : entry.players;

        const { answeredCount: localAnswered, score: localScore } =
          computeScoreFromAnswers(
            entry.allQuestions,
            entry.selectedAnswers,
            entry.bundle?.question.basePoints ?? 100,
          );

        const resolvedScore =
          typeof outcome?.score === "number"
            ? Math.max(outcome.score, entry.progress?.currentScore ?? 0)
            : Math.max(localScore, entry.progress?.currentScore ?? 0);
        const resolvedAnswered =
          typeof outcome?.answeredCount === "number"
            ? Math.max(outcome.answeredCount, localAnswered)
            : localAnswered;

        const updatedProgress = entry.progress
          ? {
              ...entry.progress,
              answeredCount: resolvedAnswered,
              currentScore: resolvedScore,
            }
          : entry.progress;

        const updatedLeaderboard =
          effectivePlayerId && entry.leaderboard.length > 0
            ? [...entry.leaderboard]
                .map((item) =>
                  item.playerId === effectivePlayerId
                    ? {
                        ...item,
                        score: Math.max(item.score, resolvedScore),
                        answeredCount: Math.max(
                          item.answeredCount,
                          resolvedAnswered,
                        ),
                      }
                    : item,
                )
                .sort((a, b) => b.score - a.score)
                .map((item, idx) => ({ ...item, rank: idx + 1 }))
            : entry.leaderboard;

        allFinished = areAllActivePlayersFinished(nextPlayers);

        if (!allFinished) {
          return {
            entries: {
              ...state.entries,
              [instanceId]: {
                ...entry,
                playerSubmitted: true,
                players: nextPlayers,
                progress: updatedProgress,
                leaderboard: updatedLeaderboard,
              },
            },
          };
        }

        const nextEntry: InstanceGameplayEntry = {
          ...entry,
          playerSubmitted: true,
          players: nextPlayers,
          progress: updatedProgress,
          leaderboard: updatedLeaderboard,
        };

        const finalLeaderboard = buildFinalLeaderboard(
          instanceId,
          nextEntry,
          resolvedAnswered,
          resolvedScore,
        );
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
              ...nextEntry,
              closure,
              finalLeaderboard,
            },
          },
        };
      });

      return { allPlayersFinished: allFinished };
    },

    initializeQuestions: (instanceId, questions, meta) => {
      set((state) => {
        const entry = ensureEntry(state, instanceId);
        if (questions.length === 0) return state;

        const totalDurationMs = Math.max(15000, meta.durationMs || 60000);
        const nowMs = Date.now();
        const nowIso = new Date(nowMs).toISOString();
        const serverNowIso = meta.serverNow ?? nowIso;
        const parsedServerNowMs = new Date(serverNowIso).getTime();
        const referenceNowMs = Number.isNaN(parsedServerNowMs)
          ? nowMs
          : parsedServerNowMs;

        // Respect `meta.startedAt` while the battle window is still open relative
        // to the server clock; fall back to `serverNowIso` for historical fixtures.
        let effectiveStartsAt = serverNowIso;
        if (meta.startedAt) {
          const parsedStart = new Date(meta.startedAt).getTime();
          if (
            !Number.isNaN(parsedStart) &&
            parsedStart + totalDurationMs > referenceNowMs
          ) {
            effectiveStartsAt = meta.startedAt;
          }
        }

        const battleTiming: QuestionTimingDto = {
          startsAt: effectiveStartsAt,
          durationMs: totalDurationMs,
          serverNow: serverNowIso,
        };

        const firstQ = questions[0]!;
        const initialBundle = buildQuestionBundle(
          instanceId,
          firstQ,
          0,
          questions.length,
          {
            quizTitle: meta.quizTitle,
            quizCategory: meta.quizCategory,
            difficulty: meta.difficulty,
            timing: battleTiming,
          },
        );

        const effectivePlayerId = meta.playerId ?? entry.playerId ?? "";

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
              durationPerQuestionMs: Math.max(
                10000,
                Math.round(totalDurationMs / questions.length),
              ),
              totalDurationMs,
              playerId: effectivePlayerId,
              bundle: entry.bundle ?? initialBundle,
              timing: entry.timing ?? battleTiming,
              progress: entry.progress ?? {
                instanceId,
                playerId: effectivePlayerId,
                answeredCount: 0,
                totalQuestions: questions.length,
                currentScore: 0,
                rank: 1,
                isConnected: true,
                eventSequence: nowMs,
              },
            },
          },
        };
      });
    },

    goToQuestion: (instanceId, targetIndex) => {
      set((state) => {
        const entry = state.entries[instanceId];
        if (!entry || entry.allQuestions.length === 0) return state;

        const clampedIndex = Math.min(
          Math.max(targetIndex, 0),
          entry.allQuestions.length - 1,
        );
        if (
          clampedIndex === entry.currentQuestionIndex &&
          entry.bundle !== null
        ) {
          return state;
        }

        const targetQ = entry.allQuestions[clampedIndex]!;
        const activeTiming: QuestionTimingDto = entry.timing ?? {
          startsAt: new Date().toISOString(),
          durationMs: entry.totalDurationMs,
          serverNow: new Date().toISOString(),
        };

        const nextBundle = buildQuestionBundle(
          instanceId,
          targetQ,
          clampedIndex,
          entry.allQuestions.length,
          {
            quizTitle: entry.quizTitle,
            quizCategory: entry.quizCategory,
            difficulty: entry.difficulty,
            timing: activeTiming,
          },
        );

        const priorOptionId = entry.selectedAnswers[targetQ.questionId];

        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              currentQuestionIndex: clampedIndex,
              bundle: nextBundle,
              timing: activeTiming,
              submission: priorOptionId
                ? {
                    questionId: targetQ.questionId,
                    submittedAt: new Date().toISOString(),
                    accepted: true,
                    selectedOptionId: priorOptionId,
                  }
                : null,
              result: null,
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
        const { answeredCount, score } = computeScoreFromAnswers(
          entry.allQuestions,
          entry.selectedAnswers,
          entry.bundle?.question.basePoints ?? 100,
        );

        if (nextIndex >= entry.allQuestions.length) {
          const finalLeaderboard = buildFinalLeaderboard(
            instanceId,
            entry,
            answeredCount,
            score,
          );
          const nowIso = new Date().toISOString();
          const closure: InstanceClosedEventDto = {
            instanceId,
            status: "closed",
            closedAt: nowIso,
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
                playerSubmitted: true,
                progress: entry.progress
                  ? {
                      ...entry.progress,
                      answeredCount,
                      currentScore: Math.max(
                        entry.progress.currentScore,
                        score,
                      ),
                    }
                  : entry.progress,
                closure,
                finalLeaderboard,
              },
            },
          };
        }

        const nextQ = entry.allQuestions[nextIndex]!;
        const activeTiming: QuestionTimingDto = entry.timing ?? {
          startsAt: new Date().toISOString(),
          durationMs: entry.totalDurationMs,
          serverNow: new Date().toISOString(),
        };

        const nextBundle = buildQuestionBundle(
          instanceId,
          nextQ,
          nextIndex,
          entry.allQuestions.length,
          {
            quizTitle: entry.quizTitle,
            quizCategory: entry.quizCategory,
            difficulty: entry.difficulty,
            timing: activeTiming,
          },
        );

        const priorOptionId = entry.selectedAnswers[nextQ.questionId];

        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              currentQuestionIndex: nextIndex,
              bundle: nextBundle,
              timing: activeTiming,
              submission: priorOptionId
                ? {
                    questionId: nextQ.questionId,
                    submittedAt: new Date().toISOString(),
                    accepted: true,
                    selectedOptionId: priorOptionId,
                  }
                : null,
              result: null,
              progress: entry.progress
                ? {
                    ...entry.progress,
                    answeredCount: Math.max(
                      entry.progress.answeredCount,
                      answeredCount,
                    ),
                    currentScore: Math.max(entry.progress.currentScore, score),
                  }
                : null,
            },
          },
        };
      });
    },

    finishBattle: (instanceId, reason = "normal", outcome) => {
      set((state) => {
        const entry = state.entries[instanceId];
        if (!entry || entry.closure !== null) return state;

        const { answeredCount: localAnswered, score: localScore } =
          computeScoreFromAnswers(
            entry.allQuestions,
            entry.selectedAnswers,
            entry.bundle?.question.basePoints ?? 100,
          );

        const resolvedScore =
          typeof outcome?.score === "number"
            ? Math.max(outcome.score, entry.progress?.currentScore ?? 0)
            : Math.max(localScore, entry.progress?.currentScore ?? 0);
        const resolvedAnswered =
          typeof outcome?.answeredCount === "number"
            ? Math.max(outcome.answeredCount, localAnswered)
            : localAnswered;

        const finalLeaderboard = buildFinalLeaderboard(
          instanceId,
          entry,
          resolvedAnswered,
          resolvedScore,
        );

        const nowIso = new Date().toISOString();
        const closure: InstanceClosedEventDto = {
          instanceId,
          status: "closed",
          closedAt: nowIso,
          reason,
          finalLeaderboard,
          eventSequence: Date.now(),
        };

        return {
          entries: {
            ...state.entries,
            [instanceId]: {
              ...entry,
              playerSubmitted: true,
              progress: entry.progress
                ? {
                    ...entry.progress,
                    answeredCount: resolvedAnswered,
                    currentScore: resolvedScore,
                  }
                : entry.progress,
              closure,
              finalLeaderboard,
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
): {
  questionId: string;
  submittedAt: string;
  accepted: boolean;
  selectedOptionId?: string;
} | null {
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

export function selectAllQuestions(
  state: InstanceGameplayStore,
  instanceId: string,
): QuizQuestionAuthorDto[] {
  return state.entries[instanceId]?.allQuestions ?? EMPTY_QUESTIONS;
}

export function selectSelectedAnswers(
  state: InstanceGameplayStore,
  instanceId: string,
): Record<string, string> {
  return state.entries[instanceId]?.selectedAnswers ?? EMPTY_SELECTED_ANSWERS;
}

export function selectSelectedOptionForQuestion(
  state: InstanceGameplayStore,
  instanceId: string,
  questionId: string | null,
): string | null {
  if (!questionId) return null;
  return state.entries[instanceId]?.selectedAnswers?.[questionId] ?? null;
}

export function selectQuizTitle(
  state: InstanceGameplayStore,
  instanceId: string,
): string {
  return state.entries[instanceId]?.quizTitle ?? "";
}

export function selectAttemptId(
  state: InstanceGameplayStore,
  instanceId: string,
): string | null {
  return state.entries[instanceId]?.attemptId ?? null;
}

export function selectPlayerSubmitted(
  state: InstanceGameplayStore,
  instanceId: string,
): boolean {
  return state.entries[instanceId]?.playerSubmitted ?? false;
}

export function selectBattlePlayers(
  state: InstanceGameplayStore,
  instanceId: string,
): BattlePlayerStatus[] {
  return state.entries[instanceId]?.players ?? EMPTY_PLAYERS;
}

export function selectHostUserId(
  state: InstanceGameplayStore,
  instanceId: string,
): string | null {
  return state.entries[instanceId]?.hostUserId ?? null;
}

export function selectQuizId(
  state: InstanceGameplayStore,
  instanceId: string,
): string | null {
  return state.entries[instanceId]?.quizId ?? null;
}
