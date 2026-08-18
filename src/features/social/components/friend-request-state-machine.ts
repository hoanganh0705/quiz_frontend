

import type { Relationship } from "@/features/social/types";

export type FriendRequestHookState = "idle" | "pending" | "error";

export type FriendRequestActionKind =
| "send"
  | "openCancel"
  | "openRespond"
  | "openUnfriend"
  | null;

export type FriendRequestCtaIcon =
| "UserPlus"
  | "UserCheck"
  | "Clock"
  | "Ban"
  | "Loader"
  | "RefreshCw";

export interface FriendRequestUiState {

readonly label: string;

readonly icon: FriendRequestCtaIcon;

readonly onClick: FriendRequestActionKind;

readonly disabled: boolean;

readonly ariaLabel: string;

readonly dataTestid: string;
}

export interface ResolveFriendRequestUiStateArgs {

readonly relationship: Relationship;

readonly localHookState: FriendRequestHookState;

readonly canFriendRequest: boolean;

readonly canUnfriend: boolean;
}

export const FRIEND_REQUEST_CTA_TESTIDS = {
send: "friend-request-cta-send",
outgoing: "friend-request-cta-outgoing",
incoming: "friend-request-cta-incoming",
friend: "friend-request-cta-friend",
blocked: "friend-request-cta-blocked",
pending: "friend-request-cta-pending",
error: "friend-request-cta-error",
retry: "friend-request-cta-retry",
} as const;

export function resolveFriendRequestUiState(
args: ResolveFriendRequestUiStateArgs,
): FriendRequestUiState {
const { relationship, localHookState, canFriendRequest, canUnfriend } = args;

if (localHookState === "pending") {
return {
label: "Sending…",
icon: "Loader",
onClick: null,
disabled: true,
ariaLabel: "Sending friend request",
dataTestid: FRIEND_REQUEST_CTA_TESTIDS.pending,
    };
  }

if (localHookState === "error") {
return {
label: "Retry",
icon: "RefreshCw",
onClick: "send",
disabled: false,
ariaLabel: "Retry sending friend request",
dataTestid: FRIEND_REQUEST_CTA_TESTIDS.retry,
    };
  }

switch (relationship) {
case "none":
return {
label: "Send Friend Request",
icon: "UserPlus",
onClick: "send",

disabled: !canFriendRequest,
ariaLabel: "Send friend request",
dataTestid: FRIEND_REQUEST_CTA_TESTIDS.send,
      };
case "outgoing_request":
return {
label: "Outgoing Request",
icon: "Clock",
onClick: "openCancel",
disabled: false,
ariaLabel: "Outgoing friend request",
dataTestid: FRIEND_REQUEST_CTA_TESTIDS.outgoing,
      };
case "incoming_request":
return {
label: "Accept / Decline",
icon: "UserCheck",
onClick: "openRespond",
disabled: false,
ariaLabel: "Respond to friend request",
dataTestid: FRIEND_REQUEST_CTA_TESTIDS.incoming,
      };
case "friend":
return {
label: "Friends",
icon: "UserCheck",
onClick: "openUnfriend",

disabled: !canUnfriend,
ariaLabel: "Unfriend",
dataTestid: FRIEND_REQUEST_CTA_TESTIDS.friend,
      };
case "blocked":
case "blocked_by":
case "self":
return {
label: "Unavailable",
icon: "Ban",
onClick: null,
disabled: true,
ariaLabel: "User is unavailable",
dataTestid: FRIEND_REQUEST_CTA_TESTIDS.blocked,
      };
case "following":
case "follower":

return {
label: "Unavailable",
icon: "Ban",
onClick: null,
disabled: true,
ariaLabel: "Friend request not available",
dataTestid: FRIEND_REQUEST_CTA_TESTIDS.blocked,
      };
default: {

const _exhaustive: never = relationship;
return _exhaustive;
    }
  }
}