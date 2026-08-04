"use client";

/**
 * `NotificationErrorState.tsx` — error-state block for notification surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.C1.
 *
 * Renders a typed error fallback that always reads copy from the
 * Epic 5.1 `getUserCopy` table (`ErrorCode.title` and `ErrorCode.body`),
 * never raw HTTP status codes. The variant is chosen from the
 * `ApiError.status` field (network / server / notFound / default) so
 * the icon and copy map to the failure type.
 *
 * The optional `onRetry` action re-invokes the underlying hook (the
 * caller passes its own `refresh` action).
 *
 * No service, hook, or socket client is imported by this primitive.
 */

import { AlertTriangle } from "lucide-react";

import { ErrorState } from "@/components/ui/loading-states/ErrorState";
import { getUserCopy } from "@/lib/api/error-codes";
import type { ApiError } from "@/lib/api/core/ApiError";

interface NotificationErrorStateProps {
  error: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

export function NotificationErrorState({
  error,
  onRetry,
  className,
}: NotificationErrorStateProps) {
  const copy = error ? getUserCopy(error.code) : null;

  const title = copy?.title ?? "Something went wrong";
  const message =
    copy?.body ?? "An unexpected error occurred. Please try again.";

  // Map the canonical error code (when present) or the status to the
  // `ErrorState` variant so the icon stays consistent.
  const variant: "network" | "server" | "notFound" | "default" =
    error?.status === 0
      ? "network"
      : error?.status === 404
        ? "notFound"
        : error && error.status >= 500
          ? "server"
          : "default";

  return (
    <div
      className={className}
      data-testid="notification-error-state"
    >
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

// Re-export for tests / debugging — consumers can check the chosen title
// and message without re-querying `getUserCopy`.
export const NOTIFICATION_ERROR_ICON = AlertTriangle;
