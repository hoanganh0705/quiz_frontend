/**
 * `FeedItemInstanceCreated` — Sub-renderer for the
 * `instance_created` feed-item type.
 */

import { type ReactElement } from "react";

import type {
  SocialFeedItemDto,
  SocialFeedItemPayload,
  SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemInstanceCreatedProps {
  readonly item: SocialFeedItemDto;
  readonly viewerUserId: string;
}

export function FeedItemInstanceCreated({
  item,
  viewerUserId,
}: FeedItemInstanceCreatedProps): ReactElement {
  void viewerUserId;
  const payload = item.payload as Extract<
    SocialFeedItemPayload,
    { type: "instance_created" }
  >;
  const actor: SocialUserSummaryDto = item.actorUser;
  return (
    <div
      data-testid="feed-item-instance_created"
      data-instance-id={payload.instanceId}
      data-quiz-slug={payload.quizSlug}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span> created a
        multiplayer instance.
      </p>
    </div>
  );
}