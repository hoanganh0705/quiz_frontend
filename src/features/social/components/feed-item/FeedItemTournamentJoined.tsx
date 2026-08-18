

import { type ReactElement } from "react";

import type {
SocialFeedItemDto,
SocialFeedItemPayload,
SocialUserSummaryDto,
} from "@/features/social/types/relationship";

export interface FeedItemTournamentJoinedProps {
readonly item: SocialFeedItemDto;
readonly viewerUserId: string;
}

export function FeedItemTournamentJoined({
item,
viewerUserId,
}: FeedItemTournamentJoinedProps): ReactElement {
void viewerUserId;
const payload = item.payload as Extract<
SocialFeedItemPayload,
{ type: "tournament_joined" }
  >;
const actor: SocialUserSummaryDto = item.actorUser;
return (
<div
data-testid="feed-item-tournament_joined"
data-tournament-id={payload.tournamentId}
data-tournament-slug={payload.tournamentSlug}
data-actor-id={actor.userId}
    >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span> joined a
        tournament.
      </p>
</div>
  );
}