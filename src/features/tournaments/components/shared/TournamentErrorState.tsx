"use client";

/**
 * `TournamentErrorState` — error-state block for tournament surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.C1.
 *
 * Uses `getUserCopy` from Epic 5.1 for user-facing copy.
 * Falls back to generic copy for unknown error codes.
 */

import { AlertTriangle } from "lucide-react";

import { ErrorState } from "@/components/ui/loading-states/ErrorState";
import { getUserCopy } from "@/lib/api/error-codes";
import type { ApiError } from "@/lib/api/core/ApiError";

interface TournamentErrorStateProps {
  error: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

export function TournamentErrorState({
  error,
  onRetry,
  className,
}: TournamentErrorStateProps) {
  const copy = error ? getUserCopy(error.code) : null;

  const title = copy?.title ?? "Something went wrong";
  const message = copy?.body ?? "An unexpected error occurred. Please try again.";

  return (
    <ErrorState
      title={title}
      message={message}
      onRetry={onRetry}
      variant={error?.status === 404 ? "notFound" : error?.status === 0 ? "network" : "server"}
      showIcon={true}
      className={className}
    />
  );
}
