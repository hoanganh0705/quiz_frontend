

import { type ReactElement } from "react";

import type { SocialFeedItemDto } from "@/features/social/types/relationship";

export interface FeedItemFollowReceivedProps {
readonly item: SocialFeedItemDto;
readonly viewerUserId: string;
}

export function FeedItemFollowReceived({
item,
viewerUserId,
}: FeedItemFollowReceivedProps): ReactElement {
void viewerUserId;
void item;
return (
<div
data-testid="feed-item-follow_received"
data-actor-id={item.actorUser.userId}
    >
<p className="text-sm">
<span className="font-medium">{item.actorUser.userName}</span>{" "}
started following you.
      </p>
</div>
  );
}