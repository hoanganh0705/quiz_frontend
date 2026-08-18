"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

import type {
InstanceLeaderboardEntryDto,
InstanceLeaderboardResponseDto,
} from "@/lib/api/generated/schemas";

import { ApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import { getInstanceLeaderboard } from "@/features/instances/services";

import {
type FinalLeaderboardDto,
type GameplayEventEnvelope,
type LeaderboardEntryDto,
type LeaderboardUpdatedEventDto,
} from "../types/gameplay.types";
import { useInstanceGameSocket } from "./useInstanceGameSocket";
import { useSocketEventSequence } from "./useSocketEventSequence";
import { useInstanceLifecycle } from "./useInstanceLifecycle";
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
rest: InstanceLeaderboardEntryDto,
): LeaderboardEntryDto {
return {
playerId: rest.userId,
displayName: rest.displayName ?? rest.username,
avatarUrl: rest.avatarUrl ?? undefined,
score: rest.scorePercent ?? 0,
rank: rest.rank,
answeredCount: rest.correctCount ?? 0,
lastAwardedAt: null,
eventSequence: 0,
  };
}

function orderLeaderboard(entries: LeaderboardEntryDto[]): LeaderboardEntryDto[] {
return [...entries].sort((a, b) => {
if (a.rank !== b.rank) return a.rank - b.rank;
if (b.score !== a.score) return b.score - a.score;
return a.playerId.localeCompare(b.playerId);
  });
}

export function useLiveLeaderboard(
instanceId: string | null,
): UseLiveLeaderboardResult {
const flagValue = getFeatureFlagValue("multiplayer_play_live");
const isPlaceholder = flagValue === "placeholder";

const { subscribe } = useInstanceGameSocket(instanceId);
const { shouldAccept, markAccepted } = useSocketEventSequence(instanceId);
const { isClosed } = useInstanceLifecycle(instanceId);
const { applyLeaderboardUpdated } = useInstanceGameplayStore.getState();

const swrKey = useMemo<null | string>(
() =>
isPlaceholder || instanceId === null
? null
: `instances:leaderboard:${instanceId}`,
[isPlaceholder, instanceId],
  );

const fetcher = useCallback(
async (key: string): Promise<LeaderboardEntryDto[]> => {

const parts = key.split(":");
const id = parts[parts.length - 1];
const rest = await getInstanceLeaderboard(id) as unknown as InstanceLeaderboardResponseDto;
return (rest.items ?? []).map(mapRestEntryToLeaderboardEntry);
    },
[],
  );

const {
data: restEntries,
error: restError,
isLoading,
mutate: swrMutate,
  } = useSWR(swrKey, fetcher, {
revalidateOnFocus: false,
revalidateOnReconnect: false,
shouldRetryOnError: false,
  });

const restEntriesRef = useRef<LeaderboardEntryDto[]>([]);
restEntriesRef.current = restEntries ?? [];

const [liveEntries, setLiveEntries] = useState<LeaderboardEntryDto[]>([]);

useEffect(() => {
if (restEntries !== undefined) {
setLiveEntries(restEntries);
    }
  }, [restEntries]);

const handleEnvelope = useCallback(
(envelope: GameplayEventEnvelope<unknown>) => {
if (envelope.event !== "leaderboard_updated") return;
const typed = envelope as GameplayEventEnvelope<LeaderboardUpdatedEventDto>;

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
const existing = mergedMap.get(entry.playerId);
if (!existing || entry.eventSequence > existing.eventSequence) {
mergedMap.set(entry.playerId, entry);
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
return new ApiError({
status: 0,
code: "UNKNOWN",
message: "Failed to load leaderboard",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }, [restError]);

const isStale = error !== null && restEntries !== undefined;

const retry = useCallback(async (): Promise<void> => {
await swrMutate();
  }, [swrMutate]);

if (isPlaceholder) {
return {
entries: [],
final: null,
isLoading: false,
isStale: false,
error: null,
retry: async () => {},
    };
  }

return {
entries: liveEntries,
final,
isLoading,
isStale,
error,
retry,
  };
}
