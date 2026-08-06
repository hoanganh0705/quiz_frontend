"use client";

/**
 * `FriendRequestErrorBanner` — Inline error banner for friend-request
 * mutations.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.E10.
 *
 * ## Purpose
 *
 * Renders a compact error message below a friend-request CTA / dialog
 * when a send / respond / cancel / unfriend mutation fails. Shows
 * code-specific copy from the `friend-request-error-copy.ts`
 * registry and offers an action button for transient errors.
 *
 * ## Props
 *
 *   - `error` — the error code, or `null` to render nothing.
 *   - `onAction?` — called when the user clicks the action button.
 *                   Only offered when the registry entry has an
 *                   `actionLabel`.
 *
 * ## `Role` accessibility
 *
 * The banner is `role="alert"` with `aria-live="polite"` so screen
 * readers announce the error after a brief politeness delay.
 */

import { AlertCircle, RefreshCw } from "lucide-react";

import {
  getFriendRequestErrorCopy,
  isFriendRequestErrorRetryable,
  type FriendRequestErrorCopy,
} from "@/features/social/components/friend-request-error-copy";

export interface FriendRequestErrorBannerProps {
  /**
   * The error code returned by `useSendFriendRequest`,
   * `useRespondFriendRequest`, `useCancelFriendRequest`, or
   * `useUnfriend`. Pass `null` to render nothing.
   */
  readonly error: string | null;
  /**
   * Called when the user clicks the action button. Only offered
   * when the registry entry has an `actionLabel`.
   */
  readonly onAction?: () => void;
}

/**
 * Inline error banner for friend-request mutations.
 *
 * @example
 *   <FriendRequestErrorBanner
 *     error={sendError}
 *     onAction={() => send()}
 *   />
 */
export function FriendRequestErrorBanner({
  error,
  onAction,
}: FriendRequestErrorBannerProps) {
  if (error === null) {
    return null;
  }

  const copy: FriendRequestErrorCopy = getFriendRequestErrorCopy(error);
  const retryable = isFriendRequestErrorRetryable(error);

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid={copy.dataTestid}
      data-error-code={error}
      className="mt-2 flex items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm"
    >
      <span className="flex flex-col text-destructive">
        <span className="flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {copy.title}
        </span>
        <span className="ml-6 text-destructive/90">{copy.description}</span>
      </span>

      {retryable && copy.actionLabel !== null && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="shrink-0 rounded border border-destructive/40 bg-background px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={copy.actionLabel}
        >
          <RefreshCw className="mr-1 inline-block h-3 w-3" aria-hidden="true" />
          {copy.actionLabel}
        </button>
      )}
    </div>
  );
}
