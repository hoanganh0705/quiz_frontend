"use client";

import { type ReactElement } from "react";

import {
ACTIVITY_ITEM_TYPES,
DEFENSIVE_FALLBACK_TESTID,
isActivityItemType,
} from "@/features/social/activity-discriminator";
import type {
SocialActivityItemDto,
SocialFeedItemPayload,
SocialUserSummaryDto,
} from "@/features/social/types/relationship";
import {
addSocialActivityBreadcrumb,
EPIC_6_4_BREADCRUMB_CATEGORY,
SOCIAL_EPIC_6_4_VERSION,
SOCIAL_6_4_ROUTES,
} from "@/lib/social/social-mutuals-sentry";

interface ActivityStreamItemProps {

item: SocialActivityItemDto;

viewerUserId: string;
}

function ActivityItemQuizCompleted({
payload,
actor,
}: {
payload: Extract<SocialFeedItemPayload, { type: "quiz_completed" }>;
actor: SocialUserSummaryDto;
}): ReactElement {
return (
<div
data-testid="activity-item-quiz_completed"
data-quiz-id={payload.quizId}
data-actor-id={actor.userId}
    >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span>{" "}
completed a quiz with a score of {payload.scorePercent}%.
      </p>
</div>
  );
}

function ActivityItemAchievementEarned({
payload,
actor,
}: {
payload: Extract<SocialFeedItemPayload, { type: "badge_earned" }>;
actor: SocialUserSummaryDto;
}): ReactElement {
return (
<div
data-testid="activity-item-badge_earned"
data-badge-id={payload.badgeId}
data-actor-id={actor.userId}
    >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span>{" "}
earned the <span className="font-medium">{payload.badgeSlug}</span> badge.
      </p>
</div>
  );
}

function ActivityItemUnsupported({
item,
reason,
}: {
item: SocialActivityItemDto;
reason: "unknown_discriminator";
}): ReactElement {
const rawType = (item.payload?.type ?? "").toString();
const discriminator =
rawType.length > 0 && rawType.length <= 64 ? rawType : undefined;
addSocialActivityBreadcrumb({
route: SOCIAL_6_4_ROUTES.getUserActivity,
targetUserId: item.actorUser.userId,
surface: "user-activity",
reason,
...(discriminator !== undefined ? { discriminator } : {}),
  });

return (
<div
data-testid={DEFENSIVE_FALLBACK_TESTID}
data-item-id={item.id}
role="status"
className="p-3 rounded-md border border-dashed border-border text-sm text-muted-foreground"
    >
We couldn&apos;t recognise this activity. The team has been notified.
    </div>
  );
}

export function ActivityStreamItem({
item,
viewerUserId,
}: ActivityStreamItemProps): ReactElement {

void viewerUserId;

const payloadType = item.payload?.type;
if (!payloadType || !isActivityItemType(payloadType)) {
return <ActivityItemUnsupported item={item} reason="unknown_discriminator" />;
  }

const actor = item.actorUser;

switch (payloadType) {
case "quiz_completed": {
const payload = item.payload;
return <ActivityItemQuizCompleted payload={payload} actor={actor} />;
    }
case "badge_earned": {
const payload = item.payload;
return (
<ActivityItemAchievementEarned payload={payload} actor={actor} />
      );
    }
case "badge_revoked": {
const payload = item.payload;
return (
<div
data-testid="activity-item-badge_revoked"
data-badge-id={payload.badgeId}
data-actor-id={actor.userId}
        >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span>{" "}
had the <span className="font-medium">{payload.badgeSlug}</span> badge revoked.
          </p>
</div>
      );
    }
case "rank_milestone":
case "peak_rank_achieved": {
const payload = item.payload;
return (
<div
data-testid={`activity-item-${payloadType}`}
data-period={payload.period}
data-rank={payload.rank}
data-actor-id={actor.userId}
        >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span>{" "}
reached rank #{payload.rank} ({payload.period.replace("_", " ")}).
          </p>
</div>
      );
    }
case "tournament_joined":
case "tournament_won": {
const payload = item.payload;
const verb =
payloadType === "tournament_joined"
? " joined a tournament."
: " won a tournament.";
return (
<div
data-testid={`activity-item-${payloadType}`}
data-tournament-id={payload.tournamentId}
data-actor-id={actor.userId}
        >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span>
{verb}
</p>
</div>
      );
    }
case "tournament_completed": {
const payload = item.payload;
return (
<div
data-testid="activity-item-tournament_completed"
data-tournament-id={payload.tournamentId}
data-actor-id={actor.userId}
        >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span>{" "}
placed #{payload.placement} in a tournament.
          </p>
</div>
      );
    }
case "comment_created": {
const payload = item.payload;
return (
<div
data-testid="activity-item-comment_created"
data-comment-id={payload.commentId}
data-quiz-id={payload.quizId}
data-actor-id={actor.userId}
        >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span>{" "}
commented on a quiz: &ldquo;{payload.excerpt}&rdquo;
          </p>
</div>
      );
    }
case "quiz_milestone": {
const payload = item.payload;
const milestoneCopy =
payload.milestone === "first_completion"
? "completed a quiz for the first time"
: payload.milestone === "perfect_score"
? "achieved a perfect score"
: "hit a quiz milestone";
return (
<div
data-testid="activity-item-quiz_milestone"
data-quiz-id={payload.quizId}
data-milestone={payload.milestone}
data-actor-id={actor.userId}
        >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span>{" "}
{milestoneCopy}.
          </p>
</div>
      );
    }
case "instance_created":
case "instance_joined": {
const payload = item.payload;
const verb =
payloadType === "instance_created"
? "created a multiplayer instance"
: "joined a multiplayer instance";
return (
<div
data-testid={`activity-item-${payloadType}`}
data-instance-id={payload.instanceId}
data-actor-id={actor.userId}
        >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span>{" "}
{verb}.
          </p>
</div>
      );
    }
case "instance_completed": {
const payload = item.payload;
return (
<div
data-testid="activity-item-instance_completed"
data-instance-id={payload.instanceId}
data-actor-id={actor.userId}
        >
<p className="text-sm">
<span className="font-medium">{actor.userName}</span>{" "}
completed a multiplayer instance, placed #{payload.placement}.
          </p>
</div>
      );
    }
default: {

const _exhaustive: never = payloadType;
void _exhaustive;
return <ActivityItemUnsupported item={item} reason="unknown_discriminator" />;
    }
  }
}

export const ACTIVITY_STREAM_ITEM_RENDERER_INVARIANTS = Object.freeze({
itemTypes: ACTIVITY_ITEM_TYPES,
defensiveFallbackTestId: DEFENSIVE_FALLBACK_TESTID,
epicVersion: SOCIAL_EPIC_6_4_VERSION,
breadcrumbCategory: EPIC_6_4_BREADCRUMB_CATEGORY,
});
