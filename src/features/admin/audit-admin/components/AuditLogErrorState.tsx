"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

import { ApiError } from "@/lib/api/core/ApiError";
import { getUserCopy } from "@/lib/api/error-codes";

import { RequestIdBanner } from "@/features/admin/components/RequestIdBanner";

export interface AuditLogErrorStateProps {
  error: ApiError | null;

  onRetry?: () => void;
}

export function AuditLogErrorState({
  error,
  onRetry,
}: AuditLogErrorStateProps) {
  if (error === null) return null;

  const copy = getUserCopy(error.code);

  return (
    <div
      className="space-y-3"
      data-testid="audit-log-error-state"
      data-error-code={error.code}
    >
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-destructive/40 bg-destructive/5 py-10 px-6 text-center"
        role="alert"
        aria-live="polite"
      >
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </div>
        <p
          className="text-sm font-semibold text-foreground"
          data-testid="audit-log-error-state-title"
        >
          {copy.title}
        </p>
        <p
          className="mt-1 text-sm text-muted-foreground max-w-sm"
          data-testid="audit-log-error-state-body"
        >
          {copy.body}
        </p>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 text-xs h-8 px-3"
            onClick={onRetry}
            data-testid="audit-log-error-state-retry"
          >
            Try again
          </Button>
        )}
      </div>

      {/* Shared request-id banner. */}
      <RequestIdBanner error={error} />
    </div>
  );
}
