"use client";

import { useEffect, useRef, useState } from "react";

import {
  getAttemptAnswers,
  startAttempt,
} from "@/features/attempts/services/attempts.service";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import {
  getInstance,
  getInstanceLeaderboard,
} from "@/features/instances/services";
import { getQuizByIdOrSlug } from "@/features/quizzes/services/quizzes.service";

import { useInstanceGameplayStore } from "../stores/instanceGameplay.store";

import type { FinalLeaderboardDto } from "../types/gameplay.types";
import type { ApiError } from "@/lib/api";

export interface UseInstanceGameInitResult {
  isLoading: boolean;
  error: ApiError | null;
  isNotParticipant: boolean;
  restrictedQuizTitle: string | null;
}

function extractAttemptId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.attemptId === "string" && obj.attemptId.length > 0) {
    return obj.attemptId;
  }
  const nested = obj.data;
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>;
    if (typeof inner.attemptId === "string" && inner.attemptId.length > 0) {
      return inner.attemptId;
    }
  }
  return null;
}

export function useInstanceGameInit(
  instanceId: string | null,
): UseInstanceGameInitResult {
  const { currentUser } = useAuthSession();
  const currentPlayerId = currentUser?.userId ?? undefined;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [isNotParticipant, setIsNotParticipant] = useState(false);
  const [restrictedQuizTitle, setRestrictedQuizTitle] = useState<string | null>(
    null,
  );
  const initializedRef = useRef<string | null>(null);

  const {
    initializeQuestions,
    applyLeaderboardUpdated,
    applyInstanceClosed,
    setPlayers,
    setQuizId,
    setAttemptId,
    setHostUserId,
    hydrateSelectedAnswers,
    submitPlayerBattle,
  } = useInstanceGameplayStore.getState();

  const initKey = instanceId ? `${instanceId}:${currentPlayerId ?? ""}` : null;

  useEffect(() => {
    if (!instanceId || !initKey) {
      setIsLoading(false);
      return;
    }

    if (initializedRef.current === initKey) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function initGame() {
      try {
        setIsLoading(true);
        setError(null);
        setIsNotParticipant(false);
        setRestrictedQuizTitle(null);

        const existingStoreEntry =
          useInstanceGameplayStore.getState().entries[instanceId!];
        if (
          existingStoreEntry?.playerId &&
          currentPlayerId &&
          existingStoreEntry.playerId !== currentPlayerId
        ) {
          useInstanceGameplayStore.getState().reset(instanceId!);
        }

        const instance = await getInstance(instanceId!);
        if (isCancelled || !instance) return;

        const nowIso = new Date().toISOString();
        const nowSeq = Date.now();

        if (instance.hostUserId) {
          setHostUserId(instanceId!, instance.hostUserId);
        }

        // Populate player roster & initial leaderboard from room players
        if (Array.isArray(instance.players) && instance.players.length > 0) {
          setPlayers(
            instanceId!,
            instance.players.map((p) => ({
              userId: p.userId,
              displayName: p.displayName || p.username,
              avatarUrl: p.avatarUrl ?? null,
              status: p.status,
            })),
          );

          applyLeaderboardUpdated({
            event: "leaderboard_updated",
            instanceId: instanceId!,
            eventSequence: nowSeq,
            emittedAt: nowIso,
            payloadVersion: 1,
            data: {
              instanceId: instanceId!,
              entries: instance.players.map((p, idx) => ({
                playerId: p.userId,
                displayName: p.displayName || p.username,
                avatarUrl: p.avatarUrl ?? undefined,
                score: Math.round(
                  (p as unknown as { score?: number }).score ?? 0,
                ),
                rank: idx + 1,
                answeredCount: 0,
                lastAwardedAt: null,
                eventSequence: nowSeq,
              })),
              updatedAt: nowIso,
              eventSequence: nowSeq,
            },
          });
        }

        // If instance is already closed or finished on the server
        if (instance.status === "closed" || instance.status === "finished") {
          let finalLeaderboard: FinalLeaderboardDto | null = null;
          let resolvedTotalQuestions = 0;

          const [lbResult, quizResult] = await Promise.allSettled([
            getInstanceLeaderboard(instanceId!),
            instance.quizId
              ? getQuizByIdOrSlug(instance.quizId)
              : Promise.resolve(null),
          ]);

          if (isCancelled) return;

          if (quizResult.status === "fulfilled" && quizResult.value) {
            resolvedTotalQuestions =
              quizResult.value.publishedVersion?.questions?.length ?? 0;
          }

          if (lbResult.status === "fulfilled") {
            const lbData = lbResult.value;
            type RawLbRow = {
              userId: string;
              displayName?: string | null;
              username?: string;
              avatarUrl?: string | null;
              scorePercent?: number | null;
              rank: number;
              correctCount?: number | null;
              answeredCount?: number | null;
              timeTakenMs?: number | null;
            };
            const rawItems: RawLbRow[] = Array.isArray(lbData)
              ? (lbData as unknown as RawLbRow[])
              : ((lbData as unknown as { items?: RawLbRow[] })?.items ?? []);
            if (rawItems.length > 0) {
              const entries = rawItems.map((r) => ({
                playerId: r.userId,
                displayName: r.displayName || r.username || "Player",
                avatarUrl: r.avatarUrl ?? undefined,
                score: Math.round(r.scorePercent ?? 0),
                rank: r.rank,
                answeredCount: r.answeredCount ?? r.correctCount ?? 0,
                correctCount: r.correctCount ?? null,
                timeTakenMs: r.timeTakenMs ?? null,
                lastAwardedAt: null,
                eventSequence: nowSeq,
              }));
              finalLeaderboard = {
                instanceId: instanceId!,
                entries,
                winnerPlayerId: entries[0]?.playerId ?? "",
                closedAt: instance.closedAt ?? nowIso,
                totalQuestions: resolvedTotalQuestions,
              };
            }
          }

          if (
            !finalLeaderboard &&
            Array.isArray(instance.players) &&
            instance.players.length > 0
          ) {
            const entries = instance.players.map((p, idx) => ({
              playerId: p.userId,
              displayName: p.displayName || p.username,
              avatarUrl: p.avatarUrl ?? undefined,
              score: Math.round(
                (p as unknown as { score?: number }).score ?? 0,
              ),
              rank: idx + 1,
              answeredCount: 0,
              lastAwardedAt: null,
              eventSequence: nowSeq,
            }));
            finalLeaderboard = {
              instanceId: instanceId!,
              entries,
              winnerPlayerId: entries[0]?.playerId ?? "",
              closedAt: instance.closedAt ?? nowIso,
              totalQuestions: resolvedTotalQuestions,
            };
          }

          applyInstanceClosed({
            event: "instance_closed",
            instanceId: instanceId!,
            eventSequence: nowSeq,
            emittedAt: nowIso,
            payloadVersion: 1,
            data: {
              instanceId: instanceId!,
              status: instance.status as "closed" | "finished",
              closedAt: instance.closedAt ?? nowIso,
              reason: "normal",
              finalLeaderboard,
              eventSequence: nowSeq,
            },
          });
          setIsLoading(false);
          initializedRef.current = initKey;
          return;
        }

        // Prevent non-participants from entering a live battle that is already running
        const isRunningNonParticipant =
          instance.status === "running" &&
          Boolean(currentPlayerId) &&
          Array.isArray(instance.players) &&
          instance.players.length > 0 &&
          instance.hostUserId !== currentPlayerId &&
          !instance.players.some((p) => p.userId === currentPlayerId);

        if (isRunningNonParticipant) {
          setIsNotParticipant(true);
          setRestrictedQuizTitle(instance.quizTitle || null);
          setIsLoading(false);
          initializedRef.current = initKey;
          return;
        }

        // Fetch quiz questions
        if (instance.quizId) {
          setQuizId(instanceId!, instance.quizId);
          const quiz = await getQuizByIdOrSlug(instance.quizId);
          if (isCancelled) return;

          const questions = quiz?.publishedVersion?.questions ?? [];
          if (questions.length > 0) {
            const serverTimestamp = (
              instance as unknown as { serverTimestamp?: string }
            ).serverTimestamp;
            initializeQuestions(instanceId!, questions, {
              quizTitle: quiz?.title || instance.quizTitle || "Quiz",
              quizCategory: quiz?.categoryName ?? undefined,
              difficulty:
                quiz?.publishedVersion?.difficulty ?? instance.difficulty,
              durationMs: instance.durationMs,
              startedAt: instance.startedAt ?? undefined,
              serverNow: serverTimestamp,
              playerId: currentPlayerId,
            });
          }

          // Link or start a real instance-scoped quiz attempt so the backend
          // can persist answers, score the player, and transition player status.
          const myPlayer = currentPlayerId
            ? instance.players?.find((p) => p.userId === currentPlayerId)
            : undefined;

          const hydrateAttemptSelections = async (targetAttemptId: string) => {
            try {
              const rawAnswers = await getAttemptAnswers(targetAttemptId);
              const wrapped = rawAnswers as unknown as {
                answers?: Array<{
                  questionId?: string;
                  selectedOptionId?: string | null;
                }>;
                data?:
                  | {
                      answers?: Array<{
                        questionId?: string;
                        selectedOptionId?: string | null;
                      }>;
                    }
                  | Array<{
                      questionId?: string;
                      selectedOptionId?: string | null;
                    }>;
              };
              const list = Array.isArray(wrapped?.answers)
                ? wrapped.answers
                : Array.isArray(wrapped?.data)
                  ? wrapped.data
                  : Array.isArray(wrapped?.data?.answers)
                    ? wrapped.data.answers
                    : [];
              const restored: Record<string, string> = {};
              for (const item of list) {
                if (item.questionId && item.selectedOptionId) {
                  restored[item.questionId] = item.selectedOptionId;
                }
              }
              if (!isCancelled && Object.keys(restored).length > 0) {
                hydrateSelectedAnswers(instanceId!, restored);
              }
            } catch {
              // Non-fatal; player can still continue or view waiting screen
            }
          };

          if (myPlayer?.status === "finished") {
            if (myPlayer.attemptId) {
              setAttemptId(instanceId!, myPlayer.attemptId);
              await hydrateAttemptSelections(myPlayer.attemptId);
            }
            if (!isCancelled) {
              submitPlayerBattle(instanceId!);
            }
          } else {
            // Start or reuse the battle-linked attempt even if the server is
            // still transitioning from `countdown` -> `running` at mount time.
            let resolvedAttemptId: string | null = myPlayer?.attemptId ?? null;

            if (!resolvedAttemptId) {
              try {
                const started = await startAttempt(instance.quizId, {
                  contextType: "solo",
                  contextRefId: instanceId!,
                });
                resolvedAttemptId = extractAttemptId(started);
              } catch {
                // Non-blocking fallback if player already completed or is not eligible
              }
            }
            if (!isCancelled && resolvedAttemptId) {
              setAttemptId(instanceId!, resolvedAttemptId);

              // Restore previously saved selections on mid-battle reload
              await hydrateAttemptSelections(resolvedAttemptId);
            }
          }
        }

        initializedRef.current = initKey;
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err as ApiError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void initGame();

    return () => {
      isCancelled = true;
    };
  }, [
    instanceId,
    initKey,
    currentPlayerId,
    initializeQuestions,
    applyLeaderboardUpdated,
    applyInstanceClosed,
    setPlayers,
    setQuizId,
    setAttemptId,
    setHostUserId,
    hydrateSelectedAnswers,
    submitPlayerBattle,
  ]);

  return { isLoading, error, isNotParticipant, restrictedQuizTitle };
}
