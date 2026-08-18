

import type { ErrorCode } from "@/lib/api/error-codes";

export type FollowErrorCode =
| "SOCIAL_ALREADY_FOLLOWING"
  | "SOCIAL_SELF_FOLLOW"
  | "SOCIAL_USER_BLOCKED"
  | "SOCIAL_BLOCKED_USER"
  | ErrorCode;

export interface FollowErrorCopyEntry {

readonly message: string;

readonly retryable: boolean;
}

const COPY_TABLE: Readonly<Partial<Record<FollowErrorCode, FollowErrorCopyEntry>>> =
Object.freeze({

"SOCIAL_ALREADY_FOLLOWING": {
message: "You're already following this user.",
retryable: false,
    },
"SOCIAL_SELF_FOLLOW": {
message: "You can't follow yourself.",
retryable: false,
    },
"SOCIAL_USER_BLOCKED": {
message: "You can't follow this user.",
retryable: false,
    },
"SOCIAL_BLOCKED_USER": {
message: "This user has blocked you.",
retryable: false,
    },
"SOCIAL_FOLLOW_NOT_FOUND": {

message: "You're not following this user.",
retryable: false,
    },
"SOCIAL_PENDING_REQUEST_EXISTS": {
message: "A friend request is already pending.",
retryable: false,
    },
"SOCIAL_ALREADY_FRIENDS": {
message: "You're already friends with this user.",
retryable: false,
    },

"GLOBAL_UNAUTHENTICATED": {
message: "Sign in to follow users.",
retryable: false,
    },
"GLOBAL_RATE_LIMITED": {
message: "You're doing that too much. Please wait a moment and try again.",
retryable: true,
    },
"GLOBAL_INTERNAL_ERROR": {
message: "Something went wrong. Please try again.",
retryable: true,
    },

NETWORK_ERROR: {
message: "Network error. Check your connection and try again.",
retryable: true,
    },
  });

export function getFollowErrorCopy(code: FollowErrorCode): FollowErrorCopyEntry | undefined {
return COPY_TABLE[code];
}

export function isFollowErrorRetryable(code: FollowErrorCode): boolean {
return COPY_TABLE[code]?.retryable ?? false;
}

export function getFollowErrorMessage(code: FollowErrorCode): string {
return COPY_TABLE[code]?.message ?? code;
}
