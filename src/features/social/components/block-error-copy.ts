

import type { ErrorCode } from "@/lib/api/error-codes";

export type BlockErrorCode =
| "SOCIAL_BLOCKED_USER"
  | "SOCIAL_USER_BLOCKED"
  | "SOCIAL_USER_NOT_BLOCKED"
  | ErrorCode;

export interface BlockErrorCopyEntry {

readonly message: string;

readonly retryable: boolean;
}

const COPY_TABLE: Readonly<Partial<Record<BlockErrorCode, BlockErrorCopyEntry>>> =
Object.freeze({

"SOCIAL_BLOCKED_USER": {
message: "You've already blocked this user.",
retryable: false,
    },
"SOCIAL_USER_BLOCKED": {
message: "This user has blocked you.",
retryable: false,
    },
"SOCIAL_USER_NOT_BLOCKED": {

message: "This user isn't blocked.",
retryable: false,
    },

"GLOBAL_UNAUTHENTICATED": {
message: "Sign in to block users.",
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

export function getBlockErrorCopy(code: BlockErrorCode): BlockErrorCopyEntry | undefined {
return COPY_TABLE[code];
}

export function getBlockErrorCopyString(code: ErrorCode): string {
return COPY_TABLE[code as BlockErrorCode]?.message
?? "Something went wrong. Please try again.";
}

export function isBlockErrorRetryable(code: BlockErrorCode): boolean {
return COPY_TABLE[code]?.retryable ?? false;
}

export function getBlockErrorMessage(code: BlockErrorCode): string {
return COPY_TABLE[code]?.message ?? "Something went wrong. Please try again.";
}