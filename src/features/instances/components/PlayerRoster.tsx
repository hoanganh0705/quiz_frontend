"use client";

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

function shouldShowClosed(status: InstanceStatus | null): boolean {
return status === "closed" || status === "finished";
}

export function PlayerRoster({
instanceId,
currentUserId = null,
className,
}: PlayerRosterProps) {

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
