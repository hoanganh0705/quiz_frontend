

import { type ReactElement } from "react";

import type { SocialFeedItemDto } from "@/features/social/types/relationship";

export interface FeedItemAttemptCompletedProps {
readonly item: SocialFeedItemDto;
readonly viewerUserId: string;
}

export function FeedItemAttemptCompleted({
item,
viewerUserId,
}: FeedItemAttemptCompletedProps): ReactElement {
void viewerUserId;
void item;
return (
<div
data-testid="feed-item-attempt_completed"
data-actor-id={item.actorUser.userId}
    >
<p className="text-sm">
<span className="font-medium">{item.actorUser.userName}</span>{" "}
completed a quiz attempt.
      </p>
</div>
  );
}