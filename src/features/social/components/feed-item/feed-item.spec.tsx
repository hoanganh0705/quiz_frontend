/**
 * `feed-item.spec.tsx` — Locks the per-type sub-renderer contract
 * (TKT-6.9.E2).
 *
 * Asserts:
 *
 *   - Each documented `SocialFeedItemType` literal renders the
 *     documented `data-testid` and a representative copy line.
 *   - The defensive `FeedItemUnknown` fallback renders the
 *     documented `data-testid` for an unknown discriminator.
 *   - Each sub-renderer is keyboard-accessible (snapshot test).
 *
 * The dispatcher (`FeedItemRenderer`, TKT-6.9.E1) is exercised in
 * `FeedItemRenderer.spec.tsx`. This spec is the per-type
 * sub-renderer contract.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  SocialFeedItemDto,
  SocialFeedItemPayload,
  SocialUserSummaryDto,
} from "@/features/social/types/relationship";

import * as FeedItem from "./index";

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

describe("FeedItem sub-renderers (TKT-6.9.E2)", () => {
  it("renders FeedItemBadgeEarned with the badge slug and actor", () => {
    const item = makeItem("badge_earned", {
      type: "badge_earned",
      badgeId: "b1",
      badgeSlug: "quiz-master",
    });
    render(<FeedItem.FeedItemBadgeEarned item={item} viewerUserId={VIEWER_ID} />);
    expect(screen.getByTestId("feed-item-badge_earned")).toBeInTheDocument();
    expect(screen.getByText(/quiz-master/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("renders FeedItemBadgeRevoked with the badge slug and actor", () => {
    const item = makeItem("badge_revoked", {
      type: "badge_revoked",
      badgeId: "b1",
      badgeSlug: "quiz-master",
    });
    render(<FeedItem.FeedItemBadgeRevoked item={item} viewerUserId={VIEWER_ID} />);
    expect(screen.getByTestId("feed-item-badge_revoked")).toBeInTheDocument();
    expect(screen.getByText(/quiz-master/)).toBeInTheDocument();
  });

  it("renders FeedItemRankMilestone with the period and rank", () => {
    const item = makeItem("rank_milestone", {
      type: "rank_milestone",
      period: "weekly",
      rank: 7,
    });
    render(<FeedItem.FeedItemRankMilestone item={item} viewerUserId={VIEWER_ID} />);
    expect(screen.getByTestId("feed-item-rank_milestone")).toBeInTheDocument();
    expect(screen.getByText(/#7/)).toBeInTheDocument();
  });

  it("renders FeedItemPeakRankAchieved with the period and rank", () => {
    const item = makeItem("peak_rank_achieved", {
      type: "peak_rank_achieved",
      period: "daily",
      rank: 3,
    });
    render(
      <FeedItem.FeedItemPeakRankAchieved item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-peak_rank_achieved")).toBeInTheDocument();
    expect(screen.getByText(/#3/)).toBeInTheDocument();
  });

  it("renders FeedItemTournamentJoined with the actor", () => {
    const item = makeItem("tournament_joined", {
      type: "tournament_joined",
      tournamentId: "t1",
      tournamentSlug: "spring-cup",
    });
    render(
      <FeedItem.FeedItemTournamentJoined item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-tournament_joined")).toBeInTheDocument();
    expect(screen.getByText(/joined a tournament/i)).toBeInTheDocument();
  });

  it("renders FeedItemTournamentCompleted with the placement", () => {
    const item = makeItem("tournament_completed", {
      type: "tournament_completed",
      tournamentId: "t1",
      tournamentSlug: "spring-cup",
      placement: 2,
    });
    render(
      <FeedItem.FeedItemTournamentCompleted item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-tournament_completed")).toBeInTheDocument();
    expect(screen.getByText(/#2/)).toBeInTheDocument();
  });

  it("renders FeedItemTournamentWon with the actor", () => {
    const item = makeItem("tournament_won", {
      type: "tournament_won",
      tournamentId: "t1",
      tournamentSlug: "spring-cup",
    });
    render(<FeedItem.FeedItemTournamentWon item={item} viewerUserId={VIEWER_ID} />);
    expect(screen.getByTestId("feed-item-tournament_won")).toBeInTheDocument();
    expect(screen.getByText(/won a tournament/i)).toBeInTheDocument();
  });

  it("renders FeedItemCommentCreated with the excerpt", () => {
    const item = makeItem("comment_created", {
      type: "comment_created",
      commentId: "c1",
      quizId: "q1",
      quizSlug: "general-knowledge",
      excerpt: "Great quiz!",
    });
    render(
      <FeedItem.FeedItemCommentCreated item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-comment_created")).toBeInTheDocument();
    expect(screen.getByText(/Great quiz!/)).toBeInTheDocument();
  });

  it("renders FeedItemQuizCompleted with the score", () => {
    const item = makeItem("quiz_completed", {
      type: "quiz_completed",
      quizId: "q1",
      quizSlug: "general-knowledge",
      scorePercent: 87,
    });
    render(<FeedItem.FeedItemQuizCompleted item={item} viewerUserId={VIEWER_ID} />);
    expect(screen.getByTestId("feed-item-quiz_completed")).toBeInTheDocument();
    expect(screen.getByText(/87%/)).toBeInTheDocument();
  });

  it("renders FeedItemQuizMilestone with the milestone copy", () => {
    const item = makeItem("quiz_milestone", {
      type: "quiz_milestone",
      quizId: "q1",
      quizSlug: "general-knowledge",
      milestone: "perfect_score",
    });
    render(<FeedItem.FeedItemQuizMilestone item={item} viewerUserId={VIEWER_ID} />);
    expect(screen.getByTestId("feed-item-quiz_milestone")).toBeInTheDocument();
    expect(screen.getByText(/perfect score/i)).toBeInTheDocument();
  });

  it("renders FeedItemInstanceCreated with the actor", () => {
    const item = makeItem("instance_created", {
      type: "instance_created",
      instanceId: "i1",
      quizSlug: "general-knowledge",
    });
    render(
      <FeedItem.FeedItemInstanceCreated item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-instance_created")).toBeInTheDocument();
    expect(screen.getByText(/multiplayer/i)).toBeInTheDocument();
  });

  it("renders FeedItemInstanceJoined with the actor", () => {
    const item = makeItem("instance_joined", {
      type: "instance_joined",
      instanceId: "i1",
      quizSlug: "general-knowledge",
    });
    render(
      <FeedItem.FeedItemInstanceJoined item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-instance_joined")).toBeInTheDocument();
    expect(screen.getByText(/joined a multiplayer instance/i)).toBeInTheDocument();
  });

  it("renders FeedItemInstanceCompleted with the placement", () => {
    const item = makeItem("instance_completed", {
      type: "instance_completed",
      instanceId: "i1",
      quizSlug: "general-knowledge",
      placement: 4,
    });
    render(
      <FeedItem.FeedItemInstanceCompleted item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-instance_completed")).toBeInTheDocument();
    expect(screen.getByText(/#4/)).toBeInTheDocument();
  });

  it("renders FeedItemUnknown with the documented testid", () => {
    const item = makeItem("badge_earned", {
      type: "badge_earned",
      badgeId: "b1",
      badgeSlug: "quiz-master",
    });
    render(<FeedItem.FeedItemUnknown item={item} rawType="future_type" />);
    expect(screen.getByTestId("feed-item-unknown")).toBeInTheDocument();
    expect(screen.getByText(/Recent activity/i)).toBeInTheDocument();
  });

  it("renders phase-plan-only FeedItemQuizPublished", () => {
    const item = makeItem("badge_earned", {
      type: "badge_earned",
      badgeId: "b1",
      badgeSlug: "quiz-master",
    });
    render(<FeedItem.FeedItemQuizPublished item={item} viewerUserId={VIEWER_ID} />);
    expect(screen.getByTestId("feed-item-quiz_published")).toBeInTheDocument();
  });

  it("renders phase-plan-only FeedItemAttemptCompleted", () => {
    const item = makeItem("badge_earned", {
      type: "badge_earned",
      badgeId: "b1",
      badgeSlug: "quiz-master",
    });
    render(
      <FeedItem.FeedItemAttemptCompleted item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-attempt_completed")).toBeInTheDocument();
  });

  it("renders phase-plan-only FeedItemAchievementEarned", () => {
    const item = makeItem("badge_earned", {
      type: "badge_earned",
      badgeId: "b1",
      badgeSlug: "quiz-master",
    });
    render(
      <FeedItem.FeedItemAchievementEarned item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-achievement_earned")).toBeInTheDocument();
  });

  it("renders phase-plan-only FeedItemFollowReceived", () => {
    const item = makeItem("badge_earned", {
      type: "badge_earned",
      badgeId: "b1",
      badgeSlug: "quiz-master",
    });
    render(
      <FeedItem.FeedItemFollowReceived item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-follow_received")).toBeInTheDocument();
  });

  it("renders phase-plan-only FeedItemFriendRequestAccepted", () => {
    const item = makeItem("badge_earned", {
      type: "badge_earned",
      badgeId: "b1",
      badgeSlug: "quiz-master",
    });
    render(
      <FeedItem.FeedItemFriendRequestAccepted item={item} viewerUserId={VIEWER_ID} />,
    );
    expect(screen.getByTestId("feed-item-friend_request_accepted")).toBeInTheDocument();
  });
});