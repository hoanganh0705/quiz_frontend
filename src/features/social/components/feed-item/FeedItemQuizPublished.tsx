

import { type ReactElement } from "react";

import type { SocialFeedItemDto } from "@/features/social/types/relationship";

export interface FeedItemQuizPublishedProps {
readonly item: SocialFeedItemDto;
readonly viewerUserId: string;
}

export function FeedItemQuizPublished({
item,
viewerUserId,
}: FeedItemQuizPublishedProps): ReactElement {
void viewerUserId;
void item;
return (
<div
data-testid="feed-item-quiz_published"
data-actor-id={item.actorUser.userId}
    >
<p className="text-sm">
<span className="font-medium">{item.actorUser.userName}</span>{" "}
published a quiz.
      </p>
</div>
  );
}