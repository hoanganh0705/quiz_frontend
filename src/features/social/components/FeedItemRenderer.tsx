"use client";

import { type ReactElement } from "react";

import {
FEED_ITEM_TYPES,
FEED_DEFENSIVE_FALLBACK_TESTID,
isFeedItemType,
} from "@/features/social/feed-discriminator";
import type { SocialFeedItemDto } from "@/features/social/types/relationship";

import { addFeedBreadcrumb } from "@/lib/social/social-sentry";

import {
FeedItemBadgeEarned,
FeedItemBadgeRevoked,
FeedItemRankMilestone,
FeedItemPeakRankAchieved,
FeedItemTournamentJoined,
FeedItemTournamentCompleted,
FeedItemTournamentWon,
FeedItemCommentCreated,
FeedItemQuizCompleted,
FeedItemQuizMilestone,
FeedItemInstanceCreated,
FeedItemInstanceJoined,
FeedItemInstanceCompleted,
FeedItemUnknown,
} from "./feed-item";

export interface FeedItemRendererProps {

readonly item: SocialFeedItemDto;

readonly viewerUserId: string;
}

export function FeedItemRenderer({
item,
viewerUserId,
}: FeedItemRendererProps): ReactElement {

void viewerUserId;

const itemType = item.type;
if (!isFeedItemType(itemType)) {
return (
<FeedItemUnknown item={item} rawType={String(itemType ?? "")} />
    );
  }

switch (itemType) {
case "badge_earned": {
return <FeedItemBadgeEarned item={item} viewerUserId={viewerUserId} />;
    }
case "badge_revoked": {
return <FeedItemBadgeRevoked item={item} viewerUserId={viewerUserId} />;
    }
case "rank_milestone": {
return <FeedItemRankMilestone item={item} viewerUserId={viewerUserId} />;
    }
case "peak_rank_achieved": {
return (
<FeedItemPeakRankAchieved item={item} viewerUserId={viewerUserId} />
      );
    }
case "tournament_joined": {
return (
<FeedItemTournamentJoined item={item} viewerUserId={viewerUserId} />
      );
    }
case "tournament_completed": {
return (
<FeedItemTournamentCompleted item={item} viewerUserId={viewerUserId} />
      );
    }
case "tournament_won": {
return <FeedItemTournamentWon item={item} viewerUserId={viewerUserId} />;
    }
case "comment_created": {
return (
<FeedItemCommentCreated item={item} viewerUserId={viewerUserId} />
      );
    }
case "quiz_completed": {
return <FeedItemQuizCompleted item={item} viewerUserId={viewerUserId} />;
    }
case "quiz_milestone": {
return <FeedItemQuizMilestone item={item} viewerUserId={viewerUserId} />;
    }
case "instance_created": {
return (
<FeedItemInstanceCreated item={item} viewerUserId={viewerUserId} />
      );
    }
case "instance_joined": {
return (
<FeedItemInstanceJoined item={item} viewerUserId={viewerUserId} />
      );
    }
case "instance_completed": {
return (
<FeedItemInstanceCompleted item={item} viewerUserId={viewerUserId} />
      );
    }
default: {

const _exhaustive: never = itemType;
void _exhaustive;

addFeedBreadcrumb({
route: "feed.item.unknown",
reason: "unknown_discriminator",
      });
return (
<div
data-testid={FEED_DEFENSIVE_FALLBACK_TESTID}
data-item-id={item.id}
role="status"
className="p-3 rounded-md border border-dashed border-border text-sm text-muted-foreground"
        >
Recent activity
        </div>
      );
    }
  }
}

export const FEED_ITEM_RENDERER_INVARIANTS = Object.freeze({
itemTypes: FEED_ITEM_TYPES,
defensiveFallbackTestId: FEED_DEFENSIVE_FALLBACK_TESTID,
});