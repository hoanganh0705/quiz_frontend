/**
 * `follow-error-copy.ts` — Follow/Unfollow error code → user-facing copy registry.
 *
 * Source epic:   Epic 6.6 — Follow and Unfollow Mutations.
 * Source story:  Story 6.6.
 * Source ticket: TKT-6.6.E4.
 *
 * ## Purpose
 *
 * Maps every error code that `useFollow` or `useUnfollow` can emit (via
 * `ApiError.code`) to user-visible copy and a retry eligibility flag.
 * Consumed exclusively by `FollowErrorBanner` — no other file imports
 * this registry.
 *
 * ## Error code taxonomy
 *
 * Follow/unfollow mutations can emit three classes of error:
 *
 *   1. Domain social codes — `SOCIAL_*` (from `ErrorCode`).
 *   2. Synthesized global codes — `GLOBAL_*` (from `ErrorCode`).
 *   3. `NETWORK_ERROR` — a synthetic sentinel for a fetch-level failure
 *      where the response was not HTTP (e.g. offline). We use the literal
 *      string `"NETWORK_ERROR"` because `ApiError` has no `.code` in this
 *      case; callers pass the sentinel explicitly.
 *
 * Retry is offered only for transient errors that the user may be able
 * to resolve by retrying:
 *
 *   Retryable  — `GLOBAL_RATE_LIMITED`, `NETWORK_ERROR`, `GLOBAL_INTERNAL_ERROR`
 *   Not retryable — all `SOCIAL_*` codes, `GLOBAL_UNAUTHENTICATED`
 */

import type { ErrorCode } from "@/lib/api/error-codes";

// ─── Follow-specific error code union ──────────────────────────────────

/**
 * Every error code that `useFollow` or `useUnfollow` can surface via
 * `ApiError.code`. `NETWORK_ERROR` is a synthetic sentinel for
 * non-HTTP fetch failures.
 */
export type FollowErrorCode =
  | "SOCIAL_ALREADY_FOLLOWING"
  | "SOCIAL_SELF_FOLLOW"
  | "SOCIAL_USER_BLOCKED"
  | "SOCIAL_BLOCKED_USER"
  | ErrorCode; // covers all GLOBAL_* + remaining SOCIAL_* + future codes

// ─── Entry shape ───────────────────────────────────────────────────────

export interface FollowErrorCopyEntry {
  /** Human-readable message shown in the banner body. */
  readonly message: string;
  /**
   * Whether the user should be offered a retry button.
   * `true` for transient errors only.
   */
  readonly retryable: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────

/**
 * Maps every relevant `FollowErrorCode` to its copy and retry eligibility.
 *
 * The lookup order matters: domain codes are checked before the
 * catch-all `ErrorCode` key (which covers `GLOBAL_*` codes via the
 * `ErrorCode` union). `NETWORK_ERROR` is a standalone string sentinel
 * not in `ErrorCode`.
 */
const COPY_TABLE: Readonly<Partial<Record<FollowErrorCode, FollowErrorCopyEntry>>> =
  Object.freeze({
    // ── Domain social codes (not retryable) ──────────────────────────
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
      // Normalised state: the user is already not-following.
      // Shown only if the server returns this unexpectedly.
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

    // ── Global synthesized codes (selectively retryable) ─────────────
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

    // ── NETWORK_ERROR sentinel (non-HTTP fetch failure) ───────────────
    NETWORK_ERROR: {
      message: "Network error. Check your connection and try again.",
      retryable: true,
    },
  });

/**
 * Returns the copy entry for a `FollowErrorCode`, or `undefined` if the
 * code is not in the table. Callers should guard with `COPY_TABLE[code]`
 * before rendering.
 */
export function getFollowErrorCopy(code: FollowErrorCode): FollowErrorCopyEntry | undefined {
  return COPY_TABLE[code];
}

/**
 * Returns `true` when the given error code is retryable.
 * Convenience wrapper used by `FollowErrorBanner`.
 */
export function isFollowErrorRetryable(code: FollowErrorCode): boolean {
  return COPY_TABLE[code]?.retryable ?? false;
}

/**
 * Returns the human-readable message for a `FollowErrorCode`.
 * Falls back to the code itself (never shown in practice — callers guard
 * before rendering).
 */
export function getFollowErrorMessage(code: FollowErrorCode): string {
  return COPY_TABLE[code]?.message ?? code;
}
