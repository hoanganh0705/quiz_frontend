/**
 * `FeedItemInstanceCompleted` — Sub-renderer for the
 * `instance_completed` feed-item type.
 */

import { type ReactElement } from "react";

import type {
  SocialFeedItemDto,
  SocialFeedItemPayload,
  SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemInstanceCompletedProps {
  readonly item: SocialFeedItemDto;
  readonly viewerUserId: string;
}

export function FeedItemInstanceCompleted({
  item,
  viewerUserId,
}: FeedItemInstanceCompletedProps): ReactElement {
  void viewerUserId;
  const payload = item.payload as Extract<
    SocialFeedItemPayload,
    { type: "instance_completed" }
  >;
  const actor: SocialUserSummaryDto = item.actorUser;
  return (
    <div
      data-testid="feed-item-instance_completed"
      data-instance-id={payload.instanceId}
      data-quiz-slug={payload.quizSlug}
      data-placement={payload.placement}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span> completed a
        multiplayer instance, placed #{payload.placement}.
      </p>
    </div>
  );
}