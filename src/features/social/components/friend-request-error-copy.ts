

import type { ErrorCode } from "@/lib/api/error-codes";

export type FriendRequestErrorCode =
| "SOCIAL_FRIEND_REQUEST_NOT_FOUND"
  | "SOCIAL_FRIEND_REQUEST_FORBIDDEN"
  | "SOCIAL_SELF_FRIEND_REQUEST"
  | "SOCIAL_FRIENDSHIP_NOT_FOUND"
  | "SOCIAL_USER_BLOCKED"
  | "SOCIAL_BLOCKED_USER"
  | ErrorCode;

export interface FriendRequestErrorCopy {

readonly title: string;

readonly description: string;

readonly actionLabel: string | null;

readonly dataTestid: string;
}

function testidFor(code: string): string {
const slug = code.toLowerCase().replace(/_/g, "-");
return `friend-request-error.${slug}`;
}

const COPY_TABLE: Readonly<
Partial<Record<FriendRequestErrorCode, FriendRequestErrorCopy>>
> = Object.freeze({

"SOCIAL_FRIEND_REQUEST_NOT_FOUND": {
title: "Action completed",
description:
"This friend request is no longer pending. The recipient may have already responded.",
actionLabel: null,
dataTestid: testidFor("SOCIAL_FRIEND_REQUEST_NOT_FOUND"),
  },
"SOCIAL_FRIEND_REQUEST_FORBIDDEN": {
title: "Action not allowed",
description:
"You don't have permission to perform this action on this friend request.",
actionLabel: null,
dataTestid: testidFor("SOCIAL_FRIEND_REQUEST_FORBIDDEN"),
  },
"SOCIAL_SELF_FRIEND_REQUEST": {
title: "Can't send to yourself",
description: "You cannot send a friend request to yourself.",
actionLabel: null,
dataTestid: testidFor("SOCIAL_SELF_FRIEND_REQUEST"),
  },
"SOCIAL_FRIENDSHIP_NOT_FOUND": {
title: "Action completed",
description:
"You're no longer friends with this user. The friendship may have ended already.",
actionLabel: null,
dataTestid: testidFor("SOCIAL_FRIENDSHIP_NOT_FOUND"),
  },
"SOCIAL_USER_BLOCKED": {
title: "Can't complete action",
description: "You can't act on this user. They have blocked you.",
actionLabel: null,
dataTestid: testidFor("SOCIAL_USER_BLOCKED"),
  },
"SOCIAL_BLOCKED_USER": {
title: "Action not allowed",
description: "Unblock this user to send them a friend request.",
actionLabel: null,
dataTestid: testidFor("SOCIAL_BLOCKED_USER"),
  },
"SOCIAL_ALREADY_FRIENDS": {
title: "Already friends",
description: "You're already friends with this user.",
actionLabel: null,
dataTestid: testidFor("SOCIAL_ALREADY_FRIENDS"),
  },
"SOCIAL_PENDING_REQUEST_EXISTS": {
title: "Request already pending",
description:
"A friend request is already pending. Cancel it before sending a new one.",
actionLabel: null,
dataTestid: testidFor("SOCIAL_PENDING_REQUEST_EXISTS"),
  },
"SOCIAL_FRIEND_LIST_FORBIDDEN": {
title: "Not available",
description: "You don't have permission to view this.",
actionLabel: null,
dataTestid: testidFor("SOCIAL_FRIEND_LIST_FORBIDDEN"),
  },

"GLOBAL_UNAUTHENTICATED": {
title: "Sign in required",
description: "Please sign in to manage friend requests.",
actionLabel: null,
dataTestid: testidFor("GLOBAL_UNAUTHENTICATED"),
  },
"GLOBAL_FORBIDDEN": {
title: "Action not allowed",
description: "You don't have permission to perform this action.",
actionLabel: null,
dataTestid: testidFor("GLOBAL_FORBIDDEN"),
  },
"GLOBAL_RATE_LIMITED": {
title: "You're going too fast",
description: "Please wait a moment and try again.",
actionLabel: "Try again",
dataTestid: testidFor("GLOBAL_RATE_LIMITED"),
  },
"GLOBAL_INTERNAL_ERROR": {
title: "Something went wrong",
description: "Please try again.",
actionLabel: "Try again",
dataTestid: testidFor("GLOBAL_INTERNAL_ERROR"),
  },
"GLOBAL_NOT_FOUND": {
title: "Not found",
description: "We couldn't find what you were looking for.",
actionLabel: null,
dataTestid: testidFor("GLOBAL_NOT_FOUND"),
  },
"GLOBAL_BAD_REQUEST": {
title: "Invalid request",
description: "Please refresh the page and try again.",
actionLabel: null,
dataTestid: testidFor("GLOBAL_BAD_REQUEST"),
  },
"GLOBAL_CONFLICT": {
title: "Conflict",
description: "The state changed while you were interacting. Refresh to retry.",
actionLabel: "Refresh",
dataTestid: testidFor("GLOBAL_CONFLICT"),
  },

NETWORK_ERROR: {
title: "Network error",
description: "Check your connection and try again.",
actionLabel: "Try again",
dataTestid: testidFor("NETWORK_ERROR"),
  },
});

const GENERIC_FALLBACK: FriendRequestErrorCopy = Object.freeze({
title: "Something went wrong",
description: "Please try again.",
actionLabel: "Try again",
dataTestid: testidFor("GENERIC"),
});

export const FRIEND_REQUEST_ERROR_COPY: Readonly<
Record<string, FriendRequestErrorCopy>
> = Object.freeze(COPY_TABLE as Record<string, FriendRequestErrorCopy>);

export function getFriendRequestErrorCopy(
code: ErrorCode | string,
): FriendRequestErrorCopy {
return (
(COPY_TABLE as Partial<Record<string, FriendRequestErrorCopy>>)[
code as string
    ] ?? GENERIC_FALLBACK
  );
}

export function isFriendRequestErrorRetryable(code: ErrorCode | string): boolean {
const entry = (COPY_TABLE as Partial<Record<string, FriendRequestErrorCopy>>)[
code as string
  ];

if (entry !== undefined) {
return entry.actionLabel !== null;
  }

return GENERIC_FALLBACK.actionLabel !== null;
}

export function getFriendRequestErrorTitle(code: ErrorCode | string): string {
return getFriendRequestErrorCopy(code).title;
}

export function getFriendRequestErrorDescription(
code: ErrorCode | string,
): string {
return getFriendRequestErrorCopy(code).description;
}
