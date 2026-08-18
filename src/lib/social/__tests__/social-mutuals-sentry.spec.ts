

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAddBreadcrumb = vi.fn();

vi.mock("@sentry/nextjs", () => ({
addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

import {
EPIC_6_4_BREADCRUMB_CATEGORY,
SOCIAL_EPIC_6_4_VERSION,
SOCIAL_6_4_ROUTES,
addSocialActivityBreadcrumb,
addSocialMutualBreadcrumb,
} from "@/lib/social/social-mutuals-sentry";

beforeEach(() => {
mockAddBreadcrumb.mockClear();
});

afterEach(() => {
vi.clearAllMocks();
});

describe("social-mutuals-sentry — constants", () => {
it("EPIC_6_4_BREADCRUMB_CATEGORY is exactly 'social'", () => {
expect(EPIC_6_4_BREADCRUMB_CATEGORY).toBe("social:6.4");
  });

it("SOCIAL_EPIC_6_4_VERSION is exactly '1.0.0'", () => {
expect(SOCIAL_EPIC_6_4_VERSION).toBe("1.0.0");
  });

it("documents the three stable SDK route names", () => {
expect(SOCIAL_6_4_ROUTES.getMutualFriends).toBe(
"social.getMutualFriends",
    );
expect(SOCIAL_6_4_ROUTES.getMutualFollowers).toBe(
"social.getMutualFollowers",
    );
expect(SOCIAL_6_4_ROUTES.getUserActivity).toBe(
"social.getUserActivity",
    );
  });
});

describe("social-mutuals-sentry — addSocialMutualBreadcrumb", () => {
it("emits the documented payload shape with every documented field", () => {
addSocialMutualBreadcrumb({
route: SOCIAL_6_4_ROUTES.getMutualFriends,
targetUserId: "user-1",
surface: "mutuals-friends",
total: 12,
status: 200,
durationMs: 86,
code: "GLOBAL_NOT_FOUND",
    });

expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.category).toBe(EPIC_6_4_BREADCRUMB_CATEGORY);
expect(call.data).toEqual({
route: "social.getMutualFriends",
targetUserId: "user-1",
surface: "mutuals-friends",
total: 12,
status: 200,
durationMs: 86,
code: "GLOBAL_NOT_FOUND",
epic: SOCIAL_EPIC_6_4_VERSION,
    });
  });

it("forwards the surface discriminator on the followers surface", () => {
addSocialMutualBreadcrumb({
route: SOCIAL_6_4_ROUTES.getMutualFollowers,
targetUserId: "user-1",
surface: "mutuals-followers",
total: 4,
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.data).toEqual({
route: "social.getMutualFollowers",
targetUserId: "user-1",
surface: "mutuals-followers",
total: 4,
epic: SOCIAL_EPIC_6_4_VERSION,
    });
  });

it("omits optional fields when not provided", () => {
addSocialMutualBreadcrumb({
route: SOCIAL_6_4_ROUTES.getMutualFriends,
targetUserId: "user-1",
surface: "mutuals-friends",
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
const data = call.data as Record<string, unknown>;
expect(data.route).toBe("social.getMutualFriends");
expect(data.targetUserId).toBe("user-1");
expect(data.surface).toBe("mutuals-friends");
expect(data.epic).toBe(SOCIAL_EPIC_6_4_VERSION);
expect(data).not.toHaveProperty("total");
expect(data).not.toHaveProperty("status");
expect(data).not.toHaveProperty("durationMs");
expect(data).not.toHaveProperty("code");
  });

it("keeps the in-flight marker when status and durationMs are undefined", () => {
addSocialMutualBreadcrumb({
route: SOCIAL_6_4_ROUTES.getMutualFriends,
targetUserId: "user-1",
surface: "mutuals-friends",
status: undefined,
durationMs: undefined,
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
const data = call.data as Record<string, unknown>;
expect(data).not.toHaveProperty("status");
expect(data).not.toHaveProperty("durationMs");
  });

it("emits the breadcrumb through the @sentry/nextjs facade with the documented category", () => {
addSocialMutualBreadcrumb({
route: SOCIAL_6_4_ROUTES.getMutualFriends,
targetUserId: "user-1",
surface: "mutuals-friends",
    });

expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.category).toBe("social:6.4");
  });
});

describe("social-mutuals-sentry — addSocialActivityBreadcrumb", () => {
it("emits the documented payload shape with every documented field", () => {
addSocialActivityBreadcrumb({
route: SOCIAL_6_4_ROUTES.getUserActivity,
targetUserId: "user-1",
surface: "user-activity",
rateLimited: true,
cooldownSeconds: 30,
total: 42,
status: 429,
durationMs: 51,
code: "GLOBAL_RATE_LIMITED",
    });

expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.category).toBe(EPIC_6_4_BREADCRUMB_CATEGORY);
expect(call.data).toEqual({
route: "social.getUserActivity",
targetUserId: "user-1",
surface: "user-activity",
rateLimited: 1,
cooldownSeconds: 30,
total: 42,
status: 429,
durationMs: 51,
code: "GLOBAL_RATE_LIMITED",
epic: SOCIAL_EPIC_6_4_VERSION,
    });
  });

it("encodes rateLimited=false as 0 (not omitted)", () => {
addSocialActivityBreadcrumb({
route: SOCIAL_6_4_ROUTES.getUserActivity,
targetUserId: "user-1",
surface: "user-activity",
rateLimited: false,
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
const data = call.data as Record<string, unknown>;
expect(data.rateLimited).toBe(0);
  });

it("omits the rate-limit fields when not provided", () => {
addSocialActivityBreadcrumb({
route: SOCIAL_6_4_ROUTES.getUserActivity,
targetUserId: "user-1",
surface: "user-activity",
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
const data = call.data as Record<string, unknown>;
expect(data.route).toBe("social.getUserActivity");
expect(data.targetUserId).toBe("user-1");
expect(data.surface).toBe("user-activity");
expect(data.epic).toBe(SOCIAL_EPIC_6_4_VERSION);
expect(data).not.toHaveProperty("rateLimited");
expect(data).not.toHaveProperty("cooldownSeconds");
  });

it("includes the error code when the activity endpoint fails", () => {
addSocialActivityBreadcrumb({
route: SOCIAL_6_4_ROUTES.getUserActivity,
targetUserId: "user-1",
surface: "user-activity",
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
const data = call.data as Record<string, unknown>;
expect(data.code).toBe("GLOBAL_INTERNAL_ERROR");
expect(data.status).toBe(500);
  });
});

describe("social-mutuals-sentry — breadcrumb contract", () => {
it("never emits a breadcrumb with a different category", () => {
addSocialMutualBreadcrumb({
route: SOCIAL_6_4_ROUTES.getMutualFriends,
targetUserId: "user-1",
surface: "mutuals-friends",
    });
addSocialActivityBreadcrumb({
route: SOCIAL_6_4_ROUTES.getUserActivity,
targetUserId: "user-1",
surface: "user-activity",
    });

for (const call of mockAddBreadcrumb.mock.calls) {
const arg = call[0] as Record<string, unknown>;
expect(arg.category).toBe("social:6.4");
    }
  });

it("emits the epic version on every breadcrumb", () => {
addSocialMutualBreadcrumb({
route: SOCIAL_6_4_ROUTES.getMutualFriends,
targetUserId: "user-1",
surface: "mutuals-friends",
    });
addSocialActivityBreadcrumb({
route: SOCIAL_6_4_ROUTES.getUserActivity,
targetUserId: "user-1",
surface: "user-activity",
    });

for (const call of mockAddBreadcrumb.mock.calls) {
const arg = call[0] as Record<string, unknown>;
const data = arg.data as Record<string, unknown>;
expect(data.epic).toBe(SOCIAL_EPIC_6_4_VERSION);
    }
  });
});