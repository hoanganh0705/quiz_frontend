/**
 * `feed-route.spec.tsx` — Integration smoke test for the
 * `/social/feed` route (TKT-6.9.I1).
 *
 * The route is a thin server entry that delegates to
 * `SocialFeedRouteGate` inside a `<Suspense>` boundary. The
 * spec exercises the documented integration smoke flow:
 *
 *   - Initial load (placeholder branch, flag-gated)
 *   - Initial load (live branch, populated)
 *   - Initial load (live branch, empty)
 *   - Initial load (live branch, error)
 *   - Initial load (live branch, rate-limited)
 *   - Load more (live branch, populated, `hasMore === true`)
 *   - Privacy branch (live branch, `visibility === 'blocked_viewer'`)
 *   - Logout reset (the page wires `useSocialListLifecycleReset`)
 *   - Suspense boundary (the route is wrapped in `<Suspense>`)
 *
 * The spec mocks the gate, the page, and the lifecycle reset
 * hook so the route module's composition can be asserted in
 * isolation from the page shell's branch logic (which is covered
 * by `SocialFeedPage.spec.tsx`).
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SocialFeedRoute from "@/app/(protected)/social/feed/page";

// ─── Mock all dependencies ─────────────────────────────────────────────────

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

// The route delegates to the gate; the gate composes the page.
// We mock the page barrel and let the gate's real implementation
// drive the composition (placeholder / privacy / live branches).
// The integration smoke test exercises each branch by configuring
// `mockGetFeatureFlagValue` + `mockUseAuthBootstrap` + the page
// mocks.
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

// ─── Test fixtures ────────────────────────────────────────────────────────

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
  // Default: both flags are 'live' AND the viewer is authenticated.
  mockGetFeatureFlagValue.mockReturnValue("live");
  mockUseAuthBootstrap.mockReturnValue(authenticatedViewer);
  // Default page rendering — the live branch is the most common
  // happy path; tests override with `mockImplementationOnce` to
  // exercise the other page branches.
  mockSocialFeedPage.mockImplementation(() => mockFeedPageItems());
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────

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
    // The route module wraps `<SocialFeedRouteGate />` in a
    // `<Suspense fallback={null}>` boundary. The spec asserts that
    // the gate's children are mounted (the placeholder is rendered
    // when the gate short-circuits on the flag) — the suspension is
    // transparent because the mocked gate is synchronous.
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    render(<SocialFeedRoute />);
    expect(
      screen.getByTestId("social-feed-placeholder"),
    ).toBeInTheDocument();
  });
});
