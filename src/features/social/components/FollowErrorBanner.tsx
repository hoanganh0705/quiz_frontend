"use client";

/**
 * `FollowErrorBanner` — Inline error banner for follow/unfollow mutations.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.E4.
 *
 * ## Purpose
 *
 * Renders a compact error message below the `FollowButton` when a follow
 * or unfollow mutation fails. Shows code-specific copy from the
 * `follow-error-copy.ts` registry and offers a retry button for
 * transient errors (rate limit, network, 5xx).
 *
 * ## Props
 *
 *   - `error: FollowErrorCode | null` — the error code to display.
 *     Pass `null` to render nothing.
 *   - `onRetry?: () => void` — called when the user clicks the retry
 *     button. Only offered for retryable errors.
 *
 * ## Architecture note
 *
 * The banner does NOT call any hooks or services directly. It is a
 * pure presentation component that reads from its props. This makes it
 * easy to test in isolation and easy to reason about.
 */

import { AlertCircle, RefreshCw } from "lucide-react";

import {
  getFollowErrorMessage,
  isFollowErrorRetryable,
  type FollowErrorCode,
} from "@/features/social/components/follow-error-copy";

export interface FollowErrorBannerProps {
  /**
   * The error code returned by `useFollow` or `useUnfollow`.
   * Pass `null` to render nothing.
   */
  error: FollowErrorCode | null;
  /**
   * Called when the user clicks the retry button.
   * Only offered when the error is retryable.
   */
  onRetry?: () => void;
}

/**
 * Inline error banner for social follow/unfollow mutations.
 *
 * @example
 *   <FollowErrorBanner
 *     error={followError}
 *     onRetry={() => follow(targetUserId)}
 *   />
 */
export function FollowErrorBanner({
  error,
  onRetry,
}: FollowErrorBannerProps) {
  if (error === null) {
    return null;
  }

  const message = getFollowErrorMessage(error);
  const retryable = isFollowErrorRetryable(error);

  return (
    <div
      role="alert"
      aria-live="polite"
      className="mt-2 flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
    >
      {/* Icon + message */}
      <span className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        {message}
      </span>

      {/* Retry button — only for transient errors */}
      {retryable && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded border border-destructive/40 bg-background px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Retry"
        >
          <RefreshCw className="mr-1 inline-block h-3 w-3" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}
