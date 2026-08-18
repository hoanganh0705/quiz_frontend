

import { type ReactElement } from "react";

import type {
SocialFeedItemDto,
SocialFeedItemPayload,
SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemRankMilestoneProps {
readonly item: SocialFeedItemDto;
readonly viewerUserId: string;
}

export function FeedItemRankMilestone({
item,
viewerUserId,
}: FeedItemRankMilestoneProps): ReactElement {
void viewerUserId;
const payload = item.payload as Extract<
SocialFeedItemPayload,
{ type: "rank_milestone" }
  >;
const actor: SocialUserSummaryDto = item.actorUser;
return (
<div
data-testid="feed-item-rank_milestone"
data-period={payload.period}
data-rank={payload.rank}
data-actor-id={actor.userId}
    >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span> reached rank #
        {payload.rank} ({payload.period.replace("_", " ")}).
      </p>
</div>
  );
}