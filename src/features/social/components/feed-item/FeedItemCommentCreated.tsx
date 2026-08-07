/**
 * `FeedItemCommentCreated` — Sub-renderer for the
 * `comment_created` feed-item type.
 */

import { type ReactElement } from "react";

import type {
  SocialFeedItemDto,
  SocialFeedItemPayload,
  SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemCommentCreatedProps {
  readonly item: SocialFeedItemDto;
  readonly viewerUserId: string;
}

export function FeedItemCommentCreated({
  item,
  viewerUserId,
}: FeedItemCommentCreatedProps): ReactElement {
  void viewerUserId;
  const payload = item.payload as Extract<
    SocialFeedItemPayload,
    { type: "comment_created" }
  >;
  const actor: SocialUserSummaryDto = item.actorUser;
  return (
    <div
      data-testid="feed-item-comment_created"
      data-comment-id={payload.commentId}
      data-quiz-id={payload.quizId}
      data-quiz-slug={payload.quizSlug}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span> commented on a
        quiz: &ldquo;{payload.excerpt}&rdquo;
      </p>
    </div>
  );
}