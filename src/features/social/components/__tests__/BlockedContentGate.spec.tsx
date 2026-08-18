

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BlockedContentGate } from "@/features/social/components/BlockedContentGate";
import type { Relationship } from "@/features/social/types";

const mockUseRelationship = vi.fn();
vi.mock("@/features/social/hooks/useRelationship", () => ({
useRelationship: (...args: unknown[]) => mockUseRelationship(...args),
}));

beforeEach(() => {
mockUseRelationship.mockReset();
mockUseRelationship.mockReturnValue({
relationship: "none" as Relationship,
isLoading: false,
isStale: false,
error: null,
retry: () => Promise.resolve(),
isAuthenticated: true,
  });
});

describe("BlockedContentGate", () => {
it("renders children when the relationship is non-blocking", () => {
render(
<BlockedContentGate targetUserId="user-1" relationshipOverride="friend">
<div data-testid="children">visible</div>
</BlockedContentGate>,
    );
expect(screen.getByTestId("children")).toBeInTheDocument();
expect(
screen.queryByTestId("blocked-content-gate-fallback"),
    ).toBeNull();
  });

it("renders the fallback when relationship is 'blocked'", () => {
render(
<BlockedContentGate targetUserId="user-1" relationshipOverride="blocked">
<div data-testid="children">hidden</div>
</BlockedContentGate>,
    );
expect(screen.queryByTestId("children")).toBeNull();
expect(
screen.getByTestId("blocked-content-gate-fallback"),
    ).toBeInTheDocument();
  });

it("renders the fallback when relationship is 'blocked_by'", () => {
render(
<BlockedContentGate
targetUserId="user-1"
relationshipOverride="blocked_by"
      >
<div data-testid="children">hidden</div>
</BlockedContentGate>,
    );
expect(screen.queryByTestId("children")).toBeNull();
expect(
screen.getByTestId("blocked-content-gate-fallback"),
    ).toBeInTheDocument();
  });

it("accepts a custom fallback", () => {
render(
<BlockedContentGate
targetUserId="user-1"
relationshipOverride="blocked"
fallback={<div data-testid="custom-fallback">custom</div>}
      >
<div data-testid="children">hidden</div>
</BlockedContentGate>,
    );
expect(screen.queryByTestId("children")).toBeNull();
expect(screen.queryByTestId("blocked-content-gate-fallback")).toBeNull();
expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
  });

it("renders children when useRelationship reports a non-blocking value", () => {
mockUseRelationship.mockReturnValue({
relationship: "following" as Relationship,
isLoading: false,
isStale: false,
error: null,
retry: () => Promise.resolve(),
isAuthenticated: true,
    });
render(
<BlockedContentGate targetUserId="user-1">
<div data-testid="children">visible</div>
</BlockedContentGate>,
    );
expect(screen.getByTestId("children")).toBeInTheDocument();
  });
});