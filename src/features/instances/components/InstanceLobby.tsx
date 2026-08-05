"use client";

/**
 * `InstanceLobby` — composition of the instance lobby layout.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.D5.
 *
 * ## Purpose
 *
 * Compose `PlayerRoster`, `InstanceStatusBanner`, `JoinLeaveCta`, and
 * `HostControls` into the lobby layout. Render the `ConnectionBanner`
 * derived from `useInstanceSocket`. The layout is deterministic so
 * the lobby does not shift as state changes.
 *
 * ## Layout (top to bottom)
 *
 * 1. Status banner (server-driven status).
 * 2. Connection banner (socket status — hidden when connected/idle).
 * 3. Player roster (REST + realtime).
 * 4. CTAs:
 *    - `JoinLeaveCta` for non-host players.
 *    - `HostControls` for hosts.
 *
 * ## Terminal states
 *
 * When the resolved status is `'closed'` or `'finished'`, the roster
 * itself renders the `InstanceClosedState` and the CTAs render
 * nothing — the lobby preserves that layout rather than replacing it
 * with an inline empty state.
 */

import { useMemo } from "react";

import { cn } from "@/shared/utils/merge-class-names";

import { useInstance } from "@/features/instances/hooks/useInstance";
import { useInstanceSocket } from "@/features/instances/hooks/useInstanceSocket";
import type { InstanceStatus } from "@/features/instances/types/instance.types";

import { ConnectionBanner } from "./ConnectionBanner";
import { HostControls } from "./HostControls";
import { InstanceStatusBanner } from "./InstanceStatusBanner";
import { JoinLeaveCta } from "./JoinLeaveCta";
import { PlayerRoster } from "./PlayerRoster";

export interface InstanceLobbyProps {
  /** Instance id; the component renders nothing when `null`. */
  instanceId: string | null;
  /** Optional override for the current user id. */
  currentUserId?: string | null;
  className?: string;
}

export function InstanceLobby({
  instanceId,
  currentUserId = null,
  className,
}: InstanceLobbyProps) {
  // Mount the socket (idempotent join). When the lobby is unmounted
  // the bridge resets the realtime entry.
  useInstanceSocket(instanceId);

  const { instance } = useInstance(instanceId, currentUserId);
  const status: InstanceStatus | null = instance?.status ?? null;

  const isClosed = useMemo(
    () => status === "closed" || status === "finished",
    [status],
  );

  return (
    <div
      className={cn("space-y-6", className)}
      data-testid="instance-lobby"
      role="region"
      aria-label="Instance lobby"
    >
      <InstanceStatusBanner
        instanceId={instanceId}
        currentUserId={currentUserId}
      />

      <ConnectionBanner instanceId={instanceId} />

      <PlayerRoster
        instanceId={instanceId}
        currentUserId={currentUserId}
      />

      {!isClosed && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex-1 min-w-0">
            <JoinLeaveCta
              instanceId={instanceId}
              currentUserId={currentUserId}
            />
          </div>
          <div className="flex-1 min-w-0">
            <HostControls
              instanceId={instanceId}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      )}
    </div>
  );
}