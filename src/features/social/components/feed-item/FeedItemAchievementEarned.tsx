

import { type ReactElement } from "react";

import type { SocialFeedItemDto } from "@/features/social/types/relationship";

export interface FeedItemAchievementEarnedProps {
readonly item: SocialFeedItemDto;
readonly viewerUserId: string;
}

export function FeedItemAchievementEarned({
item,
viewerUserId,
}: FeedItemAchievementEarnedProps): ReactElement {
void viewerUserId;
void item;
return (
<div
data-testid="feed-item-achievement_earned"
data-actor-id={item.actorUser.userId}
    >
<p className="text-sm">
<span className="font-medium">{item.actorUser.userName}</span>{" "}
unlocked an achievement.
      </p>
</div>
  );
}