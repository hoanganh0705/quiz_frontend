

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { BadgeDetail } from "@/features/achievements/components/BadgeDetail";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockUseBadge = vi.fn();
vi.mock("@/features/achievements/hooks/useBadge", () => ({
useBadge: (...args: unknown[]) => mockUseBadge(...args),
}));

describe("BadgeDetail", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("renders null when feature flag is placeholder", () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

mockUseBadge.mockReturnValue({
badge: null,
isLoading: false,
error: null,
retry: vi.fn(),
isPrivate: false,
isStale: false,
    });

const { container } = render(<BadgeDetail code="first-quiz" />);

expect(container.firstChild).toBeNull();
  });

it("renders null when code is empty", () => {
mockUseBadge.mockReturnValue({
badge: null,
isLoading: false,
error: null,
retry: vi.fn(),
isPrivate: false,
isStale: false,
    });

const { container } = render(<BadgeDetail code="" />);

expect(container.firstChild).toBeNull();
  });

it("renders the skeleton when loading with no cached badge", () => {
mockUseBadge.mockReturnValue({
badge: null,
isLoading: true,
error: null,
retry: vi.fn(),
isPrivate: false,
isStale: false,
    });

render(<BadgeDetail code="first-quiz" />);

expect(
screen.getByTestId("badge-detail-skeleton"),
    ).toBeInTheDocument();
expect(screen.queryByTestId("badge-detail")).not.toBeInTheDocument();
  });

it("renders the 'Badge hidden' notice when the badge is private", () => {
mockUseBadge.mockReturnValue({
badge: null,
isLoading: false,
error: {
code: "BADGE_HIDDEN",
status: 404,
message: "Hidden",
      },
retry: vi.fn(),
isPrivate: true,
isStale: false,
    });

render(<BadgeDetail code="first-quiz" />);

expect(screen.getByTestId("badge-detail-hidden")).toBeInTheDocument();
expect(screen.getByText(/badge hidden/i)).toBeInTheDocument();
  });

it("renders the tombstone for a deprecated badge", () => {
mockUseBadge.mockReturnValue({
badge: {
id: "old-badge",
code: "old-badge",
name: "Old Badge",
tier: "BRONZE",
description: null,
totalEarned: 0,
deprecated: true,
      },
isLoading: false,
error: null,
retry: vi.fn(),
isPrivate: false,
isStale: false,
    });

render(<BadgeDetail code="old-badge" />);

expect(screen.getByTestId("badge-detail-tombstone")).toBeInTheDocument();
expect(
screen.getByText(/this badge has been retired/i),
    ).toBeInTheDocument();
  });

it("renders the full detail for a normal badge", () => {
mockUseBadge.mockReturnValue({
badge: {
id: "first-quiz",
code: "first-quiz",
name: "First Quiz",
tier: "BRONZE",
description: "Completed your first quiz.",
totalEarned: 12345,
deprecated: false,
      },
isLoading: false,
error: null,
retry: vi.fn(),
isPrivate: false,
isStale: false,
    });

render(<BadgeDetail code="first-quiz" />);

const article = screen.getByTestId("badge-detail");
expect(article).toBeInTheDocument();
expect(article).toHaveTextContent("First Quiz");
expect(article).toHaveTextContent(/completed your first quiz/i);
expect(article).toHaveTextContent("12,345");
  });

it("renders the 'not yet available' note when a deferred-badge error is present", () => {
mockUseBadge.mockReturnValue({
badge: {
id: "future-badge",
code: "future-badge",
name: "Future Badge",
tier: "GOLD",
description: "Coming soon.",
totalEarned: 0,
deprecated: false,
      },
isLoading: false,
error: {
code: "BADGE_DEFERRED",
status: 409,
message: "Deferred",
      },
retry: vi.fn(),
isPrivate: false,
isStale: false,
    });

render(<BadgeDetail code="future-badge" />);

expect(screen.getByTestId("badge-detail")).toBeInTheDocument();

expect(
screen.getByText(/not yet available/i),
    ).toBeInTheDocument();
  });
});
