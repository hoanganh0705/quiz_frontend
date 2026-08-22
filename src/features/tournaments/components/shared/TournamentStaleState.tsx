"use client";

import * as React from "react";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/shared/utils/merge-class-names";

import { STALE_STATE_TOKENS } from "@/features/tournaments/lib/tournament-tokens";

interface TournamentStaleStateProps {
  onRetry?: () => void;
  className?: string;
}

export function TournamentStaleState({
  onRetry,
  className,
}: TournamentStaleStateProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg",
        STALE_STATE_TOKENS.container,
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 text-sm">
        This data may be outdated. The latest information could not be loaded.
      </p>
      {onRetry && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRetry}
          aria-label="Refresh data"
          className={cn("gap-1.5", STALE_STATE_TOKENS.button)}
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      )}
    </div>
  );
}
