

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
ActivityStreamItem,
EPIC_6_4_BREADCRUMB_CATEGORY,
} from "@/features/social/components/ActivityStreamItem";
import { DEFENSIVE_FALLBACK_TESTID } from "@/features/social/activity-discriminator";
import type {
SocialActivityItemDto,
SocialUserSummaryDto,
} from "@/features/social/types/relationship";

const addBreadcrumbMock = vi.fn();

vi.mock("@sentry/nextjs", () => ({
addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

const SAMPLE_ACTOR: SocialUserSummaryDto = {
id: "actor-1",
userId: "user-actor",
userName: "alice",
displayName: "Alice",
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-01T00:00:00.000Z",
};

function makeItem(
type: SocialActivityItemDto["type"],
payload: SocialActivityItemDto["payload"],
overrides: Partial<SocialActivityItemDto> = {},
): SocialActivityItemDto {
return {
id: overrides.id ?? `item-${type}`,
type,
at: overrides.at ?? "2026-01-01T00:00:00.000Z",
actorUser: overrides.actorUser ?? SAMPLE_ACTOR,
payload,
  };
}

beforeEach(() => {
addBreadcrumbMock.mockClear();
});

describe("ActivityStreamItem — documented discriminators", () => {
it("renders the badge_earned sub-renderer", () => {
const item = makeItem("badge_earned", {
type: "badge_earned",
badgeId: "badge-1",
badgeSlug: "first-quiz",
    });
render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />);
expect(screen.getByTestId("activity-item-badge_earned")).toBeInTheDocument();
expect(screen.getByTestId("activity-item-badge_earned").getAttribute("data-badge-id")).toBe("badge-1");
  });

it("renders the badge_revoked sub-renderer", () => {
const item = makeItem("badge_revoked", {
type: "badge_revoked",
badgeId: "badge-1",
badgeSlug: "first-quiz",
    });
render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />);
expect(screen.getByTestId("activity-item-badge_revoked")).toBeInTheDocument();
  });

it("renders the rank_milestone sub-renderer", () => {
const item = makeItem("rank_milestone", {
type: "rank_milestone",
period: "weekly",
rank: 12,
    });
render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />);
expect(screen.getByTestId("activity-item-rank_milestone")).toBeInTheDocument();
expect(screen.getByTestId("activity-item-rank_milestone").getAttribute("data-rank")).toBe("12");
  });

it("renders the tournament_won sub-renderer", () => {
const item = makeItem("tournament_won", {
type: "tournament_won",
tournamentId: "t-1",
tournamentSlug: "winter-cup",
    });
render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />);
expect(screen.getByTestId("activity-item-tournament_won")).toBeInTheDocument();
  });

it("renders the comment_created sub-renderer", () => {
const item = makeItem("comment_created", {
type: "comment_created",
commentId: "c-1",
quizId: "q-1",
quizSlug: "quiz-1",
excerpt: "Great quiz!",
    });
render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />);
expect(screen.getByTestId("activity-item-comment_created")).toBeInTheDocument();
  });

it("renders the quiz_completed sub-renderer", () => {
const item = makeItem("quiz_completed", {
type: "quiz_completed",
quizId: "q-1",
quizSlug: "quiz-1",
scorePercent: 95,
    });
render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />);
expect(screen.getByTestId("activity-item-quiz_completed")).toBeInTheDocument();
  });

it("renders the quiz_milestone sub-renderer", () => {
const item = makeItem("quiz_milestone", {
type: "quiz_milestone",
quizId: "q-1",
quizSlug: "quiz-1",
milestone: "perfect_score",
    });
render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />);
expect(screen.getByTestId("activity-item-quiz_milestone")).toBeInTheDocument();
  });

it("renders the instance_joined sub-renderer", () => {
const item = makeItem("instance_joined", {
type: "instance_joined",
instanceId: "inst-1",
quizSlug: "quiz-1",
    });
render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />);
expect(screen.getByTestId("activity-item-instance_joined")).toBeInTheDocument();
  });
});

describe("ActivityStreamItem — defensive fallback", () => {
it("renders the documented fallback for an unknown payload discriminator", () => {

const item = makeItem("badge_earned", {
type: "future_unknown_payload",
badgeId: "b",
badgeSlug: "b",
    } as unknown as SocialActivityItemDto["payload"]);
render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />);
const fallback = screen.getByTestId(DEFENSIVE_FALLBACK_TESTID);
expect(fallback).toBeInTheDocument();
expect(fallback.getAttribute("data-item-id")).toBe("item-badge_earned");
  });

it("emits a phase6:6.4 breadcrumb with reason unknown_discriminator", () => {
const item = makeItem("badge_earned", {
type: "future_unknown_payload",
badgeId: "b",
badgeSlug: "b",
    } as unknown as SocialActivityItemDto["payload"]);
render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />);
expect(addBreadcrumbMock).toHaveBeenCalled();
const call = addBreadcrumbMock.mock.calls[0]?.[0];
expect(call?.category).toBe(EPIC_6_4_BREADCRUMB_CATEGORY);
expect((call?.data as Record<string, unknown> | undefined)?.reason).toBe(
"unknown_discriminator",
    );
  });

it("does not crash on a missing payload", () => {
const item = makeItem(
"badge_earned",
null as unknown as SocialActivityItemDto["payload"],
    );

expect(() => render(<ActivityStreamItem item={item} viewerUserId="viewer-1" />)).not.toThrow();
expect(screen.getByTestId(DEFENSIVE_FALLBACK_TESTID)).toBeInTheDocument();
  });
});
