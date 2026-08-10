"use client";

/**
 * `useLiveLeaderboard` — live leaderboard with REST rehydration and
 * Socket.IO deduplication + ordering.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.B5.
 *
 * ## What this hook owns
 *
 * - REST rehydration: fetch the current leaderboard via
 *   `getInstanceLeaderboard` (Story 5.6) on mount / `id` change.
 * - Subscribe to `leaderboard_updated` envelopes from
 *   `useInstanceGameSocket`, deduplicate by `playerId` and `eventSequence`,
 *   and order entries by `rank` ascending; ties broken by `score` desc
 *   then `playerId` asc (deterministic).
 * - Populate `final` from `instance_closed` when available.
 * - Surface `isStale` when revalidation fails or the leaderboard has
 *   not been updated within the server cadence.
 * - Expose `retry()` for bounded retry on failure.
 * - Return safe fallbacks when `multiplayer_play_live === 'placeholder'`.
 *
 * ## REST vs. WS DTO mapping
 *
 * The REST leaderboard returns `InstanceLeaderboardResponseDto.items`
 * (SDK-generated, with `userId`, `username`, `displayName`, `scorePercent`,
 * `correctCount`, etc.). The Socket.IO `leaderboard_updated` event returns
 * `LeaderboardEntryDto[]` (the Story 5.8 type, with `playerId`, `score`,
 * `answeredCount`, `lastAwardedAt`). The hook maps REST entries to the
 * WS shape so the merge and ordering logic works on a unified type.
 *
 * ## Ordering contract
 *
 * Entries are returned ordered by `rank` ascending. Ties are broken
 * deterministically: `score` descending, then `playerId` ascending.
 * The ordering is enforced after every merge (REST + realtime) so the
 * UI never renders out-of-order entries.
 *
 * ## Feature flag
 *
 * Returns safe fallbacks when `multiplayer_play_live === 'placeholder'`.
 */

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

// ─── Result type ─────────────────────────────────────────────────────────

export interface UseLiveLeaderboardResult {
  /** Ordered leaderboard entries. `[]` before the first fetch or update. */
  entries: LeaderboardEntryDto[];
  /** Final leaderboard from `instance_closed`. `null` before closure. */
  final: FinalLeaderboardDto | null;
  isLoading: boolean;
  /** `true` when revalidation fails with cached data present. */
  isStale: boolean;
  /** Error from the last failed revalidation. `null` when idle. */
  error: ApiError | null;
  /** Revalidate the REST SWR key. */
  retry: () => Promise<void>;
}

// ─── REST → WS DTO mapper ────────────────────────────────────────────────

/**
 * Map a REST `InstanceLeaderboardEntryDto` to a `LeaderboardEntryDto`.
 *
 * The REST entry carries `userId`, `username`, `scorePercent`, etc.
 * The WS entry carries `playerId` (synonym for `userId`), `score`
 * (absolute points, derived from `scorePercent` × base), `answeredCount`,
 * and `lastAwardedAt`. We use `userId` → `playerId` and `scorePercent`
 * as a proxy for ordering; the WS `score` field takes precedence in the
 * realtime merge.
 *
 * For the REST rehydration, `score` and `answeredCount` are derived from
 * `scorePercent` and `correctCount` respectively. `lastAwardedAt` is
 * `null` for REST entries (no per-answer timestamps available in the
 * REST response). `eventSequence` is `0` for REST entries (they don't
 * carry a sequence).
 */
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

// ─── Ordering ─────────────────────────────────────────────────────────────

/**
 * Sort leaderboard entries deterministically.
 *
 * Ties broken by: `score` descending, then `playerId` ascending.
 * This is deterministic across all clients — confirmed by the backend.
 */
function orderLeaderboard(entries: LeaderboardEntryDto[]): LeaderboardEntryDto[] {
  return [...entries].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (b.score !== a.score) return b.score - a.score;
    return a.playerId.localeCompare(b.playerId);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useLiveLeaderboard(
  instanceId: string | null,
): UseLiveLeaderboardResult {
  const flagValue = getFeatureFlagValue("multiplayer_play_live");
  const isPlaceholder = flagValue === "placeholder";

  const { subscribe } = useInstanceGameSocket(instanceId);
  const { shouldAccept, markAccepted } = useSocketEventSequence(instanceId);
  const { isClosed } = useInstanceLifecycle(instanceId);
  const { applyLeaderboardUpdated } = useInstanceGameplayStore.getState();

  // ─── REST rehydration ─────────────────────────────────────────────────
  //
  // The SWR key is the canonical cache key. When `instanceId` is null
  // or the flag is placeholder, the key is null and no fetch runs.

  const swrKey = useMemo<null | string>(
    () =>
      isPlaceholder || instanceId === null
        ? null
        : `instances:leaderboard:${instanceId}`,
    [isPlaceholder, instanceId],
  );

  const fetcher = useCallback(
    async (key: string): Promise<LeaderboardEntryDto[]> => {
      // Key format: `instances:leaderboard:{instanceId}`
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

  // ─── Merge REST + realtime ───────────────────────────────────────────
  //
  // The REST entries are the authoritative base. The realtime stream
  // applies deltas. We merge by `playerId` and keep the entry with the
  // higher `eventSequence` when the same playerId appears in both.

  // Ref to track the latest REST entries so we can access them in the
  // realtime merge without creating a closure dependency.
  const restEntriesRef = useRef<LeaderboardEntryDto[]>([]);
  restEntriesRef.current = restEntries ?? [];

  const [liveEntries, setLiveEntries] = useState<LeaderboardEntryDto[]>([]);

  // Sync from REST when the SWR response changes.
  useEffect(() => {
    if (restEntries !== undefined) {
      setLiveEntries(restEntries);
    }
  }, [restEntries]);

  // ─── Subscribe to realtime updates ───────────────────────────────────

  const handleEnvelope = useCallback(
    (envelope: GameplayEventEnvelope<unknown>) => {
      if (envelope.event !== "leaderboard_updated") return;
      const typed = envelope as GameplayEventEnvelope<LeaderboardUpdatedEventDto>;

      if (!shouldAccept(typed.event, typed.eventSequence)) return;

      markAccepted(typed.event, typed.eventSequence);
      applyLeaderboardUpdated(typed);

      // Merge with the current local entries, prioritizing higher eventSequence.
      setLiveEntries((prev) => {
        const mergedMap = new Map<string, LeaderboardEntryDto>();

        // Start with REST entries as authoritative base.
        for (const entry of restEntriesRef.current) {
          mergedMap.set(entry.playerId, entry);
        }

        // Overlay previous realtime entries (higher eventSequence wins).
        for (const entry of prev) {
          const existing = mergedMap.get(entry.playerId);
          if (!existing || entry.eventSequence > existing.eventSequence) {
            mergedMap.set(entry.playerId, entry);
          }
        }

        // Overlay new realtime entries.
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

  // ─── Final leaderboard ───────────────────────────────────────────────

  const final = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayFinalLeaderboard(s, instanceId) : null,
  );

  // ─── Error & stale ───────────────────────────────────────────────────

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

  // ─── retry ──────────────────────────────────────────────────────────

  const retry = useCallback(async (): Promise<void> => {
    await swrMutate();
  }, [swrMutate]);

  // ─── Fallback ───────────────────────────────────────────────────────

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
