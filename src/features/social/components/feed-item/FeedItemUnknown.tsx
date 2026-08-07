/**
 * `FeedItemUnknown` — Defensive fallback for unknown feed-item
 * type discriminators.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.E2.
 *
 * ## Purpose
 *
 * Renders the documented generic message ("Recent activity") when
 * the `FeedItemRenderer` dispatcher (TKT-6.9.E1) receives an
 * unknown item type. The fallback:
 *
 *   - Never throws for any unknown discriminator.
 *   - Emits a `phase6:6.9` Sentry breadcrumb with
 *     `reason: 'unknown_discriminator'` so the Sentry dashboard
 *     surfaces drift in production.
 *   - Uses the documented `data-testid="feed-item-unknown"` marker.
 *   - Carries the discriminator value (truncated) and the item id
 *     on the breadcrumb payload so the team can identify the
 *     offending backend response.
 *
 * ## Why a fallback (not a throw)
 *
 * The feed endpoint is heterogeneous and the backend may add new
 * item types at any release. The dispatcher must remain backward
 * compatible — surfacing the unknown item as a generic "Recent
 * activity" row preserves the row's vertical rhythm and keeps the
 * user informed that the feed is loading items they just can't
 * classify.
 *
 * ## Why a Client Component
 *
 * The Sentry breadcrumb helper is a client primitive (it imports
 * `@sentry/nextjs`). The breadcrumb emission is the only client
 * side-effect; the rest of the markup is server-renderable.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other
 * browser-only API at render time. The Sentry breadcrumb emission
 * is a no-op when the Sentry runtime is not initialised (the
 * server-side render).
 */

import { type ReactElement } from "react";

import { FEED_DEFENSIVE_FALLBACK_TESTID } from "@/features/social/feed-discriminator";
import type { SocialFeedItemDto } from "@/features/social/types/relationship";

import { addFeedBreadcrumb } from "@/lib/social/phase6_sentry";

export interface FeedItemUnknownProps {
  /** The item whose discriminator was not recognised. The
   *  defensive fallback reads `item.id` for the `data-item-id`
   *  attribute. */
  readonly item: SocialFeedItemDto;
  /** The raw `type` discriminator value as returned by the backend
   *  (used for the breadcrumb payload, not the DOM). */
  readonly rawType: string;
}

/**
 * Render the defensive fallback for an unknown feed-item
 * discriminator. Emits a `phase6:6.9` Sentry breadcrumb so the
 * Sentry dashboard can surface drift in production.
 */
export function FeedItemUnknown({
  item,
  rawType,
}: FeedItemUnknownProps): ReactElement {
  const discriminator =
    rawType.length > 0 && rawType.length <= 64 ? rawType : undefined;

  addFeedBreadcrumb({
    route: "feed.item.unknown",
    reason: "unknown_discriminator",
    ...(discriminator !== undefined ? { discriminator } : {}),
  });

  return (
    <div
      data-testid={FEED_DEFENSIVE_FALLBACK_TESTID}
      data-item-id={item.id}
      role="status"
      className="p-3 rounded-md border border-dashed border-border text-sm text-muted-foreground"
    >
      Recent activity
    </div>
  );
}