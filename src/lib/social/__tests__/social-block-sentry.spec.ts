/**
 * `social-block-sentry.spec.ts` — Locks the Epic 6.3 Sentry
 * breadcrumb contract (TKT-6.3.H1).
 *
 * Coverage:
 *
 *   - `EPIC_6_3_BREADCRUMB_CATEGORY` is exactly "social:6.3".
 *   - `SOCIAL_EPIC_6_3_VERSION` is exactly "1.0.0".
 *   - `addSocialAnalyticsBreadcrumb` emits the documented
 *     payload shape (route, kind, targetUserId?, period?,
 *     offset?, limit?, total?, status?, durationMs?, code?,
 *     epic).
 *   - `addSocialLeaderboardBreadcrumb` emits the documented
 *     leaderboard payload (route, period, offset, limit,
 *     total?, status?, durationMs?, code?, epic).
 *   - Optional fields are omitted when not provided.
 *   - The breadcrumb category is exactly `social:6.3` for every
 *     emitted event.
 *
 * The Sentry SDK is mocked via `vi.mock` so the test runs in
 * either node or jsdom without requiring the SDK to be
 * initialised.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAddBreadcrumb = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

import {
  EPIC_6_3_BREADCRUMB_CATEGORY,
  SOCIAL_EPIC_6_3_VERSION,
  SOCIAL_ANALYTICS_ROUTES,
  addSocialAnalyticsBreadcrumb,
  addSocialLeaderboardBreadcrumb,
} from "@/lib/social/social-block-sentry";

beforeEach(() => {
  mockAddBreadcrumb.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("social-block-sentry — constants", () => {
  it("EPIC_6_3_BREADCRUMB_CATEGORY is exactly 'social'", () => {
    expect(EPIC_6_3_BREADCRUMB_CATEGORY).toBe("social:6.3");
  });

  it("SOCIAL_EPIC_6_3_VERSION is exactly '1.0.0'", () => {
    expect(SOCIAL_EPIC_6_3_VERSION).toBe("1.0.0");
  });

  it("documents the three stable SDK route names", () => {
    expect(SOCIAL_ANALYTICS_ROUTES.getUserSocialStats).toBe(
      "social.getUserSocialStats",
    );
    expect(SOCIAL_ANALYTICS_ROUTES.getMySocialAnalytics).toBe(
      "social.getMySocialAnalytics",
    );
    expect(SOCIAL_ANALYTICS_ROUTES.getFriendLeaderboard).toBe(
      "social.getFriendLeaderboard",
    );
  });
});

describe("social-block-sentry — addSocialAnalyticsBreadcrumb", () => {
  it("emits the documented payload shape with every documented field", () => {
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getUserSocialStats,
      kind: "stats",
      targetUserId: "user-1",
      status: 200,
      durationMs: 86,
      code: "GLOBAL_NOT_FOUND",
    });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.category).toBe(EPIC_6_3_BREADCRUMB_CATEGORY);
    expect(call.data).toEqual({
      route: "social.getUserSocialStats",
      kind: "stats",
      targetUserId: "user-1",
      status: 200,
      durationMs: 86,
      code: "GLOBAL_NOT_FOUND",
      epic: SOCIAL_EPIC_6_3_VERSION,
    });
  });

  it("forwards the period discriminator on the my-analytics surface", () => {
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getMySocialAnalytics,
      kind: "my-analytics",
      period: "month",
    });

    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.data).toEqual({
      route: "social.getMySocialAnalytics",
      kind: "my-analytics",
      period: "month",
      epic: SOCIAL_EPIC_6_3_VERSION,
    });
  });

  it("forwards the pagination fields on the leaderboard surface", () => {
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getFriendLeaderboard,
      kind: "leaderboard",
      period: "all",
      offset: 20,
      limit: 20,
      total: 142,
    });

    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.data).toEqual({
      route: "social.getFriendLeaderboard",
      kind: "leaderboard",
      period: "all",
      offset: 20,
      limit: 20,
      total: 142,
      epic: SOCIAL_EPIC_6_3_VERSION,
    });
  });

  it("omits optional fields when not provided", () => {
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getUserSocialStats,
      kind: "stats",
    });

    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    const data = call.data as Record<string, unknown>;
    expect(data.route).toBe("social.getUserSocialStats");
    expect(data.kind).toBe("stats");
    expect(data.epic).toBe(SOCIAL_EPIC_6_3_VERSION);
    expect(data).not.toHaveProperty("targetUserId");
    expect(data).not.toHaveProperty("period");
    expect(data).not.toHaveProperty("offset");
    expect(data).not.toHaveProperty("limit");
    expect(data).not.toHaveProperty("total");
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("durationMs");
    expect(data).not.toHaveProperty("code");
  });

  it("keeps the in-flight marker when status and durationMs are undefined", () => {
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getMySocialAnalytics,
      kind: "my-analytics",
      status: undefined,
      durationMs: undefined,
    });

    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    const data = call.data as Record<string, unknown>;
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("durationMs");
  });

  it("emits the breadcrumb through the @sentry/nextjs facade with the documented category", () => {
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getMySocialAnalytics,
      kind: "my-analytics",
    });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.category).toBe("social:6.3");
  });
});

describe("social-block-sentry — addSocialLeaderboardBreadcrumb", () => {
  it("emits the documented leaderboard payload shape", () => {
    addSocialLeaderboardBreadcrumb({
      offset: 0,
      limit: 20,
      total: 142,
      period: "weekly",
      status: 200,
      durationMs: 51,
    });

    expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.category).toBe(EPIC_6_3_BREADCRUMB_CATEGORY);
    expect(call.data).toEqual({
      route: "social.getFriendLeaderboard",
      period: "weekly",
      offset: 0,
      limit: 20,
      total: 142,
      status: 200,
      durationMs: 51,
      epic: SOCIAL_EPIC_6_3_VERSION,
    });
  });

  it("includes the error code when the leaderboard endpoint fails", () => {
    addSocialLeaderboardBreadcrumb({
      offset: 0,
      limit: 20,
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
    });

    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.data).toEqual({
      route: "social.getFriendLeaderboard",
      period: "weekly",
      offset: 0,
      limit: 20,
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      epic: SOCIAL_EPIC_6_3_VERSION,
    });
  });

  it("omits optional fields when not provided", () => {
    addSocialLeaderboardBreadcrumb({ offset: 0, limit: 20 });

    const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
    const data = call.data as Record<string, unknown>;
    expect(data.route).toBe("social.getFriendLeaderboard");
    expect(data.offset).toBe(0);
    expect(data.limit).toBe(20);
    expect(data.period).toBe("weekly");
    expect(data.epic).toBe(SOCIAL_EPIC_6_3_VERSION);
    expect(data).not.toHaveProperty("total");
    expect(data).not.toHaveProperty("status");
    expect(data).not.toHaveProperty("durationMs");
    expect(data).not.toHaveProperty("code");
  });
});

describe("social-block-sentry — breadcrumb contract", () => {
  it("never emits a breadcrumb with a different category", () => {
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getUserSocialStats,
      kind: "stats",
    });
    addSocialLeaderboardBreadcrumb({ offset: 0, limit: 20 });

    for (const call of mockAddBreadcrumb.mock.calls) {
      const arg = call[0] as Record<string, unknown>;
      expect(arg.category).toBe("social:6.3");
    }
  });

  it("emits the epic version on every breadcrumb", () => {
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getMySocialAnalytics,
      kind: "my-analytics",
    });
    addSocialLeaderboardBreadcrumb({ offset: 0, limit: 20 });

    for (const call of mockAddBreadcrumb.mock.calls) {
      const arg = call[0] as Record<string, unknown>;
      const data = arg.data as Record<string, unknown>;
      expect(data.epic).toBe(SOCIAL_EPIC_6_3_VERSION);
    }
  });
});