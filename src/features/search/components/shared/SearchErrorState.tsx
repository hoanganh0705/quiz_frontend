"use client";

/**
 * `SearchErrorState.tsx` — error-state block for search surfaces.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.C1.
 *
 * Renders a typed error fallback that always reads copy from the
 * Epic 5.1 `getUserCopy` table (`ErrorCode.title` and `ErrorCode.body`),
 * never raw HTTP status codes or backend `message`. The variant is chosen
 * from the `ApiError.status` field (network / server / notFound / default).
 *
 * For `SEARCH_RATE_LIMITED`, prefer `SearchRateLimitState` instead.
 *
 * No service, hook, or socket client is imported by this primitive.
 */

import { AlertTriangle } from "lucide-react";

import { ErrorState } from "@/components/ui/loading-states/ErrorState";
import { getUserCopy } from "@/lib/api/error-codes";
import type { ApiError } from "@/lib/api/core/ApiError";
import type { SearchErrorCode } from "@/features/search/types";

interface SearchErrorStateProps {
  /** The current error, if any. Pass `null` to render nothing. */
  error: ApiError | null;
  /** Optional retry callback. */
  onRetry?: () => void;
  className?: string;
}

export function SearchErrorState({
  error,
  onRetry,
  className,
}: SearchErrorStateProps) {
  const copy = error ? getUserCopy(error.code) : null;

  const title = copy?.title ?? "Something went wrong";
  const message =
    copy?.body ?? "An unexpected error occurred. Please try again.";

  // Map the canonical error status to the `ErrorState` variant so the
  // icon stays consistent with the failure type.
  const variant: "network" | "server" | "notFound" | "default" =
    error?.status === 0
      ? "network"
      : error?.status === 404
        ? "notFound"
        : error && error.status >= 500
          ? "server"
          : "default";

  return (
    <div className={className} data-testid="search-error-state">
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

// Re-export `SearchErrorCode` for convenience in tests.
export type { SearchErrorCode };
