"use client";

/**
 * `ReconnectDuringGameNotice` — notice rendered while reconnect reconciliation is in flight.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.E5.
 *
 * Renders when `useReconnectReconciliation.isReconciling === true`. The notice
 * is dismissed only when the store finishes reconciliation. Purely presentational;
 * it never triggers or controls the reconciliation process.
 */

import { Wifi } from "lucide-react";

import { cn } from "@/shared/utils/merge-class-names";

import { useReconnectReconciliation } from "@/features/instances/play/hooks";

interface ReconnectDuringGameNoticeProps {
  instanceId: string;
  className?: string;
}

export function ReconnectDuringGameNotice({
  instanceId,
  className,
}: ReconnectDuringGameNoticeProps) {
  const { isReconciling } = useReconnectReconciliation(instanceId);

  if (!isReconciling) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg",
        "bg-amber-50 dark:bg-amber-950/30",
        "border border-amber-200 dark:border-amber-800",
        "text-amber-800 dark:text-amber-200",
        className,
      )}
      role="status"
      aria-live="polite"
      data-testid="reconnect-during-game-notice"
    >
      <Wifi className="h-4 w-4 shrink-0 animate-pulse" aria-hidden="true" />
      <p className="flex-1 text-sm font-medium">
        Reconnecting to the game…
      </p>
    </div>
  );
}
