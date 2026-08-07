/**
 * `FeedItemQuizPublished` — Sub-renderer for the phase-plan-only
 * `quiz_published` feed-item type.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.E2.
 *
 * ## Note
 *
 * The `quiz_published` discriminator is documented in the Epic 6.9
 * phase plan as a future feed-item type but does NOT currently
 * appear in the SDK's `SocialFeedItemType` union. The sub-renderer
 * is exported so the canonical file set under `feed-item/` matches
 * the plan, but the dispatcher (`FeedItemRenderer`, TKT-6.9.E1)
 * does NOT include a `case "quiz_published"` arm today — the
 * discriminator is not present in the closed union, so adding it
 * would be a TypeScript error.
 *
 * When the backend adds `quiz_published` to the SDK:
 *   1. Add the literal to `SocialFeedItemType` (in
 *      `features/social/types/relationship.ts`).
 *   2. Add the payload variant to `SocialFeedItemPayload`.
 *   3. Add a `case "quiz_published"` arm to the dispatcher.
 *   4. Update the `FeedItemType` alias in `feed-discriminator.ts`.
 */

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