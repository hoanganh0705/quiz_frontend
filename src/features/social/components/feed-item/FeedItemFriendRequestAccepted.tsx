

import { type ReactElement } from "react";

import type { SocialFeedItemDto } from "@/features/social/types/relationship";

export interface FeedItemFriendRequestAcceptedProps {
readonly item: SocialFeedItemDto;
readonly viewerUserId: string;
}

export function FeedItemFriendRequestAccepted({
item,
viewerUserId,
}: FeedItemFriendRequestAcceptedProps): ReactElement {
void viewerUserId;
void item;
return (
<div
data-testid="feed-item-friend_request_accepted"
data-actor-id={item.actorUser.userId}
    >
<p className="text-sm">
<span className="font-medium">{item.actorUser.userName}</span>{" "}
accepted your friend request.
      </p>
</div>
  );
}