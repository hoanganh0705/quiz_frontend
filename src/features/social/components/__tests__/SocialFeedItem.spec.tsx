

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SocialFeedItem } from "@/features/social/components/SocialFeedItem";
import type {
SocialFeedItemDto,
SocialUserSummaryDto,
} from "@/features/social/types/relationship";

const mockUseRelationship = vi.fn();
vi.mock("@/features/social/hooks/useRelationship", () => ({
useRelationship: (...args: unknown[]) => mockUseRelationship(...args),
}));

const VIEWER_ID = "viewer-1";
const ACTOR: SocialUserSummaryDto = {
id: "user-1",
userId: "user-1",
userName: "Alice",
displayName: "Alice",
avatarUrl: "https://example.com/avatar.png",
isPrivate: false,
createdAt: "2025-01-01T00:00:00.000Z",
};

function makeItem(overrides: Partial<SocialFeedItemDto> = {}): SocialFeedItemDto {
return Object.freeze({
id: "item-1",
type: "quiz_completed" as const,
at: "2025-01-01T00:00:00.000Z",
actorUser: ACTOR,
payload: {
type: "quiz_completed",
quizId: "q1",
quizSlug: "general-knowledge",
scorePercent: 87,
    } as const,
...overrides,
  }) as SocialFeedItemDto;
}

beforeEach(() => {
mockUseRelationship.mockReset();
mockUseRelationship.mockReturnValue({
relationship: "none",
isLoading: false,
isStale: false,
error: null,
retry: () => Promise.resolve(),
isAuthenticated: true,
  });
});

describe("SocialFeedItem (TKT-6.9.E3)", () => {
it("renders the actor's avatar", () => {
const item = makeItem();
render(<SocialFeedItem item={item} viewerUserId={VIEWER_ID} />);
const row = screen.getByTestId("social-feed-item");

expect(row.querySelector('[data-slot="avatar"]')).toBeInTheDocument();
  });

it("renders the actor's username", () => {
const item = makeItem();
render(<SocialFeedItem item={item} viewerUserId={VIEWER_ID} />);

expect(screen.getAllByText("Alice").length).toBeGreaterThanOrEqual(1);
const userName = screen
      .getByTestId("social-feed-item")
      .querySelector("p.text-sm.font-medium");
expect(userName?.textContent).toBe("Alice");
  });

it("renders the item's timestamp via formatRelativeTime", () => {
const item = makeItem();
render(<SocialFeedItem item={item} viewerUserId={VIEWER_ID} />);
const time = screen.getByTestId("social-feed-item-timestamp");
expect(time.tagName).toBe("TIME");
expect(time.getAttribute("datetime")).toBe("2025-01-01T00:00:00.000Z");
  });

it("invokes the FeedItemRenderer dispatcher with the item", () => {
const item = makeItem();
render(<SocialFeedItem item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("feed-item-quiz_completed")).toBeInTheDocument();
  });

it("renders the BlockedContentGate (children visible when not blocked)", () => {
const item = makeItem();
render(<SocialFeedItem item={item} viewerUserId={VIEWER_ID} />);
expect(screen.getByTestId("social-feed-item")).toBeInTheDocument();
expect(
screen.queryByTestId("blocked-content-gate-fallback"),
    ).toBeNull();
  });

it("does NOT contain an anchor tag (`getByRole('link')` returns null)", () => {
const item = makeItem();
render(<SocialFeedItem item={item} viewerUserId={VIEWER_ID} />);
expect(screen.queryByRole("link")).toBeNull();
  });

it("does NOT emit any analytics payload on mount", () => {

const item = makeItem();
render(<SocialFeedItem item={item} viewerUserId={VIEWER_ID} />);
const row = screen.getByTestId("social-feed-item");
expect(row.getAttribute("data-analytics")).toBeNull();
  });
});