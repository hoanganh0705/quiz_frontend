"use client";

/**
 * `PlayerRoster` — per-instance player roster panel.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.D1.
 *
 * ## Purpose
 *
 * Render the per-instance player roster combining the REST roster
 * (from `useInstancePlayers`) and the realtime roster mirror (from
 * the per-instance realtime store). The two sources are deduplicated
 * by `playerId` (REST wins on conflict because it is the canonical
 * source). The component composes the shared primitives for empty,
 * stale, error, and closed states.
 *
 * ## What this component does NOT do
 *
 * - It does NOT mutate the roster. Joins / leaves go through the
 *   `JoinLeaveCta` component (TKT-5.7.D3) which uses the lifecycle
 *   mutation hooks (TKT-5.7.B4).
 * - It does NOT decide permissions. Permission decisions live in
 *   `useInstancePermissions` (TKT-5.7.B3).
 * - It does NOT advance lifecycle state. The status banner
 *   (`InstanceStatusBanner`, TKT-5.7.D2) renders the server-provided
 *   status verbatim.
 */

import { useMemo } from "react";
import { Crown } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { cn } from "@/shared/utils/merge-class-names";

import { useInstancePlayers } from "@/features/instances/hooks/useInstancePlayers";
import { useInstance } from "@/features/instances/hooks/useInstance";
import {
  selectInstanceRealtimePlayers,
  useInstanceRealtimeStore,
} from "@/features/instances/stores/useInstanceRealtimeStore";
import {
  useInstanceRealtimeBridge,
} from "@/features/instances/hooks/useInstanceRealtimeBridge";
import type { InstancePlayer, InstanceStatus } from "@/features/instances/types/instance.types";

import {
  InstanceClosedState,
  InstanceEmptyState,
  InstanceErrorState,
  InstanceLobbySkeleton,
  InstanceStaleState,
} from "./shared";

export interface PlayerRosterProps {
  /** Instance id; the component is a no-op when `null`. */
  instanceId: string | null;
  /** Optional override for the current user id. */
  currentUserId?: string | null;
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/[\s_-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Merge the REST roster with the realtime roster mirror. REST wins
 * on conflict (it is the canonical source); the realtime mirror
 * fills in any player the REST list is missing between pages.
 */
function mergeRosters(
  rest: readonly InstancePlayer[],
  realtime: Record<string, InstancePlayer> | null,
): InstancePlayer[] {
  if (realtime === null) return rest.slice();

  const merged: InstancePlayer[] = rest.slice();
  const seenIds = new Set(rest.map((p) => p.id));
  for (const player of Object.values(realtime)) {
    if (seenIds.has(player.id)) continue;
    merged.push(player);
    seenIds.add(player.id);
  }
  return merged;
}

/**
 * Whether the merged roster should be displayed as empty.
 *
 * The closed state takes precedence — once the instance is closed or
 * finished the empty state is never shown.
 */
function shouldShowClosed(status: InstanceStatus | null): boolean {
  return status === "closed" || status === "finished";
}

// ─── Component ────────────────────────────────────────────────────────────

export function PlayerRoster({
  instanceId,
  currentUserId = null,
  className,
}: PlayerRosterProps) {
  // Mount the realtime bridge so the store mirror is kept up-to-date.
  // The hook is idempotent and a no-op when `instanceId === null`.
  useInstanceRealtimeBridge(instanceId);

  const { instance, isLoading: isInstanceLoading, error: instanceError, refresh: refreshInstance, isStale: instanceStale } =
    useInstance(instanceId, currentUserId);
  const hostUserId = instance?.hostUserId ?? null;
  const status: InstanceStatus | null = instance?.status ?? null;

  const {
    items: restPlayers,
    isLoading: isPlayersLoading,
    error: playersError,
    refresh: refreshPlayers,
  } = useInstancePlayers(instanceId, { hostUserId, currentUserId });

  const realtimePlayers = useInstanceRealtimeStore((state) =>
    instanceId === null
      ? null
      : selectInstanceRealtimePlayers(state, instanceId),
  );

  const merged = useMemo(
    () => mergeRosters(restPlayers, realtimePlayers),
    [restPlayers, realtimePlayers],
  );

  // ─── Closed state ─────────────────────────────────────────────────────

  if (shouldShowClosed(status)) {
    return (
      <div
        className={cn("space-y-4", className)}
        data-testid="player-roster"
      >
        <h2 className="text-lg font-semibold">Players</h2>
        <InstanceClosedState status={status ?? undefined} closedAt={null} />
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────────────────

  if (playersError !== null) {
    return (
      <div
        className={cn("space-y-4", className)}
        data-testid="player-roster"
      >
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
      <div
        className={cn("space-y-4", className)}
        data-testid="player-roster"
      >
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

  // ─── Loading state ────────────────────────────────────────────────────

  const isLoading = isInstanceLoading || isPlayersLoading;
  if (isLoading) {
    return (
      <div
        className={cn("space-y-4", className)}
        data-testid="player-roster"
      >
        <h2 className="text-lg font-semibold">Players</h2>
        <InstanceLobbySkeleton />
      </div>
    );
  }

  // ─── Empty state ──────────────────────────────────────────────────────

  if (merged.length === 0) {
    return (
      <div
        className={cn("space-y-4", className)}
        data-testid="player-roster"
      >
        <h2 className="text-lg font-semibold">Players</h2>
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

  // ─── Rendered roster ──────────────────────────────────────────────────

  return (
    <div className={cn("space-y-4", className)} data-testid="player-roster">
      <h2 className="text-lg font-semibold">Players</h2>

      {instanceStale && (
        <InstanceStaleState
          onRetry={() => {
            void refreshInstance();
          }}
        />
      )}

      <ul
        className="space-y-2"
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
                : player.displayName ?? player.username ?? "Player"
            }
            className="flex items-center gap-3 p-3 rounded-lg border"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback>
                {getInitials(player.displayName ?? player.username ?? "?")}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {player.displayName ?? player.username ?? "Unknown player"}
              </p>
              <p className="text-xs text-muted-foreground">
                {player.isCurrentUser ? "You" : "Player"}
              </p>
            </div>

            {player.isHost && (
              <span
                className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
                aria-label="Host"
              >
                <Crown className="h-3.5 w-3.5" aria-hidden />
                Host
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
