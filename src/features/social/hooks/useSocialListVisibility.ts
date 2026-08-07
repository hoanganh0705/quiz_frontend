"use client";

/**
 * `useSocialListVisibility` — Privacy selector for the friends list,
 * the blocked list, and the social counts badge.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2.
 * Source ticket: TKT-6.2.D2.
 *
 * ## What this hook owns
 *
 * The single privacy selector every list page calls to decide
 * whether to render a list. The hook returns:
 *
 *   - `canViewFriends`  — `true` when the viewer is the owner or
 *                         a mutual friend of the target.
 *   - `canViewBlocked`  — `true` only when the viewer is the owner
 *                         (no one else can see anyone's block list).
 *   - `canViewCounts`   — `true` for any authenticated viewer.
 *                         Unauthenticated viewers cannot see counts
 *                         because the badges leak relationship
 *                         information.
 *   - `isOwner`         — the viewer is the target user.
 *   - `isMutualFriend`  — the relationship between viewer and target
 *                         is `'friend'`.
 *   - `isAuthenticated` — the viewer is signed in.
 *
 * ## Server authority
 *
 * The decision is driven by the server-derived `Relationship`
 * projection (Epic 6.1 / TKT-6.1.D1). The hook never infers a
 * relationship from local state alone — every flag is computed
 * from `useRelationship.relationship` (or, when the target is the
 * viewer, `Relationship.self` which the relationship hook
 * synthesises internally).
 *
 * ## Cross-cutting identity
 *
 * The `isOwner` flag is the auth-bootstrap's `currentUser.userId`
 * compared against `targetUserId`. When the auth bootstrap is
 * mid-flight (not yet resolved), `isOwner` is `false` so the
 * friends list defaults to the strictest visible state until the
 * server answer arrives.
 *
 * ## Privacy-rule summary
 *
 *   - `canViewFriends = isOwner || isMutualFriend`.
 *   - `canViewBlocked = isOwner`.
 *   - `canViewCounts = isAuthenticated`.
 *
 * The private-profile refinement (`canViewCounts === false` for
 * unauthenticated viewers on private profiles) is a future
 * refinement of the same hook — see the planning ticket
 * `canViewFriends` server-derived hint discussion.
 */

import { useMemo } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useRelationship } from "@/features/social/hooks/useRelationship";

import type { Relationship } from "../types";

export interface UseSocialListVisibilityResult {
  canViewFriends: boolean;
  canViewBlocked: boolean;
  canViewCounts: boolean;
  isOwner: boolean;
  isMutualFriend: boolean;
  isAuthenticated: boolean;
  isPrivateProfile: boolean;
}

/**
 * Pure resolver.
 *
 * Given the relationship, the owner flag, and the authenticated
 * flag, compute the visibility flags. Exported so tests can
 * exercise the resolver without mocking the hooks.
 */
export function resolveSocialListVisibility(args: {
  relationship: Relationship;
  isOwner: boolean;
  isAuthenticated: boolean;
}): UseSocialListVisibilityResult {
  const { relationship, isOwner, isAuthenticated } = args;

  const isMutualFriend = relationship === "friend";

  const canViewFriends = isOwner || isMutualFriend;
  const canViewBlocked = isOwner;
  const canViewCounts = isAuthenticated;

  return {
    canViewFriends,
    canViewBlocked,
    canViewCounts,
    isOwner,
    isMutualFriend,
    isAuthenticated,
    isPrivateProfile: false,
  };
}

/**
 * Hook form. Reads the relationship and identity via the existing
 * primitive hooks.
 */
export function useSocialListVisibility(
  targetUserId: string | null,
): UseSocialListVisibilityResult {
  const auth = useAuthSession();
  const viewerId = auth.currentUser?.userId ?? null;

  const relationshipResult = useRelationship(targetUserId);
  const relationship: Relationship =
    relationshipResult.relationship ?? "none";

  const isOwner =
    viewerId !== null && targetUserId !== null && viewerId === targetUserId;
  const isAuthenticated = auth.isAuthenticated;

  return useMemo<UseSocialListVisibilityResult>(
    () =>
      resolveSocialListVisibility({
        relationship,
        isOwner,
        isAuthenticated,
      }),
    [relationship, isOwner, isAuthenticated],
  );
}