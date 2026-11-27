"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import type {
  InstanceLeaderboardEntryDto,
  InstanceLeaderboardResponseDto,
} from "@/lib/api/generated/schemas";

import { ApiError } from "@/lib/api";
import { getInstanceLeaderboard } from "@/features/instances/services";

import {
  type FinalLeaderboardDto,
  type GameplayEventEnvelope,
  type LeaderboardEntryDto,
  type LeaderboardUpdatedEventDto,
} from "../types/gameplay.types";
import { useInstanceGameSocket } from "./useInstanceGameSocket";
import { useSocketEventSequence } from "./useSocketEventSequence";
import {
  useInstanceGameplayStore,
  selectGameplayFinalLeaderboard,
} from "../stores/instanceGameplay.store";

export interface UseLiveLeaderboardResult {
  entries: LeaderboardEntryDto[];
  final: FinalLeaderboardDto | null;
  isLoading: boolean;
  isStale: boolean;
  error: ApiError | null;
  retry: () => Promise<void>;
}

function mapRestEntryToLeaderboardEntry(
  rest: InstanceLeaderboardEntryDto & { answeredCount?: number | null },
): LeaderboardEntryDto {
  return {
    playerId: rest.userId,
    displayName: rest.displayName ?? rest.username,
    avatarUrl: rest.avatarUrl ?? undefined,
    score: Math.round(rest.scorePercent ?? 0),
    rank: rest.rank,
    answeredCount: rest.answeredCount ?? rest.correctCount ?? 0,
    correctCount: rest.correctCount ?? null,
    timeTakenMs: rest.timeTakenMs ?? null,
    lastAwardedAt: null,
    eventSequence: 0,
  };
}

function orderLeaderboard(
  entries: LeaderboardEntryDto[],
): LeaderboardEntryDto[] {
  return [...entries].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (b.score !== a.score) return b.score - a.score;
    return a.playerId.localeCompare(b.playerId);
  });
}

export function useLiveLeaderboard(
  instanceId: string | null,
): UseLiveLeaderboardResult {
  const { subscribe } = useInstanceGameSocket(instanceId);
  const { shouldAccept, markAccepted } = useSocketEventSequence(instanceId);
  const { applyLeaderboardUpdated } = useInstanceGameplayStore.getState();

  const {
    data: restEntries,
    error: restError,
    isLoading,
    refetch,
  } = useQuery<LeaderboardEntryDto[]>(
    {
      queryKey: ["instances", "leaderboard", instanceId],
      queryFn: async (): Promise<LeaderboardEntryDto[]> => {
        if (!instanceId) return [];
        const rest = await getInstanceLeaderboard(instanceId);
        const items: InstanceLeaderboardEntryDto[] = Array.isArray(rest)
          ? (rest as unknown as InstanceLeaderboardEntryDto[])
          : ((rest as unknown as InstanceLeaderboardResponseDto)?.items ?? []);
        return items.map(mapRestEntryToLeaderboardEntry);
      },
      enabled: instanceId !== null,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
    getQueryClient(),
  );

  const restEntriesRef = useRef<LeaderboardEntryDto[]>([]);
  useEffect(() => {
    restEntriesRef.current = restEntries ?? [];
  }, [restEntries]);

  const [liveEntries, setLiveEntries] = useState<LeaderboardEntryDto[]>([]);

  useEffect(() => {
    if (restEntries !== undefined) {
      setLiveEntries(restEntries);
    }
  }, [restEntries]);

  const handleEnvelope = useCallback(
    (envelope: GameplayEventEnvelope<unknown>) => {
      if (envelope.event !== "leaderboard_updated") return;
      const typed =
        envelope as GameplayEventEnvelope<LeaderboardUpdatedEventDto>;

      if (!shouldAccept(typed.event, typed.eventSequence)) return;

      markAccepted(typed.event, typed.eventSequence);
      applyLeaderboardUpdated(typed);

      setLiveEntries((prev) => {
        const mergedMap = new Map<string, LeaderboardEntryDto>();

        for (const entry of restEntriesRef.current) {
          mergedMap.set(entry.playerId, entry);
        }

        for (const entry of prev) {
          const existing = mergedMap.get(entry.playerId);
          if (!existing || entry.eventSequence > existing.eventSequence) {
            mergedMap.set(entry.playerId, entry);
          }
        }

        for (const entry of typed.data.entries) {
          const normalized = {
            ...entry,
            score: Math.round(entry.score ?? 0),
          };
          const existing = mergedMap.get(normalized.playerId);
          if (!existing || normalized.eventSequence > existing.eventSequence) {
            mergedMap.set(normalized.playerId, normalized);
          }
        }

        return orderLeaderboard(Array.from(mergedMap.values()));
      });
    },
    [shouldAccept, markAccepted, applyLeaderboardUpdated],
  );

  useEffect(() => {
    if (instanceId === null) return;
    return subscribe(handleEnvelope);
  }, [instanceId, subscribe, handleEnvelope]);

  const final = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayFinalLeaderboard(s, instanceId) : null,
  );

  const error = useMemo<ApiError | null>(() => {
    if (!restError) return null;
    if (restError instanceof ApiError) return restError;
    return ApiError.fromInput({
      status: 0,
      code: "UNKNOWN",
      message: "Failed to load leaderboard",
    });
  }, [restError]);

  const isStale = error !== null && restEntries !== undefined;

  const retry = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  return {
    entries: liveEntries,
    final,
    isLoading,
    isStale,
    error,
    retry,
  };
}
