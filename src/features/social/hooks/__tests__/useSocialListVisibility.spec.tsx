

import { describe, expect, it } from "vitest";

import {
resolveSocialListVisibility,
} from "@/features/social/hooks/useSocialListVisibility";

describe("resolveSocialListVisibility", () => {
it("canViewFriends is true when isOwner", () => {
const result = resolveSocialListVisibility({
relationship: "none",
isOwner: true,
isAuthenticated: true,
    });
expect(result.canViewFriends).toBe(true);
expect(result.canViewBlocked).toBe(true);
expect(result.canViewCounts).toBe(true);
  });

it("canViewFriends is true when isMutualFriend", () => {
const result = resolveSocialListVisibility({
relationship: "friend",
isOwner: false,
isAuthenticated: true,
    });
expect(result.canViewFriends).toBe(true);
expect(result.canViewBlocked).toBe(false);
expect(result.canViewCounts).toBe(true);
  });

it("canViewFriends is false for non-owner non-mutual", () => {
const result = resolveSocialListVisibility({
relationship: "none",
isOwner: false,
isAuthenticated: true,
    });
expect(result.canViewFriends).toBe(false);
expect(result.canViewBlocked).toBe(false);
  });

it("canViewBlocked is true only when isOwner", () => {
for (const rel of ["friend", "none", "blocked_by", "following"] as const) {
const result = resolveSocialListVisibility({
relationship: rel,
isOwner: false,
isAuthenticated: true,
      });
expect(result.canViewBlocked).toBe(false);
    }
  });

it("canViewCounts is false when unauthenticated", () => {
const result = resolveSocialListVisibility({
relationship: "none",
isOwner: false,
isAuthenticated: false,
    });
expect(result.canViewCounts).toBe(false);
  });

it("canViewCounts is true when authenticated", () => {
const result = resolveSocialListVisibility({
relationship: "none",
isOwner: false,
isAuthenticated: true,
    });
expect(result.canViewCounts).toBe(true);
  });

it("isMutualFriend is true only when relationship is 'friend'", () => {
expect(
resolveSocialListVisibility({
relationship: "friend",
isOwner: false,
isAuthenticated: true,
      }).isMutualFriend,
    ).toBe(true);

expect(
resolveSocialListVisibility({
relationship: "follower",
isOwner: false,
isAuthenticated: true,
      }).isMutualFriend,
    ).toBe(false);

expect(
resolveSocialListVisibility({
relationship: "following",
isOwner: false,
isAuthenticated: true,
      }).isMutualFriend,
    ).toBe(false);
  });

it("reflects the input identity flags verbatim", () => {
const result = resolveSocialListVisibility({
relationship: "none",
isOwner: true,
isAuthenticated: true,
    });
expect(result.isOwner).toBe(true);
expect(result.isAuthenticated).toBe(true);
  });
});