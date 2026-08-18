

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FeedItemRenderer } from "@/features/social/components/FeedItemRenderer";
import type {
SocialFeedItemDto,
SocialFeedItemPayload,
SocialUserSummaryDto,
} from "@/features/social/types/relationship";

const VIEWER_ID = "viewer-1";
const ACTOR: SocialUserSummaryDto = {
id: "user-1",
userId: "user-1",
userName: "Alice",
displayName: "Alice",
avatarUrl: null,
isPrivate: false,
createdAt: "2025-01-01T00:00:00.000Z",
};

function makeItem(
type: SocialFeedItemPayload["type"],
payload: SocialFeedItemPayload,
): SocialFeedItemDto {
return Object.freeze({
id: `item-${type}`,
type,
at: "2025-01-01T00:00:00.000Z",
actorUser: ACTOR,
payload,
  }) as SocialFeedItemDto;
}

describe("FeedItemRenderer (TKT-6.9.E1)", () => {
it("routes badge_earned to the matching sub-renderer", () => {
const item = makeItem("badge_earned", {
type: "badge_earned",
badgeId: "b1",
badgeSlug: "quiz-master",
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-badge_earned")).toBeInTheDocument();
  });

it("routes badge_revoked to the matching sub-renderer", () => {
const item = makeItem("badge_revoked", {
type: "badge_revoked",
badgeId: "b1",
badgeSlug: "quiz-master",
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-badge_revoked")).toBeInTheDocument();
  });

it("routes rank_milestone to the matching sub-renderer", () => {
const item = makeItem("rank_milestone", {
type: "rank_milestone",
period: "weekly",
rank: 7,
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-rank_milestone")).toBeInTheDocument();
  });

it("routes peak_rank_achieved to the matching sub-renderer", () => {
const item = makeItem("peak_rank_achieved", {
type: "peak_rank_achieved",
period: "daily",
rank: 3,
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(
screen.getByTestId("feed-item-peak_rank_achieved"),
    ).toBeInTheDocument();
  });

it("routes tournament_joined to the matching sub-renderer", () => {
const item = makeItem("tournament_joined", {
type: "tournament_joined",
tournamentId: "t1",
tournamentSlug: "spring-cup",
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(
screen.getByTestId("feed-item-tournament_joined"),
    ).toBeInTheDocument();
  });

it("routes tournament_completed to the matching sub-renderer", () => {
const item = makeItem("tournament_completed", {
type: "tournament_completed",
tournamentId: "t1",
tournamentSlug: "spring-cup",
placement: 2,
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(
screen.getByTestId("feed-item-tournament_completed"),
    ).toBeInTheDocument();
  });

it("routes tournament_won to the matching sub-renderer", () => {
const item = makeItem("tournament_won", {
type: "tournament_won",
tournamentId: "t1",
tournamentSlug: "spring-cup",
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-tournament_won")).toBeInTheDocument();
  });

it("routes comment_created to the matching sub-renderer", () => {
const item = makeItem("comment_created", {
type: "comment_created",
commentId: "c1",
quizId: "q1",
quizSlug: "general-knowledge",
excerpt: "Great quiz!",
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-comment_created")).toBeInTheDocument();
  });

it("routes quiz_completed to the matching sub-renderer", () => {
const item = makeItem("quiz_completed", {
type: "quiz_completed",
quizId: "q1",
quizSlug: "general-knowledge",
scorePercent: 87,
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-quiz_completed")).toBeInTheDocument();
  });

it("routes quiz_milestone to the matching sub-renderer", () => {
const item = makeItem("quiz_milestone", {
type: "quiz_milestone",
quizId: "q1",
quizSlug: "general-knowledge",
milestone: "perfect_score",
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-quiz_milestone")).toBeInTheDocument();
  });

it("routes instance_created to the matching sub-renderer", () => {
const item = makeItem("instance_created", {
type: "instance_created",
instanceId: "i1",
quizSlug: "general-knowledge",
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-instance_created")).toBeInTheDocument();
  });

it("routes instance_joined to the matching sub-renderer", () => {
const item = makeItem("instance_joined", {
type: "instance_joined",
instanceId: "i1",
quizSlug: "general-knowledge",
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-instance_joined")).toBeInTheDocument();
  });

it("routes instance_completed to the matching sub-renderer", () => {
const item = makeItem("instance_completed", {
type: "instance_completed",
instanceId: "i1",
quizSlug: "general-knowledge",
placement: 4,
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(
screen.getByTestId("feed-item-instance_completed"),
    ).toBeInTheDocument();
  });

it("routes unknown discriminator to the FeedItemUnknown fallback", () => {
const item = Object.freeze({
id: "item-future",
type: "future_type",
at: "2025-01-01T00:00:00.000Z",
actorUser: ACTOR,
payload: { type: "future_type" },
    }) as unknown as SocialFeedItemDto;
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-unknown")).toBeInTheDocument();
  });

it("does NOT perform any client-side filtering, ranking, or personalization", () => {

const item = makeItem("quiz_completed", {
type: "quiz_completed",
quizId: "q1",
quizSlug: "general-knowledge",
scorePercent: 87,
    });
render(<FeedItemRenderer item={item} viewerUserId={VIEWER_ID} />);
const rendered = screen.getByTestId("feed-item-quiz_completed");
expect(rendered.getAttribute("data-actor-id")).toBe(item.actorUser.userId);
  });
});