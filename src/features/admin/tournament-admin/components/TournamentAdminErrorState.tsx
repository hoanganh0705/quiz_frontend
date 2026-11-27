"use client";

import type React from "react";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";
import type { ApiError } from "@/lib/api/core/ApiError";

export interface TournamentAdminErrorStateProps {
  error: ApiError;

  onRetry: () => void;
}

export function TournamentAdminErrorState({
  error,
  onRetry,
}: TournamentAdminErrorStateProps): React.ReactElement {
  return (
    <div
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
      data-testid="tournament-admin-error-state"
      role="alert"
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>

      <p
        className="mb-1 text-sm font-medium text-foreground"
        data-testid="tournament-admin-error-state-title"
      >
        Failed to load tournaments
      </p>

      <p
        className="mb-4 font-mono text-xs text-muted-foreground"
        data-testid="tournament-admin-error-state-code"
      >
        {error.code}
      </p>

      {error.requestId.length > 0 ? (
        <div className="mb-4 w-full max-w-sm">
          <RequestIdBanner error={error} />
        </div>
      ) : null}

      <Button
        type="button"
        variant="default"
        className="h-10 sm:h-9"
        onClick={onRetry}
        data-testid="tournament-admin-error-state-retry"
      >
        Try again
      </Button>
    </div>
  );
}
