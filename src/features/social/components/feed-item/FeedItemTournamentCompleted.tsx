/**
 * `FeedItemTournamentCompleted` — Sub-renderer for the
 * `tournament_completed` feed-item type.
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

export interface FeedItemTournamentCompletedProps {
  readonly item: SocialFeedItemDto;
  readonly viewerUserId: string;
}

export function FeedItemTournamentCompleted({
  item,
  viewerUserId,
}: FeedItemTournamentCompletedProps): ReactElement {
  void viewerUserId;
  const payload = item.payload as Extract<
    SocialFeedItemPayload,
    { type: "tournament_completed" }
  >;
  const actor: SocialUserSummaryDto = item.actorUser;
  return (
    <div
      data-testid="feed-item-tournament_completed"
      data-tournament-id={payload.tournamentId}
      data-tournament-slug={payload.tournamentSlug}
      data-placement={payload.placement}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span> placed #
        {payload.placement} in a tournament.
      </p>
    </div>
  );
}