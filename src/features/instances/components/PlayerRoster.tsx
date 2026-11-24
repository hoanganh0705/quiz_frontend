"use client";

import { useMemo } from "react";
import { Crown } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

import { useInstancePlayers } from "@/features/instances/hooks/useInstancePlayers";
import { useInstance } from "@/features/instances/hooks/useInstance";
import {
  selectInstanceRealtimePlayers,
  selectInstanceRealtimeStatus,
  selectInstanceRemovedUserIds,
  useInstanceRealtimeStore,
} from "@/features/instances/stores/useInstanceRealtimeStore";
import { useInstanceRealtimeBridge } from "@/features/instances/hooks/useInstanceRealtimeBridge";
import type {
  InstancePlayer,
  InstanceStatus,
} from "@/features/instances/types/instance.types";

import {
  InstanceClosedState,
  InstanceEmptyState,
  InstanceErrorState,
  InstanceLobbySkeleton,
  InstanceStaleState,
} from "./shared";

export interface PlayerRosterProps {
  instanceId: string | null;

  currentUserId?: string | null;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function mergeRosters(
  rest: readonly InstancePlayer[],
  realtime: Record<string, InstancePlayer> | null,
  removedUserIds: Set<string> | null,
): InstancePlayer[] {
  const merged: InstancePlayer[] = [];
  const seenIds = new Set<string>();

  for (const player of rest) {
    if (removedUserIds?.has(player.id) || removedUserIds?.has(player.userId)) {
      continue;
    }
    merged.push(player);
    seenIds.add(player.id);
    if (player.userId) seenIds.add(player.userId);
  }

  if (realtime !== null) {
    for (const player of Object.values(realtime)) {
      if (
        removedUserIds?.has(player.id) ||
        (player.userId && removedUserIds?.has(player.userId))
      ) {
        continue;
      }
      if (seenIds.has(player.id) || (player.userId && seenIds.has(player.userId))) {
        continue;
      }
      merged.push(player);
      seenIds.add(player.id);
      if (player.userId) seenIds.add(player.userId);
    }
  }
  return merged;
}

function shouldShowClosed(status: InstanceStatus | null): boolean {
  return status === "closed" || status === "finished";
}

export function PlayerRoster({
  instanceId,
  currentUserId = null,
  className,
}: PlayerRosterProps) {
  useInstanceRealtimeBridge(instanceId);

  const {
    instance,
    isLoading: isInstanceLoading,
    error: instanceError,
    refresh: refreshInstance,
    isStale: instanceStale,
  } = useInstance(instanceId, currentUserId);
  const hostUserId = instance?.hostUserId ?? null;
  const realtimeStatus = useInstanceRealtimeStore((state) =>
    instanceId === null
      ? null
      : selectInstanceRealtimeStatus(state, instanceId),
  );
  const status: InstanceStatus | null =
    realtimeStatus ?? instance?.status ?? null;

  const playerFilters = useMemo(
    () => ({ hostUserId, currentUserId }),
    [hostUserId, currentUserId],
  );

  const {
    items: restPlayers,
    isLoading: isPlayersLoading,
    error: playersError,
    refresh: refreshPlayers,
  } = useInstancePlayers(instanceId, playerFilters);

  const realtimePlayers = useInstanceRealtimeStore((state) =>
    instanceId === null
      ? null
      : selectInstanceRealtimePlayers(state, instanceId),
  );

  const removedUserIds = useInstanceRealtimeStore((state) =>
    instanceId === null
      ? null
      : selectInstanceRemovedUserIds(state, instanceId),
  );

  const basePlayers = useMemo(() => {
    const list =
      restPlayers.length > 0 ? restPlayers : (instance?.players ?? []);
    return list
      .filter((p) => {
        const userId = (p as { userId?: string; id?: string }).userId ?? (p as { userId?: string; id?: string }).id;
        return !removedUserIds?.has(userId!) && !removedUserIds?.has((p as { userId?: string; id?: string }).id!);
      })
      .map((p) => {
        const userId = ((p as { userId?: string; id?: string }).userId ?? (p as { userId?: string; id?: string }).id)!;
        return {
          ...p,
          id: userId,
          userId,
          isCurrentUser: currentUserId !== null && userId === currentUserId,
          isHost: hostUserId !== null && userId === hostUserId,
        };
      });
  }, [restPlayers, instance?.players, hostUserId, currentUserId, removedUserIds]);

  const merged = useMemo(
    () => mergeRosters(basePlayers, realtimePlayers, removedUserIds),
    [basePlayers, realtimePlayers, removedUserIds],
  );

  if (shouldShowClosed(status)) {
    return (
      <div className={cn("space-y-4", className)} data-testid="player-roster">
        <h2 className="text-lg font-semibold">Players</h2>
        <InstanceClosedState status={status ?? undefined} closedAt={null} />
      </div>
    );
  }

  if (playersError !== null) {
    return (
      <div className={cn("space-y-4", className)} data-testid="player-roster">
        <h2 className="text-lg font-semibold">Players</h2>
        <InstanceErrorState
          error={playersError}
          onRetry={() => {
            void refreshPlayers();
          }}
        />
      </div>
    );
  }

  if (instanceError !== null && status === null) {
    return (
      <div className={cn("space-y-4", className)} data-testid="player-roster">
        <h2 className="text-lg font-semibold">Players</h2>
        <InstanceErrorState
          error={instanceError}
          onRetry={() => {
            void refreshInstance();
          }}
        />
      </div>
    );
  }

  const isLoading = isInstanceLoading || isPlayersLoading;
  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)} data-testid="player-roster">
        <h2 className="text-lg font-semibold">Players</h2>
        <InstanceLobbySkeleton />
      </div>
    );
  }

  if (merged.length === 0) {
    return (
      <div className={cn("space-y-4", className)} data-testid="player-roster">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Players</h2>
        </div>
        {instanceStale && (
          <InstanceStaleState
            onRetry={() => {
              void refreshInstance();
            }}
          />
        )}
        <InstanceEmptyState />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} data-testid="player-roster">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold tracking-tight">Players</h2>
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-muted text-foreground border border-border/70">
            {merged.length}
            {instance?.maxPlayers ? ` / ${instance.maxPlayers}` : ""}
          </span>
        </div>

        {merged.length < 2 ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            Waiting for players (min 2)…
          </span>
        ) : (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Ready for battle!
          </span>
        )}
      </div>

      {instanceStale && (
        <InstanceStaleState
          onRetry={() => {
            void refreshInstance();
          }}
        />
      )}

      <ul
        className="space-y-2.5"
        role="list"
        aria-label="Players in this instance"
      >
        {merged.map((player) => (
          <li
            key={player.id}
            role="listitem"
            aria-label={
              player.isCurrentUser
                ? `${player.displayName ?? player.username ?? "Player"} (you)`
                : (player.displayName ?? player.username ?? "Player")
            }
            className={cn(
              "flex items-center gap-3.5 p-3.5 rounded-xl border transition-all",
              player.isCurrentUser
                ? "border-brand/40 bg-brand/5 dark:bg-brand/10 shadow-2xs"
                : "border-border/70 bg-card hover:border-border",
            )}
          >
            <Avatar className="h-9 w-9 border border-border/60">
              <AvatarFallback className="font-semibold text-xs">
                {getInitials(player.displayName ?? player.username ?? "?")}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate text-foreground">
                  {player.displayName ?? player.username ?? "Unknown player"}
                </p>
                {player.isCurrentUser && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-brand/10 text-brand border border-brand/20">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {player.isHost ? "Room Host" : "Challenger"}
              </p>
            </div>

            {player.isHost && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20"
                aria-label="Host"
              >
                <Crown className="h-3.5 w-3.5" aria-hidden />
                Host
              </span>
            )}
          </li>
        ))}
      </ul>

      {merged.length === 1 && (
        <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center">
          <p className="text-xs text-muted-foreground">
            Share the room code or link above with friends. Matches require at least 2 players to start!
          </p>
        </div>
      )}
    </div>
  );
}
