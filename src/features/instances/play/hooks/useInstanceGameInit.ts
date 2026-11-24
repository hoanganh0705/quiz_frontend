"use client";

import { useEffect, useState, useRef } from "react";
import { getInstance, getInstanceLeaderboard } from "@/features/instances/services";
import { getQuizByIdOrSlug } from "@/features/quizzes/services/quizzes.service";
import { useInstanceGameplayStore } from "../stores/instanceGameplay.store";
import type { ApiError } from "@/lib/api";
import type { FinalLeaderboardDto } from "../types/gameplay.types";

export interface UseInstanceGameInitResult {
  isLoading: boolean;
  error: ApiError | null;
}

export function useInstanceGameInit(
  instanceId: string | null,
): UseInstanceGameInitResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const initializedRef = useRef<string | null>(null);

  const { initializeQuestions, applyLeaderboardUpdated, applyInstanceClosed } =
    useInstanceGameplayStore.getState();

  useEffect(() => {
    if (!instanceId) {
      setIsLoading(false);
      return;
    }

    if (initializedRef.current === instanceId) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function initGame() {
      try {
        setIsLoading(true);
        setError(null);

        const instance = await getInstance(instanceId!);
        if (isCancelled || !instance) return;

        const nowIso = new Date().toISOString();
        const nowSeq = Date.now();

        // Populate initial leaderboard from players in room
        if (Array.isArray(instance.players) && instance.players.length > 0) {
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
                score: (p as unknown as { score?: number }).score ?? 0,
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

        // If instance is closed or finished
        if (instance.status === "closed" || instance.status === "finished") {
          let finalLeaderboard: FinalLeaderboardDto | null = null;
          try {
            const lbData = await getInstanceLeaderboard(instanceId!);
            const rawItems = (lbData as unknown as { items?: Array<{ userId: string; displayName?: string; username?: string; avatarUrl?: string; scorePercent?: number; rank: number; correctCount?: number }> }).items ?? [];
            if (rawItems.length > 0) {
              const entries = rawItems.map((r) => ({
                playerId: r.userId,
                displayName: r.displayName || r.username || "Player",
                avatarUrl: r.avatarUrl,
                score: r.scorePercent ?? 0,
                rank: r.rank,
                answeredCount: r.correctCount ?? 0,
                lastAwardedAt: null,
                eventSequence: nowSeq,
              }));
              finalLeaderboard = {
                instanceId: instanceId!,
                entries,
                winnerPlayerId: entries[0]?.playerId ?? "",
                closedAt: instance.closedAt ?? nowIso,
                totalQuestions: 0,
              };
            }
          } catch {
            // Leaderboard fetch fallback
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
              score: (p as unknown as { score?: number }).score ?? 0,
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
              totalQuestions: 0,
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
          initializedRef.current = instanceId;
          return;
        }

        // Fetch quiz questions
        if (instance.quizId) {
          const quiz = await getQuizByIdOrSlug(instance.quizId);
          if (isCancelled) return;

          const questions = quiz?.publishedVersion?.questions ?? [];
          if (questions.length > 0) {
            initializeQuestions(instanceId!, questions, {
              quizTitle: quiz?.title || instance.quizTitle || "Quiz",
              quizCategory: quiz?.categoryName ?? undefined,
              difficulty:
                quiz?.publishedVersion?.difficulty ?? instance.difficulty,
              durationMs: instance.durationMs,
              startedAt: instance.startedAt ?? undefined,
            });
          }
        }

        initializedRef.current = instanceId;
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
    initializeQuestions,
    applyLeaderboardUpdated,
    applyInstanceClosed,
  ]);

  return { isLoading, error };
}
