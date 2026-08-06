"use client";

/**
 * `GameErrorState` — typed error-state block for gameplay surfaces.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.D1.
 *
 * Always reads copy from `getUserCopy(error.code)` (Epic 5.1 D3) —
 * never from raw HTTP status. The `ErrorState` variant is selected
 * from `error.status` so the icon matches the failure type.
 *
 * Purely presentational: no service or socket client is imported.
 */

import { ApiError } from "@/lib/api";
import { getUserCopy } from "@/lib/api/error-codes";
import { ErrorState } from "@/components/ui/loading-states/ErrorState";

interface GameErrorStateProps {
  /** The typed error from the gameplay socket or REST hook. */
  error: ApiError | null;
  /** Optional retry CTA. */
  onRetry?: () => void;
  className?: string;
}

export function GameErrorState({
  error,
  onRetry,
  className,
}: GameErrorStateProps) {
  const copy = error !== null ? getUserCopy(error.code) : null;
  const title = copy?.title ?? "Something went wrong";
  const message =
    copy?.body ?? "An unexpected error occurred. Please try again.";

  const variant: "network" | "server" | "notFound" | "default" =
    error?.status === 0
      ? "network"
      : error?.status === 404
        ? "notFound"
        : error !== null && error.status >= 500
          ? "server"
          : "default";

  return (
    <div className={className} data-testid="game-error-state">
      <ErrorState
        title={title}
        message={message}
        onRetry={onRetry}
        variant={variant}
        showIcon={true}
      />
    </div>
  );
}
