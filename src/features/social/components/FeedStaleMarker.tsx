/**
 * `FeedStaleMarker` — Subtle revalidation indicator for the
 * Story 6.9 global feed.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.F4.
 *
 * ## What this component owns
 *
 * The subtle revalidation indicator primitive that renders while
 * SWR is revalidating in the background. The component:
 *
 *   - Renders a small badge ("Updating...") at the top of the feed
 *     when `isStale === true`.
 *   - Does NOT render an aggressive spinner (the story is read-
 *     only rendering; the marker is intentionally subtle).
 *   - Sets `aria-live="polite"` so screen readers announce the
 *     revalidation.
 *   - Is a presentational component (no hooks, server-renderable).
 *
 * ## Why a standalone component
 *
 * The `ConsistencyNotice` (Epic 6.3 / TKT-6.3.C1) covers the
 * "consistency violation" surface (the cached data is older than
 * the cache TTL). The feed's stale marker is a separate, smaller
 * surface for the read-only "background is updating" indication.
 * Keeping the two surfaces separate means each can be tested in
 * isolation and the page shell can compose them independently.
 *
 * ## SSR-safety
 *
 * The component renders identical markup on the server and the
 * client. The `isStale` prop is a static value.
 */

import { type ReactElement } from "react";

export interface FeedStaleMarkerProps {
  /** Whether the feed is currently being revalidated in the background. */
  readonly isStale: boolean;
}

const STALE_COPY = {
  text: "Updating...",
  ariaLabel: "Feed is updating",
} as const;

/**
 * Subtle revalidation indicator. Renders `null` when `isStale` is
 * false; renders the small "Updating..." badge with
 * `aria-live="polite"` and an animated pulse when `isStale` is
 * true.
 */
export function FeedStaleMarker({
  isStale,
}: FeedStaleMarkerProps): ReactElement | null {
  if (!isStale) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={STALE_COPY.ariaLabel}
      data-testid="feed-stale-marker"
      className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"
    >
      <span
        aria-hidden="true"
        data-testid="feed-stale-marker-pulse"
        className="inline-block size-2 rounded-full bg-muted-foreground animate-pulse"
      />
      <span>{STALE_COPY.text}</span>
    </div>
  );
}