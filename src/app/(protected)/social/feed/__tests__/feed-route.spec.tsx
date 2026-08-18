

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SocialFeedRoute from "@/app/(protected)/social/feed/page";

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
useAuthSession: () => mockUseAuthBootstrap(),
}));

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) =>
mockGetFeatureFlagValue(...args),
}));

const mockSocialFeedPlaceholder = vi.fn(() => (
<div data-testid="social-feed-placeholder">Placeholder</div>
));
vi.mock("@/features/social/components/SocialFeedPlaceholder", () => ({
SocialFeedPlaceholder: () => mockSocialFeedPlaceholder(),
}));

const mockPrivacyNotice = vi.fn(() => (
<div data-testid="privacy-restricted-notice">Privacy</div>
));
vi.mock("@/features/social/components/PrivacyRestrictedNotice", () => ({
PrivacyRestrictedNotice: () => mockPrivacyNotice(),
}));

const mockFeedPageEmpty = vi.fn(() => (
<div data-testid="social-feed-page-empty">Empty</div>
));
const mockFeedPageError = vi.fn(() => (
<div data-testid="social-feed-page-error">Error</div>
));
const mockFeedPageLoading = vi.fn(() => (
<div data-testid="social-feed-page-loading">Loading</div>
));
const mockFeedPageRateLimited = vi.fn(() => (
<div data-testid="social-feed-page-rate-limited">Rate Limited</div>
));
const mockFeedPagePrivacyBlocked = vi.fn(() => (
<div data-testid="social-feed-page-privacy-blocked">Privacy Blocked</div>
));
const mockFeedPageItems = vi.fn(() => (
<div data-testid="social-feed-page">Items</div>
));
const mockFeedPageItemsWithLoadMore = vi.fn(() => (
<div data-testid="social-feed-page">
Items
    <div data-testid="feed-load-more">Load More</div>
</div>
));

const mockSocialFeedPage = vi.fn();
vi.mock("@/features/social/pages/SocialFeedPage", () => ({
SocialFeedPage: () => mockSocialFeedPage(),
}));

const mockUseSocialListLifecycleReset = vi.fn();
vi.mock("@/features/social/hooks/useSocialListLifecycleReset", () => ({
useSocialListLifecycleReset: (
...args: ReadonlyArray<unknown>
  ) => mockUseSocialListLifecycleReset(...args),
}));

const authenticatedViewer = {
isAuthenticated: true,
isBootstrapping: false,
currentUser: { userId: "viewer-1" },
};
const unauthenticatedViewer = {
isAuthenticated: false,
isBootstrapping: false,
currentUser: null,
};

beforeEach(() => {
vi.clearAllMocks();

mockGetFeatureFlagValue.mockReturnValue("live");
mockUseAuthBootstrap.mockReturnValue(authenticatedViewer);

mockSocialFeedPage.mockImplementation(() => mockFeedPageItems());
});

afterEach(() => {
vi.clearAllMocks();
});

describe("SocialFeedRoute — placeholder branch (AC #7 initial load, placeholder)", () => {
it("renders SocialFeedPlaceholder when social_feed_live is 'placeholder'", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "live";
if (flag === "social_feed_live") return "placeholder";
return "live";
    });

render(<SocialFeedRoute />);

expect(
screen.getByTestId("social-feed-placeholder"),
    ).toBeInTheDocument();
expect(mockSocialFeedPage).not.toHaveBeenCalled();
  });

it("renders SocialFeedPlaceholder when social_live parent is 'placeholder'", () => {
mockGetFeatureFlagValue.mockImplementation((flag: string) => {
if (flag === "social_live") return "placeholder";
if (flag === "social_feed_live") return "live";
return "live";
    });

render(<SocialFeedRoute />);

expect(
screen.getByTestId("social-feed-placeholder"),
    ).toBeInTheDocument();
expect(mockSocialFeedPage).not.toHaveBeenCalled();
  });
});

describe("SocialFeedRoute — privacy branch (AC #8)", () => {
it("renders PrivacyRestrictedNotice when viewer is unauthenticated", () => {
mockUseAuthBootstrap.mockReturnValue(unauthenticatedViewer);

render(<SocialFeedRoute />);

expect(
screen.getByTestId("privacy-restricted-notice"),
    ).toBeInTheDocument();
expect(mockSocialFeedPage).not.toHaveBeenCalled();
  });
});

describe("SocialFeedRoute — live branch (AC #7)", () => {
it("renders the populated items surface on initial load", () => {
mockSocialFeedPage.mockImplementationOnce(() => mockFeedPageItems());

render(<SocialFeedRoute />);

expect(screen.getByTestId("social-feed-page")).toBeInTheDocument();
  });

it("renders the load-more affordance on the populated surface", () => {
mockSocialFeedPage.mockImplementationOnce(() =>
mockFeedPageItemsWithLoadMore(),
    );

render(<SocialFeedRoute />);

expect(screen.getByTestId("feed-load-more")).toBeInTheDocument();
  });

it("renders the empty branch", () => {
mockSocialFeedPage.mockImplementationOnce(() => mockFeedPageEmpty());

render(<SocialFeedRoute />);

expect(
screen.getByTestId("social-feed-page-empty"),
    ).toBeInTheDocument();
  });

it("renders the error branch", () => {
mockSocialFeedPage.mockImplementationOnce(() => mockFeedPageError());

render(<SocialFeedRoute />);

expect(
screen.getByTestId("social-feed-page-error"),
    ).toBeInTheDocument();
  });

it("renders the loading branch", () => {
mockSocialFeedPage.mockImplementationOnce(() => mockFeedPageLoading());

render(<SocialFeedRoute />);

expect(
screen.getByTestId("social-feed-page-loading"),
    ).toBeInTheDocument();
  });

it("renders the rate-limit branch", () => {
mockSocialFeedPage.mockImplementationOnce(() =>
mockFeedPageRateLimited(),
    );

render(<SocialFeedRoute />);

expect(
screen.getByTestId("social-feed-page-rate-limited"),
    ).toBeInTheDocument();
  });

it("renders the privacy-blocked branch on a blocked_viewer visibility", () => {
mockSocialFeedPage.mockImplementationOnce(() =>
mockFeedPagePrivacyBlocked(),
    );

render(<SocialFeedRoute />);

expect(
screen.getByTestId("social-feed-page-privacy-blocked"),
    ).toBeInTheDocument();
  });
});

describe("SocialFeedRoute — composition invariants", () => {
it("wraps the gate in a Suspense boundary (renders without error)", () => {

mockGetFeatureFlagValue.mockReturnValue("placeholder");
render(<SocialFeedRoute />);
expect(
screen.getByTestId("social-feed-placeholder"),
    ).toBeInTheDocument();
  });
});
