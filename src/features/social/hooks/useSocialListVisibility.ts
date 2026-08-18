"use client";

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