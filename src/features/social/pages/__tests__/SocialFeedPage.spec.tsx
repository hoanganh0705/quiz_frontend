/**
 * `SocialFeedPage.spec.tsx` — Locks the Story 6.9 global feed
 * page-shell contract (TKT-6.9.G1).
 *
 * Asserts the documented branch ordering:
 *
 *   `visibility → rate-limit → loading → empty → error → items`
 *
 * Concretely, the spec covers:
 *
 *   - The privacy branch (each non-`'visible'` value renders the
 *     `PrivacyRestrictedNotice` and no items).
 *   - The rate-limit branch (empty items + rate-limit error →
 *     `social-feed-page-rate-limited` testid).
 *   - The loading branch (`isLoading && items.length === 0` →
 *     `FeedSkeleton`).
 *   - The empty branch (`items.length === 0 && !error && visible`
 *     → `FeedEmptyState kind="empty"`).
 *   - The error branch (`error && items.length === 0` →
 *     `FeedErrorState`).
 *   - The items branch (`FeedGlobalNotice` at the top, the
 *     `SocialFeedItem` rows, `FeedStaleMarker` when stale, and
 *     `FeedLoadMore` at the bottom).
 *   - `useSocialListLifecycleReset` is invoked with the
 *     `targetUserId` and a stable `reset` callback.
 *   - The page is mounted at the canonical `/social/feed` route
 *     via the App Router (the route file is created in TKT-6.9.I1
 *     and is intentionally out of scope here).
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SocialFeedPage } from "@/features/social/pages/SocialFeedPage";
import { ApiError } from "@/lib/api";

import type { SocialFeedItemDto } from "@/features/social/types/relationship";

// ─── Hook mocks ───────────────────────────────────────────────────────────

const mockUseFeed = vi.fn();
vi.mock("@/features/social/hooks/useFeed", () => ({
  useFeed: (...args: unknown[]) => mockUseFeed(...args),
}));

const mockUseSocialListLifecycleReset = vi.fn();
vi.mock("@/features/social/hooks/useSocialListLifecycleReset", () => ({
  useSocialListLifecycleReset: (
    ...args: ReadonlyArray<unknown>
  ) => mockUseSocialListLifecycleReset(...args),
}));

const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  useAuthBootstrap: () => mockUseAuthBootstrap(),
}));

const mockUseRelationship = vi.fn();
vi.mock("@/features/social/hooks/useRelationship", () => ({
  useRelationship: (...args: unknown[]) => mockUseRelationship(...args),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────

const VIEWER_ID = "viewer-1";

function makeFeedItem(idx: number): SocialFeedItemDto {
  return {
    id: `item-${idx}`,
    type: "quiz_completed" as const,
    at: new Date(2026, 0, 1, 12, idx, 0).toISOString(),
    actorUser: {
      id: `actor-${idx}`,
      userId: `actor-${idx}`,
      userName: `actor${idx}`,
      displayName: `actor${idx}`,
      avatarUrl: null,
      isPrivate: false,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    payload: {
      type: "quiz_completed",
      quizId: `quiz-${idx}`,
      quizSlug: `quiz-${idx}`,
      scorePercent: 80 + idx,
    },
  };
}

function makeApiError(
  code: string,
  status = 403,
  extensions: Record<string, unknown> = { code },
): ApiError {
  const axiosLike = {
    response: {
      status,
      statusText: code,
      data: {
        type: "about:blank",
        title: code,
        status,
        detail: `test error ${code}`,
        extensions,
      },
    },
    message: `test error ${code}`,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
  return new ApiError(axiosLike);
}

function rateLimitError(seconds: number): ApiError {
  return makeApiError("GLOBAL_RATE_LIMITED", 429, {
    code: "GLOBAL_RATE_LIMITED",
    retryAfterMs: seconds * 1000,
  });
}

const FEED_RESULT_BASE = {
  items: [] as readonly SocialFeedItemDto[],
  hasMore: false,
  loadMore: () => undefined,
  isLoading: false,
  isLoadingMore: false,
  error: null as ApiError | null,
  refresh: () => Promise.resolve(),
  staleness: "fresh" as const,
  visibility: "visible" as const,
  rateLimitedUntil: null as number | null,
  cooldownSeconds: undefined as number | undefined,
};

beforeEach(() => {
  mockUseFeed.mockReset();
  mockUseSocialListLifecycleReset.mockReset();
  mockUseAuthBootstrap.mockReset();
  mockUseRelationship.mockReset();

  mockUseAuthBootstrap.mockReturnValue({
    isAuthenticated: true,
    isBootstrapping: false,
    currentUser: { userId: VIEWER_ID },
  });

  mockUseRelationship.mockReturnValue({
    relationship: "none",
    isLoading: false,
    isStale: false,
    error: null,
    retry: () => Promise.resolve(),
    isAuthenticated: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Privacy branch ───────────────────────────────────────────────────────

describe("SocialFeedPage — privacy branch", () => {
  it.each([
    ["blocked_viewer"],
    ["blocked_by_viewer"],
    ["private"],
    ["not_found"],
  ] as const)(
    "renders the privacy notice when visibility is '%s'",
    (vis) => {
      mockUseFeed.mockReturnValue({
        ...FEED_RESULT_BASE,
        visibility: vis,
      });
      render(<SocialFeedPage />);
      expect(
        screen.getByTestId("privacy-restricted-notice-not_available"),
      ).toBeInTheDocument();
      // The items branch is never reached.
      expect(screen.queryByTestId("social-feed-page")).toBeNull();
    },
  );
});

// ─── Rate-limit branch ────────────────────────────────────────────────────

describe("SocialFeedPage — rate-limit branch", () => {
  it("renders the rate-limited surface when the cache is empty and rateLimitedUntil is set", () => {
    const future = Date.now() + 60_000;
    mockUseFeed.mockReturnValue({
      ...FEED_RESULT_BASE,
      items: [],
      visibility: "visible",
      error: rateLimitError(60),
      rateLimitedUntil: future,
    });
    render(<SocialFeedPage />);
    expect(
      screen.getByTestId("social-feed-page-rate-limited"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("feed-error-state"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("feed-error-state").getAttribute("data-error-class"),
    ).toBe("rate_limit");
    expect(screen.queryByTestId("social-feed-page")).toBeNull();
  });
});

// ─── Loading branch ───────────────────────────────────────────────────────

describe("SocialFeedPage — loading branch", () => {
  it("renders FeedSkeleton when isLoading and items.length === 0", () => {
    mockUseFeed.mockReturnValue({
      ...FEED_RESULT_BASE,
      isLoading: true,
    });
    render(<SocialFeedPage />);
    expect(
      screen.getByTestId("social-feed-page-loading"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("feed-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("social-feed-page")).toBeNull();
  });
});

// ─── Empty branch ─────────────────────────────────────────────────────────

describe("SocialFeedPage — empty branch", () => {
  it("renders FeedEmptyState kind='empty' when visible with no items and no error", () => {
    mockUseFeed.mockReturnValue({
      ...FEED_RESULT_BASE,
    });
    render(<SocialFeedPage />);
    expect(screen.getByTestId("social-feed-page-empty")).toBeInTheDocument();
    const empty = screen.getByTestId("feed-empty-state");
    expect(empty).toBeInTheDocument();
    expect(empty.getAttribute("data-empty-kind")).toBe("empty");
    expect(screen.queryByTestId("social-feed-page")).toBeNull();
  });
});

// ─── Error branch ─────────────────────────────────────────────────────────

describe("SocialFeedPage — error branch", () => {
  it("renders FeedErrorState when error is set and items.length === 0", () => {
    mockUseFeed.mockReturnValue({
      ...FEED_RESULT_BASE,
      error: makeApiError("GLOBAL_INTERNAL_ERROR", 500),
    });
    render(<SocialFeedPage />);
    expect(screen.getByTestId("social-feed-page-error")).toBeInTheDocument();
    expect(screen.getByTestId("feed-error-state")).toBeInTheDocument();
    expect(
      screen.getByTestId("feed-error-state").getAttribute("data-error-class"),
    ).toBe("retryable");
    expect(screen.queryByTestId("social-feed-page")).toBeNull();
  });
});

// ─── Items branch ─────────────────────────────────────────────────────────

describe("SocialFeedPage — items branch", () => {
  it("renders FeedGlobalNotice + items + load-more when populated", () => {
    mockUseFeed.mockReturnValue({
      ...FEED_RESULT_BASE,
      items: [makeFeedItem(1), makeFeedItem(2)],
      hasMore: true,
    });
    render(<SocialFeedPage />);
    expect(screen.getByTestId("social-feed-page")).toBeInTheDocument();
    expect(
      screen.getByTestId("feed-global-notice"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("social-feed-list")).toBeInTheDocument();
    expect(
      screen.getAllByTestId("social-feed-list-item").length,
    ).toBe(2);
    expect(screen.getByTestId("feed-load-more")).toBeInTheDocument();
  });

  it("renders FeedStaleMarker when staleness is 'stale'", () => {
    mockUseFeed.mockReturnValue({
      ...FEED_RESULT_BASE,
      items: [makeFeedItem(1)],
      isLoading: true,
      staleness: "stale",
    });
    render(<SocialFeedPage />);
    expect(screen.getByTestId("feed-stale-marker")).toBeInTheDocument();
  });

  it("does NOT render FeedStaleMarker when staleness is 'fresh'", () => {
    mockUseFeed.mockReturnValue({
      ...FEED_RESULT_BASE,
      items: [makeFeedItem(1)],
    });
    render(<SocialFeedPage />);
    expect(screen.queryByTestId("feed-stale-marker")).toBeNull();
  });
});

// ─── Lifecycle reset wiring ───────────────────────────────────────────────

describe("SocialFeedPage — lifecycle reset wiring", () => {
  it("invokes useSocialListLifecycleReset with viewerUserId and a stable reset callback", () => {
    mockUseFeed.mockReturnValue({
      ...FEED_RESULT_BASE,
      items: [makeFeedItem(1)],
    });
    render(<SocialFeedPage />);
    expect(mockUseSocialListLifecycleReset).toHaveBeenCalledTimes(1);
    const args = mockUseSocialListLifecycleReset.mock.calls[0]?.[0] as
      | { targetUserId: string | null; reset: () => void }
      | undefined;
    expect(args).toBeDefined();
    expect(args?.targetUserId).toBe(VIEWER_ID);
    expect(typeof args?.reset).toBe("function");
    // The reset callback is a no-op (the SWR cache is cleared by
    // `useFeed` itself on the `auth-state-change` event).
    expect(() => args?.reset()).not.toThrow();
  });
});
