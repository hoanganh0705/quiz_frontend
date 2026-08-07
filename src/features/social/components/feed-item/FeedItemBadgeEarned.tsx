/**
 * `FeedItemBadgeEarned` — Sub-renderer for the `badge_earned`
 * feed-item type.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.E2.
 *
 * Renders the documented copy for a feed item where the actor
 * earned a badge. The component is presentational and accepts the
 * canonical `SocialFeedItemDto` projection; it does NOT mutate
 * the item and does NOT fetch additional data.
 */

import { type ReactElement } from "react";

import type {
  SocialFeedItemDto,
  SocialFeedItemPayload,
  SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemBadgeEarnedProps {
  readonly item: SocialFeedItemDto;
  readonly viewerUserId: string;
}

export function FeedItemBadgeEarned({
  item,
  viewerUserId,
}: FeedItemBadgeEarnedProps): ReactElement {
  void viewerUserId;
  const payload = item.payload as Extract<
    SocialFeedItemPayload,
    { type: "badge_earned" }
  >;
  const actor: SocialUserSummaryDto = item.actorUser;
  return (
    <div
      data-testid="feed-item-badge_earned"
      data-badge-id={payload.badgeId}
      data-badge-slug={payload.badgeSlug}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span>{" "}
        earned the <span className="font-medium">{payload.badgeSlug}</span> badge.
      </p>
    </div>
  );
}