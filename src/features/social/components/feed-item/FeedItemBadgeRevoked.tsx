

import { type ReactElement } from "react";

import type {
SocialFeedItemDto,
SocialFeedItemPayload,
SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemBadgeRevokedProps {
readonly item: SocialFeedItemDto;
readonly viewerUserId: string;
}

export function FeedItemBadgeRevoked({
item,
viewerUserId,
}: FeedItemBadgeRevokedProps): ReactElement {
void viewerUserId;
const payload = item.payload as Extract<
SocialFeedItemPayload,
{ type: "badge_revoked" }
  >;
const actor: SocialUserSummaryDto = item.actorUser;
return (
<div
data-testid="feed-item-badge_revoked"
data-badge-id={payload.badgeId}
data-badge-slug={payload.badgeSlug}
data-actor-id={actor.userId}
    >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span> had the{" "}
<span className="font-medium">{payload.badgeSlug}</span> badge revoked.
      </p>
</div>
  );
}