"use client";

/**
 * `BlockErrorBanner` — Inline error banner for block/unblock mutations.
 *
 * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional Side
 *                Effects.
 * Source story:  Story 6.7.
 * Source ticket: TKT-6.7.E1.
 *
 * ## Purpose
 *
 * Renders a compact error message below the `BlockButton` (or inline
 * on the `BlockedUsersListPage`) when a block or unblock mutation
 * fails. Shows code-specific copy from the `block-error-copy.ts`
 * registry and offers a retry button for transient errors (rate
 * limit, network, 5xx).
 *
 * ## Props
 *
 *   - `error: BlockErrorCode | null` — the error code to display.
 *     Pass `null` to render nothing.
 *   - `onRetry?: () => void` — called when the user clicks the retry
 *     button. Only offered for retryable errors.
 *
 * ## Architecture note
 *
 * The banner does NOT call any hooks or services directly. It is a
 * pure presentation component that reads from its props. This makes
 * it easy to test in isolation and easy to reason about — mirroring
 * `FollowErrorBanner` (TKT-6.6.E4).
 *
 * The non-idempotent `SOCIAL_USER_NOT_BLOCKED` (the unblock 404) is
 * handled by `useUnblock` itself (it maps to `error: null` +
 * `alreadyNotBlocking: true`); the banner therefore never sees this
 * code, but the registry still includes it for defensive coverage.
 */

import { AlertCircle, RefreshCw } from "lucide-react";

import {
  getBlockErrorMessage,
  isBlockErrorRetryable,
  type BlockErrorCode,
} from "@/features/social/components/block-error-copy";

export interface BlockErrorBannerProps {
  /**
   * The error code returned by `useBlock` or `useUnblock`.
   * Pass `null` to render nothing.
   */
  error: BlockErrorCode | null;
  /**
   * Called when the user clicks the retry button.
   * Only offered when the error is retryable.
   */
  onRetry?: () => void;
}

/**
 * Inline error banner for social block/unblock mutations.
 *
 * @example
 *   <BlockErrorBanner
 *     error={blockError}
 *     onRetry={() => block(targetUserId)}
 *   />
 */
export function BlockErrorBanner({
  error,
  onRetry,
}: BlockErrorBannerProps) {
  if (error === null) {
    return null;
  }

  const message = getBlockErrorMessage(error);
  const retryable = isBlockErrorRetryable(error);

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