

import { type ReactElement } from "react";

import type {
SocialFeedItemDto,
SocialFeedItemPayload,
SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemTournamentWonProps {
readonly item: SocialFeedItemDto;
readonly viewerUserId: string;
}

export function FeedItemTournamentWon({
item,
viewerUserId,
}: FeedItemTournamentWonProps): ReactElement {
void viewerUserId;
const payload = item.payload as Extract<
SocialFeedItemPayload,
{ type: "tournament_won" }
  >;
const actor: SocialUserSummaryDto = item.actorUser;
return (
<div
data-testid="feed-item-tournament_won"
data-tournament-id={payload.tournamentId}
data-tournament-slug={payload.tournamentSlug}
data-actor-id={actor.userId}
    >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span> won a tournament.
      </p>
</div>
  );
}