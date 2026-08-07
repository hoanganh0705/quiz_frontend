/**
 * `FeedItemAchievementEarned` — Sub-renderer for the phase-plan-only
 * `achievement_earned` feed-item type.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.E2.
 *
 * ## Note
 *
 * The `achievement_earned` discriminator is documented in the
 * Epic 6.9 phase plan as a future feed-item type but does NOT
 * currently appear in the SDK's `SocialFeedItemType` union. The
 * sub-renderer is exported for plan-completeness but the dispatcher
 * does not include a `case "achievement_earned"` arm today.
 *
 * When the backend adds `achievement_earned` to the SDK, follow the
 * same migration steps as `FeedItemQuizPublished`.
 */

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