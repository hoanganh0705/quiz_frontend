/**
 * `FeedItemPeakRankAchieved` — Sub-renderer for the
 * `peak_rank_achieved` feed-item type.
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

export interface FeedItemPeakRankAchievedProps {
  readonly item: SocialFeedItemDto;
  readonly viewerUserId: string;
}

export function FeedItemPeakRankAchieved({
  item,
  viewerUserId,
}: FeedItemPeakRankAchievedProps): ReactElement {
  void viewerUserId;
  const payload = item.payload as Extract<
    SocialFeedItemPayload,
    { type: "peak_rank_achieved" }
  >;
  const actor: SocialUserSummaryDto = item.actorUser;
  return (
    <div
      data-testid="feed-item-peak_rank_achieved"
      data-period={payload.period}
      data-rank={payload.rank}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span> hit a new peak
        rank of #{payload.rank} ({payload.period.replace("_", " ")}).
      </p>
    </div>
  );
}