/**
 * `FeedItemQuizMilestone` — Sub-renderer for the `quiz_milestone`
 * feed-item type.
 */

import { type ReactElement } from "react";

import type {
  SocialFeedItemDto,
  SocialFeedItemPayload,
  SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemQuizMilestoneProps {
  readonly item: SocialFeedItemDto;
  readonly viewerUserId: string;
}

export function FeedItemQuizMilestone({
  item,
  viewerUserId,
}: FeedItemQuizMilestoneProps): ReactElement {
  void viewerUserId;
  const payload = item.payload as Extract<
    SocialFeedItemPayload,
    { type: "quiz_milestone" }
  >;
  const actor: SocialUserSummaryDto = item.actorUser;
  const milestoneCopy =
    payload.milestone === "first_completion"
      ? "completed a quiz for the first time"
      : payload.milestone === "perfect_score"
        ? "achieved a perfect score"
        : "hit a quiz milestone";
  return (
    <div
      data-testid="feed-item-quiz_milestone"
      data-quiz-id={payload.quizId}
      data-quiz-slug={payload.quizSlug}
      data-milestone={payload.milestone}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span> {milestoneCopy}.
      </p>
    </div>
  );
}