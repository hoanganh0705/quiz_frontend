/**
 * `FeedItemInstanceJoined` — Sub-renderer for the
 * `instance_joined` feed-item type.
 */

import { type ReactElement } from "react";

import type {
  SocialFeedItemDto,
  SocialFeedItemPayload,
  SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemInstanceJoinedProps {
  readonly item: SocialFeedItemDto;
  readonly viewerUserId: string;
}

export function FeedItemInstanceJoined({
  item,
  viewerUserId,
}: FeedItemInstanceJoinedProps): ReactElement {
  void viewerUserId;
  const payload = item.payload as Extract<
    SocialFeedItemPayload,
    { type: "instance_joined" }
  >;
  const actor: SocialUserSummaryDto = item.actorUser;
  return (
    <div
      data-testid="feed-item-instance_joined"
      data-instance-id={payload.instanceId}
      data-quiz-slug={payload.quizSlug}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span> joined a
        multiplayer instance.
      </p>
    </div>
  );
}