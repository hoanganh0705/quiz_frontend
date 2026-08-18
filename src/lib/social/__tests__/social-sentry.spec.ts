

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockAddBreadcrumb = vi.fn();

vi.mock("@sentry/nextjs", () => ({
addBreadcrumb: (...args: unknown[]) => mockAddBreadcrumb(...args),
}));

import {
EPIC_6_1_BREADCRUMB_CATEGORY,
SOCIAL_EPIC_6_1_VERSION,
addSocialMutationBreadcrumb,
addSocialServiceBreadcrumb,
} from "@/lib/social/social-sentry";

beforeEach(() => {
mockAddBreadcrumb.mockClear();
});

afterEach(() => {
vi.clearAllMocks();
});

describe("social-sentry — constants", () => {
it("EPIC_6_1_BREADCRUMB_CATEGORY is exactly 'social'", () => {
expect(EPIC_6_1_BREADCRUMB_CATEGORY).toBe("social:6.1");
  });

it("SOCIAL_EPIC_6_1_VERSION is exactly '1.0.0'", () => {
expect(SOCIAL_EPIC_6_1_VERSION).toBe("1.0.0");
  });
});

describe("social-sentry — addSocialServiceBreadcrumb", () => {
it("emits the documented payload shape with every documented field", () => {
addSocialServiceBreadcrumb({
route: "social.getRelationshipStatus",
status: 200,
durationMs: 142,
code: "GLOBAL_NOT_FOUND",
targetUserId: "user-42",
    });

expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.category).toBe(EPIC_6_1_BREADCRUMB_CATEGORY);
expect(call.data).toEqual({
route: "social.getRelationshipStatus",
status: 200,
durationMs: 142,
code: "GLOBAL_NOT_FOUND",
targetUserId: "user-42",
epic: SOCIAL_EPIC_6_1_VERSION,
    });
  });

it("omits optional fields when not provided", () => {
addSocialServiceBreadcrumb({
route: "social.getUserFollowers",
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.category).toBe(EPIC_6_1_BREADCRUMB_CATEGORY);
const data = call.data as Record<string, unknown>;
expect(data.route).toBe("social.getUserFollowers");
expect(data.epic).toBe(SOCIAL_EPIC_6_1_VERSION);
expect(data).not.toHaveProperty("status");
expect(data).not.toHaveProperty("durationMs");
expect(data).not.toHaveProperty("code");
expect(data).not.toHaveProperty("targetUserId");
  });

it("keeps the in-flight marker when status is undefined", () => {
addSocialServiceBreadcrumb({
route: "social.getRelationshipStatus",
durationMs: undefined,
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
const data = call.data as Record<string, unknown>;
expect(data).not.toHaveProperty("status");
expect(data).not.toHaveProperty("durationMs");
  });

it("emits the breadcrumb through the @sentry/nextjs facade", () => {
addSocialServiceBreadcrumb({
route: "social.getRelationshipStatus",
status: 200,
    });

expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.category).toBe("social:6.1");
  });
});

describe("social-sentry — addSocialMutationBreadcrumb", () => {
it("emits the documented payload shape", () => {
addSocialMutationBreadcrumb({
action: "follow",
targetUserId: "user-42",
status: 204,
    });

expect(mockAddBreadcrumb).toHaveBeenCalledTimes(1);
const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.category).toBe(EPIC_6_1_BREADCRUMB_CATEGORY);
expect(call.data).toEqual({
action: "follow",
targetUserId: "user-42",
status: 204,
epic: SOCIAL_EPIC_6_1_VERSION,
    });
  });

it("includes the error code when a mutation fails", () => {
addSocialMutationBreadcrumb({
action: "block",
targetUserId: "user-9",
status: 403,
code: "SOCIAL_BLOCKED_USER",
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
expect(call.category).toBe("social:6.1");
expect(call.data).toEqual({
action: "block",
targetUserId: "user-9",
status: 403,
code: "SOCIAL_BLOCKED_USER",
epic: SOCIAL_EPIC_6_1_VERSION,
    });
  });

it("omits optional fields when not provided", () => {
addSocialMutationBreadcrumb({
action: "unfollow",
targetUserId: "user-7",
    });

const call = mockAddBreadcrumb.mock.calls[0]?.[0] as Record<string, unknown>;
const data = call.data as Record<string, unknown>;
expect(data.action).toBe("unfollow");
expect(data.targetUserId).toBe("user-7");
expect(data.epic).toBe(SOCIAL_EPIC_6_1_VERSION);
expect(data).not.toHaveProperty("status");
expect(data).not.toHaveProperty("code");
  });
});

describe("social-sentry — breadcrumb contract", () => {
it("never emits a breadcrumb with a different category", () => {
addSocialServiceBreadcrumb({ route: "social.getRelationshipStatus" });
addSocialMutationBreadcrumb({
action: "follow",
targetUserId: "user-1",
    });

for (const call of mockAddBreadcrumb.mock.calls) {
const arg = call[0] as Record<string, unknown>;
expect(arg.category).toBe("social:6.1");
    }
  });

it("emits the epic version on every breadcrumb", () => {
addSocialServiceBreadcrumb({ route: "social.getRelationshipStatus" });
addSocialMutationBreadcrumb({
action: "follow",
targetUserId: "user-1",
    });

for (const call of mockAddBreadcrumb.mock.calls) {
const arg = call[0] as Record<string, unknown>;
const data = arg.data as Record<string, unknown>;
expect(data.epic).toBe(SOCIAL_EPIC_6_1_VERSION);
    }
  });
});
