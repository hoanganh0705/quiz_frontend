"use client";

import { useEffect, useRef } from "react";

import {
  useInstanceLifecycle,
  useLiveLeaderboard,
} from "@/features/instances/play/hooks";
import {
  selectAllQuestions,
  selectGameplayFinalLeaderboard,
  selectGameplayProgress,
  useInstanceGameplayStore,
} from "@/features/instances/play/stores/instanceGameplay.store";
import { getInstanceLeaderboard } from "@/features/instances/services";

import { GameClosedSummary } from "./shared/GameClosedSummary";
import { GameResultSummary } from "./shared/GameResultSummary";

interface InstanceClosedSummaryProps {
  instanceId: string;
  currentPlayerId?: string | null;
  className?: string;
}

export function InstanceClosedSummary({
  instanceId,
  currentPlayerId = null,
  className,
}: InstanceClosedSummaryProps) {
  const { closure } = useInstanceLifecycle(instanceId);
  const { final: hookFinalLeaderboard } = useLiveLeaderboard(instanceId);
  const storeFinalLeaderboard = useInstanceGameplayStore((s) =>
    selectGameplayFinalLeaderboard(s, instanceId),
  );
  const playerProgress = useInstanceGameplayStore((s) =>
    selectGameplayProgress(s, instanceId),
  );
  const totalQuestions = useInstanceGameplayStore(
    (s) => selectAllQuestions(s, instanceId).length,
  );
  const fetchedAuthoritativeRef = useRef(false);

  const finalLeaderboard =
    storeFinalLeaderboard ?? closure?.finalLeaderboard ?? hookFinalLeaderboard;

  const isCompletedGame =
    closure !== null &&
    (closure.status === "finished" ||
      closure.reason === "normal" ||
      closure.reason === "completed" ||
      finalLeaderboard !== null);

  useEffect(() => {
    if (!isCompletedGame || fetchedAuthoritativeRef.current) return;

    let cancelled = false;
    void getInstanceLeaderboard(instanceId)
      .then((lbData) => {
        if (cancelled) return;
        fetchedAuthoritativeRef.current = true;
        type RawLeaderboardRow = {
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
        const rawItems: RawLeaderboardRow[] = Array.isArray(lbData)
          ? (lbData as unknown as RawLeaderboardRow[])
          : ((lbData as unknown as { items?: RawLeaderboardRow[] })?.items ??
            []);
        if (rawItems.length === 0) return;

        const lastSeq =
          useInstanceGameplayStore.getState().entries[instanceId]
            ?.lastEventSequence?.instance_final_leaderboard ?? 0;
        const nowSeq = Math.max(Date.now(), lastSeq) + 1;
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

        useInstanceGameplayStore.getState().applyFinalLeaderboard({
          event: "instance_final_leaderboard",
          instanceId,
          eventSequence: nowSeq,
          emittedAt: new Date().toISOString(),
          payloadVersion: 1,
          data: {
            instanceId,
            entries,
            winnerPlayerId: entries[0]?.playerId ?? "",
            closedAt: closure?.closedAt ?? new Date().toISOString(),
            totalQuestions,
          },
        });
      })
      .catch(() => {
        // Existing standings remain rendered if refetch fails
      });

    return () => {
      cancelled = true;
    };
  }, [isCompletedGame, instanceId, closure?.closedAt, totalQuestions]);

  if (!closure) return null;

  return (
    <div
      className={className}
      data-testid="instance-closed-summary"
      role="region"
      aria-label="Instance closed"
    >
      {isCompletedGame ? (
        <GameResultSummary
          instanceId={instanceId}
          finalLeaderboard={finalLeaderboard}
          playerProgress={playerProgress}
          currentPlayerId={currentPlayerId}
          closureReason={closure.reason}
        />
      ) : (
        <GameClosedSummary closure={closure} instanceId={instanceId} />
      )}
    </div>
  );
}
