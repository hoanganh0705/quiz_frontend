/**
 * `useSocialPermissions.spec.tsx` — locks the permission selector
 * (TKT-6.1.D2).
 *
 * Tests cover:
 *   - `relationship: 'self'` → all action permissions `false`.
 *   - `relationship: 'none'` → `canFollow`, `canFriendRequest`, `canBlock` `true`.
 *   - `relationship: 'incoming_request'` → `canRespond` `true`.
 *   - `relationship: 'outgoing_request'` → `canCancelRequest` `true`.
 *   - `relationship: 'blocked_by'` → all action permissions `false`.
 *   - `relationship: 'friend'` → `canUnfriend`, `canBlock` `true`.
 *   - `relationship: 'following'` → `canUnfollow` `true`.
 *   - Unauthenticated → all action permissions `false`.
 *   - `isSelf` and `isAuthenticated` flags.
 *
 * We test the pure resolver directly where appropriate; the hook
 * integration is exercised end-to-end via a small set of mocked
 * `useRelationship` shapes.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";

import {
  resolveSocialPermissions,
  useSocialPermissions,
} from "@/features/social/hooks/useSocialPermissions";
import type { Relationship } from "@/features/social/types";

const mockUseRelationship = vi.fn();
vi.mock("@/features/social/hooks/useRelationship", () => ({
  useRelationship: (...args: unknown[]) => mockUseRelationship(...args),
}));

function stubRelationship(
  relationship: Relationship,
  isAuthenticated: boolean,
) {
  mockUseRelationship.mockReturnValue({
    relationship,
    isLoading: false,
    isStale: false,
    error: null,
    retry: () => Promise.resolve(),
    isAuthenticated,
  });
}

describe("resolveSocialPermissions", () => {
  it("returns the strictest set when unauthenticated", () => {
    const result = resolveSocialPermissions({
      relationship: "none",
      isSelf: false,
      isAuthenticated: false,
    });
    expect(result).toEqual({
      canFollow: false,
      canUnfollow: false,
      canFriendRequest: false,
      canCancelRequest: false,
      canRespond: false,
      canUnfriend: false,
      canBlock: false,
      canUnblock: false,
      isSelf: false,
      isAuthenticated: false,
    });
  });

  it("returns the strictest set when self", () => {
    const result = resolveSocialPermissions({
      relationship: "self",
      isSelf: true,
      isAuthenticated: true,
    });
    expect(result.canFollow).toBe(false);
    expect(result.canUnfollow).toBe(false);
    expect(result.canFriendRequest).toBe(false);
    expect(result.canCancelRequest).toBe(false);
    expect(result.canRespond).toBe(false);
    expect(result.canUnfriend).toBe(false);
    expect(result.canBlock).toBe(false);
    expect(result.canUnblock).toBe(false);
    expect(result.isSelf).toBe(true);
  });

  it("'none' enables canFollow, canFriendRequest, canBlock", () => {
    const result = resolveSocialPermissions({
      relationship: "none",
      isSelf: false,
      isAuthenticated: true,
    });
    expect(result.canFollow).toBe(true);
    expect(result.canFriendRequest).toBe(true);
    expect(result.canBlock).toBe(true);
    expect(result.canUnfollow).toBe(false);
    expect(result.canCancelRequest).toBe(false);
    expect(result.canRespond).toBe(false);
    expect(result.canUnfriend).toBe(false);
    expect(result.canUnblock).toBe(false);
  });

  it("'following' enables only canUnfollow", () => {
    const result = resolveSocialPermissions({
      relationship: "following",
      isSelf: false,
      isAuthenticated: true,
    });
    expect(result.canFollow).toBe(false);
    expect(result.canUnfollow).toBe(true);
    expect(result.canFriendRequest).toBe(false);
    expect(result.canCancelRequest).toBe(false);
    expect(result.canRespond).toBe(false);
    expect(result.canUnfriend).toBe(false);
    expect(result.canBlock).toBe(false);
    expect(result.canUnblock).toBe(false);
  });

  it("'follower' enables canFollow, canFriendRequest, canBlock", () => {
    const result = resolveSocialPermissions({
      relationship: "follower",
      isSelf: false,
      isAuthenticated: true,
    });
    expect(result.canFollow).toBe(true);
    expect(result.canFriendRequest).toBe(true);
    expect(result.canBlock).toBe(true);
    expect(result.canUnfollow).toBe(false);
    expect(result.canCancelRequest).toBe(false);
    expect(result.canRespond).toBe(false);
    expect(result.canUnfriend).toBe(false);
    expect(result.canUnblock).toBe(false);
  });

  it("'friend' enables canUnfriend and canBlock", () => {
    const result = resolveSocialPermissions({
      relationship: "friend",
      isSelf: false,
      isAuthenticated: true,
    });
    expect(result.canUnfriend).toBe(true);
    expect(result.canBlock).toBe(true);
    expect(result.canFollow).toBe(false);
    expect(result.canUnfollow).toBe(false);
    expect(result.canFriendRequest).toBe(false);
    expect(result.canCancelRequest).toBe(false);
    expect(result.canRespond).toBe(false);
    expect(result.canUnblock).toBe(false);
  });

  it("'outgoing_request' enables only canCancelRequest", () => {
    const result = resolveSocialPermissions({
      relationship: "outgoing_request",
      isSelf: false,
      isAuthenticated: true,
    });
    expect(result.canCancelRequest).toBe(true);
    expect(result.canFollow).toBe(false);
    expect(result.canUnfollow).toBe(false);
    expect(result.canFriendRequest).toBe(false);
    expect(result.canRespond).toBe(false);
    expect(result.canUnfriend).toBe(false);
    expect(result.canBlock).toBe(false);
    expect(result.canUnblock).toBe(false);
  });

  it("'incoming_request' enables only canRespond", () => {
    const result = resolveSocialPermissions({
      relationship: "incoming_request",
      isSelf: false,
      isAuthenticated: true,
    });
    expect(result.canRespond).toBe(true);
    expect(result.canFollow).toBe(false);
    expect(result.canUnfollow).toBe(false);
    expect(result.canFriendRequest).toBe(false);
    expect(result.canCancelRequest).toBe(false);
    expect(result.canUnfriend).toBe(false);
    expect(result.canBlock).toBe(false);
    expect(result.canUnblock).toBe(false);
  });

  it("'blocked' enables only canUnblock", () => {
    const result = resolveSocialPermissions({
      relationship: "blocked",
      isSelf: false,
      isAuthenticated: true,
    });
    expect(result.canUnblock).toBe(true);
    expect(result.canFollow).toBe(false);
    expect(result.canUnfollow).toBe(false);
    expect(result.canFriendRequest).toBe(false);
    expect(result.canCancelRequest).toBe(false);
    expect(result.canRespond).toBe(false);
    expect(result.canUnfriend).toBe(false);
    expect(result.canBlock).toBe(false);
  });

  it("'blocked_by' returns the strictest (no action) set", () => {
    const result = resolveSocialPermissions({
      relationship: "blocked_by",
      isSelf: false,
      isAuthenticated: true,
    });
    expect(result.canFollow).toBe(false);
    expect(result.canUnfollow).toBe(false);
    expect(result.canFriendRequest).toBe(false);
    expect(result.canCancelRequest).toBe(false);
    expect(result.canRespond).toBe(false);
    expect(result.canUnfriend).toBe(false);
    expect(result.canBlock).toBe(false);
    expect(result.canUnblock).toBe(false);
    // `isAuthenticated` is preserved even on a no-op set.
    expect(result.isAuthenticated).toBe(true);
  });
});

describe("useSocialPermissions (hook)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("delegates to useRelationship and surfaces the resolved permissions", () => {
    stubRelationship("friend", true);

    const { result } = renderHook(() => useSocialPermissions("target-1"));

    expect(result.current.canUnfriend).toBe(true);
    expect(result.current.canBlock).toBe(true);
    expect(result.current.isSelf).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("flips isSelf to true when useRelationship returns 'self'", () => {
    stubRelationship("self", true);

    const { result } = renderHook(() => useSocialPermissions("user-123"));

    expect(result.current.isSelf).toBe(true);
    expect(result.current.canFollow).toBe(false);
    expect(result.current.canBlock).toBe(false);
  });

  it("flips isAuthenticated to false when useRelationship reports the viewer is signed out", () => {
    stubRelationship("none", false);

    const { result } = renderHook(() => useSocialPermissions("target-1"));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.canFollow).toBe(false);
    expect(result.current.canFriendRequest).toBe(false);
    expect(result.current.canBlock).toBe(false);
  });

  it("passes the currentUserId override to useRelationship", () => {
    stubRelationship("none", true);

    renderHook(() =>
      useSocialPermissions("target-1", { currentUserId: "user-123" }),
    );

    expect(mockUseRelationship).toHaveBeenCalledWith("target-1", {
      currentUserId: "user-123",
    });
  });
});
