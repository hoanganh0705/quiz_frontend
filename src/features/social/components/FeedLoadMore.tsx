"use client";

/**
 * `FeedLoadMore` — Load-more affordance for the Story 6.9 global
 * feed.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.F6.
 *
 * ## What this component owns
 *
 * The load-more affordance that renders below the feed. The
 * component:
 *
 *   - Renders a "Load more" button when
 *     `hasMore === true && isLoadingMore === false && rateLimitedUntil === null`.
 *   - Renders a disabled "Loading..." button with the pending
 *     indicator when `isLoadingMore === true`.
 *   - Renders a disabled "Try again in N seconds" button with a
 *     countdown when `rateLimitedUntil !== null`.
 *   - Renders `null` when `hasMore === false`.
 *
 * ## Why a dedicated component
 *
 * The load-more affordance is the user-facing pagination surface
 * for the feed. The default visible label and the rate-limit
 * countdown are stable identifiers across the feed surface; a
 * dedicated component lets the page shell compose them without
 * inline state-management.
 *
 * ## Why a Client Component
 *
 * The countdown uses `setTimeout` and `useEffect` to drive the
 * "try again in N seconds" copy. The component is otherwise
 * presentational.
 *
 * ## SSR-safety
 *
 * The component uses `useEffect` (which never runs on the server)
 * so the initial render is identical on server and client. The
 * countdown updates only after mount.
 */

import { useEffect, useState, type ReactElement } from "react";

import { FollowPendingIndicator } from "@/features/social/components/FollowPendingIndicator";

export interface FeedLoadMoreProps {
  /** Whether the feed has more items to load. When `false`, the
   *  component renders `null`. */
  readonly hasMore: boolean;
  /** Whether the feed is currently loading the next page. Drives
   *  the disabled "Loading..." branch. */
  readonly isLoadingMore: boolean;
  /** Callback invoked when the user clicks the "Load more" button. */
  readonly onLoadMore: () => void;
  /** The Unix timestamp (ms) at which the rate-limit cooldown
   *  expires. When non-null, the component renders a disabled
   *  "Try again in N seconds" button with a countdown. */
  readonly rateLimitedUntil: number | null;
}

/**
 * Format a millisecond offset as a human-readable countdown
 * string. The output is clamped to `0` so the countdown never
 * displays a negative value.
 */
function formatSecondsRemaining(targetMs: number): number {
  const remainingMs = Math.max(0, targetMs - Date.now());
  return Math.ceil(remainingMs / 1000);
}

export function FeedLoadMore({
  hasMore,
  isLoadingMore,
  onLoadMore,
  rateLimitedUntil,
}: FeedLoadMoreProps): ReactElement | null {
  const initialSecondsRemaining =
    rateLimitedUntil !== null ? formatSecondsRemaining(rateLimitedUntil) : 0;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(
    initialSecondsRemaining,
  );

  useEffect(() => {
    if (rateLimitedUntil === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSecondsRemaining(0);
      return;
    }
    setSecondsRemaining(formatSecondsRemaining(rateLimitedUntil));
    const timer = setInterval(() => {
      const next = formatSecondsRemaining(rateLimitedUntil);
      setSecondsRemaining(next);
      if (next <= 0) {
        clearInterval(timer);
      }
    }, 1_000);
    return () => clearInterval(timer);
  }, [rateLimitedUntil]);

  if (!hasMore) return null;

  // Rate-limit branch.
  if (rateLimitedUntil !== null) {
    if (secondsRemaining > 0) {
      return (
        <div
          data-testid="feed-load-more"
          data-load-more-branch="rate-limited"
          data-seconds-remaining={secondsRemaining}
          className="flex justify-center p-4"
        >
          <button
            type="button"
            disabled={true}
            aria-label={`Try again in ${secondsRemaining} seconds`}
            data-testid="feed-load-more-button-rate-limited"
            className="rounded-md border border-border bg-background px-3 py-1 text-sm disabled:pointer-events-none disabled:opacity-50"
          >
            Try again in {secondsRemaining} second
            {secondsRemaining === 1 ? "" : "s"}
          </button>
        </div>
      );
    }
  }

  // Loading branch.
  if (isLoadingMore) {
    return (
      <div
        data-testid="feed-load-more"
        data-load-more-branch="loading"
        className="flex justify-center p-4"
      >
        <button
          type="button"
          disabled={true}
          aria-label="Loading more"
          data-testid="feed-load-more-button-loading"
          className="rounded-md border border-border bg-background px-3 py-1 text-sm disabled:pointer-events-none disabled:opacity-50 inline-flex items-center gap-2"
        >
          <FollowPendingIndicator text="Loading..." size="sm" />
        </button>
      </div>
    );
  }

  // Default (enabled) branch.
  return (
    <div
      data-testid="feed-load-more"
      data-load-more-branch="enabled"
      className="flex justify-center p-4"
    >
      <button
        type="button"
        onClick={onLoadMore}
        aria-label="Load more"
        data-testid="feed-load-more-button"
        className="rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Load more
      </button>
    </div>
  );
}