/**
 * `FeedItemQuizCompleted` — Sub-renderer for the `quiz_completed`
 * feed-item type.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  Story 6.9.
 * Source ticket: TKT-6.9.E2.
 */

import { type ReactElement } from "react";

import type {
  SocialFeedItemDto,
  SocialFeedItemPayload,
  SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemQuizCompletedProps {
  readonly item: SocialFeedItemDto;
  readonly viewerUserId: string;
}

export function FeedItemQuizCompleted({
  item,
  viewerUserId,
}: FeedItemQuizCompletedProps): ReactElement {
  void viewerUserId;
  const payload = item.payload as Extract<
    SocialFeedItemPayload,
    { type: "quiz_completed" }
  >;
  const actor: SocialUserSummaryDto = item.actorUser;
  return (
    <div
      data-testid="feed-item-quiz_completed"
      data-quiz-id={payload.quizId}
      data-quiz-slug={payload.quizSlug}
      data-score-percent={payload.scorePercent}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span> completed a quiz
        with a score of {payload.scorePercent}%.
      </p>
    </div>
  );
}