/**
 * `FeedItemAttemptCompleted` — Sub-renderer for the phase-plan-only
 * `attempt_completed` feed-item type.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.E2.
 *
 * ## Note
 *
 * The `attempt_completed` discriminator is documented in the Epic 6.9
 * phase plan as a future feed-item type but does NOT currently
 * appear in the SDK's `SocialFeedItemType` union. The sub-renderer
 * is exported for plan-completeness but the dispatcher
 * (`FeedItemRenderer`, TKT-6.9.E1) does not include a
 * `case "attempt_completed"` arm today.
 *
 * When the backend adds `attempt_completed` to the SDK, follow the
 * same migration steps as `FeedItemQuizPublished`.
 */

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