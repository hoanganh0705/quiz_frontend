"use client";

/**
 * `InstanceErrorState` — typed error-state block for instance surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.C1.
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

interface InstanceErrorStateProps {
  error: ApiError | null;
  onRetry?: () => void;
  className?: string;
}

export function InstanceErrorState({
  error,
  onRetry,
  className,
}: InstanceErrorStateProps) {
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
    <div className={className} data-testid="instance-error-state">
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