"use client";

import { useMemo } from "react";

import { useRelationship } from "@/features/social/hooks/useRelationship";
import type { Relationship } from "@/features/social/types";

export interface UseSocialPermissionsResult {
canFollow: boolean;
canUnfollow: boolean;
canFriendRequest: boolean;
canCancelRequest: boolean;
canRespond: boolean;
canUnfriend: boolean;
canBlock: boolean;
canUnblock: boolean;
isSelf: boolean;
isAuthenticated: boolean;
}

const STRICTEST_PERMISSIONS: UseSocialPermissionsResult = Object.freeze({
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

export function resolveSocialPermissions(args: {
relationship: Relationship;
isSelf: boolean;
isAuthenticated: boolean;
}): UseSocialPermissionsResult {
const { relationship, isSelf, isAuthenticated } = args;

if (!isAuthenticated || isSelf) {
return { ...STRICTEST_PERMISSIONS, isSelf, isAuthenticated };
  }

if (relationship === "blocked_by") {
return { ...STRICTEST_PERMISSIONS, isAuthenticated: true };
  }

switch (relationship) {
case "self":

return { ...STRICTEST_PERMISSIONS, isSelf: true, isAuthenticated: true };
case "none":
case "follower":

return {
canFollow: true,
canUnfollow: false,
canFriendRequest: true,
canCancelRequest: false,
canRespond: false,
canUnfriend: false,
canBlock: true,
canUnblock: false,
isSelf: false,
isAuthenticated: true,
      };
case "following":

return {
canFollow: false,
canUnfollow: true,
canFriendRequest: false,
canCancelRequest: false,
canRespond: false,
canUnfriend: false,
canBlock: false,
canUnblock: false,
isSelf: false,
isAuthenticated: true,
      };
case "friend":

return {
canFollow: false,
canUnfollow: false,
canFriendRequest: false,
canCancelRequest: false,
canRespond: false,
canUnfriend: true,
canBlock: true,
canUnblock: false,
isSelf: false,
isAuthenticated: true,
      };
case "outgoing_request":

return {
canFollow: false,
canUnfollow: false,
canFriendRequest: false,
canCancelRequest: true,
canRespond: false,
canUnfriend: false,
canBlock: false,
canUnblock: false,
isSelf: false,
isAuthenticated: true,
      };
case "incoming_request":

return {
canFollow: false,
canUnfollow: false,
canFriendRequest: false,
canCancelRequest: false,
canRespond: true,
canUnfriend: false,
canBlock: false,
canUnblock: false,
isSelf: false,
isAuthenticated: true,
      };
case "blocked":

return {
canFollow: false,
canUnfollow: false,
canFriendRequest: false,
canCancelRequest: false,
canRespond: false,
canUnfriend: false,
canBlock: false,
canUnblock: true,
isSelf: false,
isAuthenticated: true,
      };
  }
}

export interface UseSocialPermissionsOptions {

currentUserId?: string | null;
}

export function useSocialPermissions(
targetUserId: string | null,
options: UseSocialPermissionsOptions = {},
): UseSocialPermissionsResult {

const relationship = useRelationship(targetUserId, {
currentUserId: options.currentUserId ?? null,
  });

const isSelf = relationship.relationship === "self";

return useMemo<UseSocialPermissionsResult>(() => {
return resolveSocialPermissions({
relationship: relationship.relationship,
isSelf,
isAuthenticated: relationship.isAuthenticated,
    });
  }, [relationship.relationship, relationship.isAuthenticated, isSelf]);
}
