

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