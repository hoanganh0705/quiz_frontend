"use client";

/**
 * `InstanceEmptyState` — empty-state block for instance lobby surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.C1.
 *
 * Renders when the player roster is empty (no players have joined the
 * lobby yet). Purely presentational; never starts a timer or advances
 * a lifecycle state.
 */

import { Users } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

interface InstanceEmptyStateProps {
  className?: string;
}

export function InstanceEmptyState({ className }: InstanceEmptyStateProps) {
  return (
    <EmptyState
      icon={Users}
      title="Waiting for players"
      description="No players have joined this instance yet. Share the link or invite your friends to start the game."
      size="md"
      className={className}
      data-testid="instance-empty-state"
    />
  );
}