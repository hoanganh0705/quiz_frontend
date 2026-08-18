

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
addFollowMutationBreadcrumb,
EPIC_6_6_BREADCRUMB_CATEGORY,
SOCIAL_EPIC_6_6_VERSION,
SOCIAL_6_6_ROUTES,
} from "@/lib/social/social-follow-mutation-sentry";

const addBreadcrumbMock = vi.hoisted(() => vi.fn());
vi.mock("@sentry/nextjs", () => ({
__esModule: true,
"*": vi.fn(),
default: { addBreadcrumb: addBreadcrumbMock },
addBreadcrumb: addBreadcrumbMock,
}));

describe("social-follow-mutation-sentry — TKT-6.6.G1", () => {
beforeEach(() => {
addBreadcrumbMock.mockClear();
  });

describe("exports", () => {
it('category is "social:6.6"', () => {
expect(EPIC_6_6_BREADCRUMB_CATEGORY).toBe("social:6.6");
    });

it('version is "1.0.0"', () => {
expect(SOCIAL_EPIC_6_6_VERSION).toBe("1.0.0");
    });

it('SOCIAL_6_6_ROUTES.followUser is "social.followUser"', () => {
expect(SOCIAL_6_6_ROUTES.followUser).toBe("social.followUser");
    });

it('SOCIAL_6_6_ROUTES.unfollowUser is "social.unfollowUser"', () => {
expect(SOCIAL_6_6_ROUTES.unfollowUser).toBe("social.unfollowUser");
    });
  });

describe("addFollowMutationBreadcrumb — success path", () => {
it("emits a breadcrumb with the correct category", () => {
addFollowMutationBreadcrumb({
route: "social.followUser",
method: "POST",
status: 204,
durationMs: 43,
targetUserId: "user-abc",
      });
expect(addBreadcrumbMock).toHaveBeenCalledTimes(1);
expect(addBreadcrumbMock).toHaveBeenCalledWith(
expect.objectContaining({
category: "social:6.6",
        }),
      );
    });

it("emits all required fields for a successful follow", () => {
addFollowMutationBreadcrumb({
route: "social.followUser",
method: "POST",
status: 204,
durationMs: 43,
targetUserId: "user-abc",
      });
expect(addBreadcrumbMock).toHaveBeenCalledWith(
expect.objectContaining({
data: expect.objectContaining({
route: "social.followUser",
method: "POST",
status: 204,
durationMs: 43,
epic: "1.0.0",
targetUserId: "user-abc",
          }),
        }),
      );
    });

it("emits all required fields for a successful unfollow", () => {
addFollowMutationBreadcrumb({
route: "social.unfollowUser",
method: "DELETE",
status: 204,
durationMs: 38,
targetUserId: "user-xyz",
      });
expect(addBreadcrumbMock).toHaveBeenCalledWith(
expect.objectContaining({
data: expect.objectContaining({
route: "social.unfollowUser",
method: "DELETE",
status: 204,
          }),
        }),
      );
    });
  });

describe("addFollowMutationBreadcrumb — error path (ApiError)", () => {
it("includes the error code when present", () => {
addFollowMutationBreadcrumb({
route: "social.followUser",
method: "POST",
status: 409,
durationMs: 55,
code: "SOCIAL_ALREADY_FOLLOWING",
targetUserId: "user-abc",
      });
expect(addBreadcrumbMock).toHaveBeenCalledWith(
expect.objectContaining({
data: expect.objectContaining({
status: 409,
code: "SOCIAL_ALREADY_FOLLOWING",
          }),
        }),
      );
    });

it("includes rate-limit error code", () => {
addFollowMutationBreadcrumb({
route: "social.followUser",
method: "POST",
status: 429,
durationMs: 12,
code: "GLOBAL_RATE_LIMITED",
targetUserId: "user-abc",
      });
expect(addBreadcrumbMock).toHaveBeenCalledWith(
expect.objectContaining({
data: expect.objectContaining({
code: "GLOBAL_RATE_LIMITED",
          }),
        }),
      );
    });
  });

describe("addFollowMutationBreadcrumb — network error (non-HTTP)", () => {
it("omits the status field when status is undefined", () => {
addFollowMutationBreadcrumb({
route: "social.followUser",
method: "POST",
status: undefined,
durationMs: 5000,
targetUserId: "user-abc",
      });
const call = addBreadcrumbMock.mock.calls[0]![0]!;
const data = call.data as Record<string, string | number>;

expect("status" in data).toBe(false);
    });
  });

describe("no secrets logged", () => {
it("does NOT include followId in the breadcrumb payload", () => {
addFollowMutationBreadcrumb({
route: "social.followUser",
method: "POST",
status: 204,
durationMs: 43,
targetUserId: "user-abc",
      });
const call = addBreadcrumbMock.mock.calls[0]![0]!;
const data = call.data as Record<string, string | number>;
expect(Object.keys(data)).not.toContain("followId");
expect(JSON.stringify(data)).not.toContain("followId");
    });

it("does NOT include friendshipId in the breadcrumb payload", () => {
addFollowMutationBreadcrumb({
route: "social.followUser",
method: "POST",
status: 204,
durationMs: 43,
targetUserId: "user-abc",
      });
const call = addBreadcrumbMock.mock.calls[0]![0]!;
const data = call.data as Record<string, string | number>;
expect(Object.keys(data)).not.toContain("friendshipId");
expect(JSON.stringify(data)).not.toContain("friendshipId");
    });

it("does NOT include authorization or token fields", () => {
addFollowMutationBreadcrumb({
route: "social.followUser",
method: "POST",
status: 204,
durationMs: 43,
targetUserId: "user-abc",
      });
const call = addBreadcrumbMock.mock.calls[0]![0]!;
const data = call.data as Record<string, string | number>;
expect(Object.keys(data)).not.toContain("token");
expect(Object.keys(data)).not.toContain("authorization");
expect(Object.keys(data)).not.toContain("bearer");
    });
  });
});
