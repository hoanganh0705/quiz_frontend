/**
 * `block-error-copy.ts` — Block/Unblock error code → user-facing copy registry.
 *
 * Source epic:   Epic 6.7 — Block and Unblock with Bidirectional Side
 *                Effects.
 * Source story:  Story 6.7.
 * Source ticket: TKT-6.7.F2.
 *
 * ## Purpose
 *
 * Maps every error code that `useBlock` or `useUnblock` can emit (via
 * `ApiError.code`) to user-visible copy and a retry eligibility flag.
 * Consumed exclusively by `BlockErrorBanner` (TKT-6.7.E1) and the
 * inline error surface on `BlockedUsersListPage` (TKT-6.7.E2).
 *
 * ## Error code taxonomy
 *
 * Block/unblock mutations can emit three classes of error:
 *
 *   1. Domain social codes — `SOCIAL_*` (from `ErrorCode`).
 *   2. Synthesized global codes — `GLOBAL_*` (from `ErrorCode`).
 *   3. `NETWORK_ERROR` — a synthetic sentinel for a fetch-level failure
 *      where the response was not HTTP. Same convention as
 *      `follow-error-copy.ts`.
 *
 * Retry is offered only for transient errors:
 *
 *   Retryable      — `GLOBAL_RATE_LIMITED`, `NETWORK_ERROR`,
 *                    `GLOBAL_INTERNAL_ERROR`
 *   Not retryable  — all `SOCIAL_*` codes, `GLOBAL_UNAUTHENTICATED`
 *
 * ## Bidirectional-block copy
 *
 * `SOCIAL_USER_BLOCKED` and `SOCIAL_BLOCKED_USER` map to copy that
 * explains the bidirectionality in plain language — the user knows
 * why the action failed without having to consult documentation.
 *
 * ## Code-name alignment vs planning ticket
 *
 * The planning ticket named `SOCIAL_ALREADY_BLOCKED`, `SOCIAL_SELF_BLOCK`,
 * and `SOCIAL_BLOCK_NOT_FOUND`. The actual codebase ships
 * `SOCIAL_BLOCKED_USER`, `SOCIAL_USER_BLOCKED`, and
 * `SOCIAL_USER_NOT_BLOCKED`. The self-block case is enforced client-side
 * via `useSocialPermissions.canBlock` (the hook returns no-op when
 * `canBlock === false`), so a `SOCIAL_SELF_BLOCK` code is not surfaced
 * in practice. The unblock 404 code is `SOCIAL_USER_NOT_BLOCKED`.
 */

import type { ErrorCode } from "@/lib/api/error-codes";

// ─── Block-specific error code union ──────────────────────────────────

/**
 * Every error code that `useBlock` or `useUnblock` can surface via
 * `ApiError.code`. `NETWORK_ERROR` is a synthetic sentinel for
 * non-HTTP fetch failures.
 */
export type BlockErrorCode =
  | "SOCIAL_BLOCKED_USER"
  | "SOCIAL_USER_BLOCKED"
  | "SOCIAL_USER_NOT_BLOCKED"
  | ErrorCode; // covers all GLOBAL_* + remaining SOCIAL_* + future codes

// ─── Entry shape ───────────────────────────────────────────────────────

export interface BlockErrorCopyEntry {
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
 * Maps every relevant `BlockErrorCode` to its copy and retry eligibility.
 *
 * The lookup order matters: domain codes are checked before the
 * catch-all `ErrorCode` key (which covers `GLOBAL_*` codes via the
 * `ErrorCode` union). `NETWORK_ERROR` is a standalone string sentinel
 * not in `ErrorCode`.
 */
const COPY_TABLE: Readonly<Partial<Record<BlockErrorCode, BlockErrorCopyEntry>>> =
  Object.freeze({
    // ── Domain social codes (not retryable) ──────────────────────────
    "SOCIAL_BLOCKED_USER": {
      message: "You've already blocked this user.",
      retryable: false,
    },
    "SOCIAL_USER_BLOCKED": {
      message: "This user has blocked you.",
      retryable: false,
    },
    "SOCIAL_USER_NOT_BLOCKED": {
      // Normalised state: the user is already not-blocked.
      // Shown only if the server returns this unexpectedly.
      message: "This user isn't blocked.",
      retryable: false,
    },

    // ── Global synthesized codes (selectively retryable) ─────────────
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

    // ── NETWORK_ERROR sentinel (non-HTTP fetch failure) ───────────────
    NETWORK_ERROR: {
      message: "Network error. Check your connection and try again.",
      retryable: true,
    },
  });

/**
 * Returns the copy entry for a `BlockErrorCode`, or `undefined` if the
 * code is not in the table. Callers should guard with `COPY_TABLE[code]`
 * before rendering.
 */
export function getBlockErrorCopy(code: BlockErrorCode): BlockErrorCopyEntry | undefined {
  return COPY_TABLE[code];
}

/**
 * Returns the user-visible copy string for any `ErrorCode` (the
 * superset, including `NETWORK_ERROR` via the wider `BlockErrorCode`
 * union). Unknown codes return a generic fallback. This is the
 * primary public accessor required by TKT-6.7.F2 §8.
 */
export function getBlockErrorCopyString(code: ErrorCode): string {
  return COPY_TABLE[code as BlockErrorCode]?.message
    ?? "Something went wrong. Please try again.";
}

/**
 * Returns `true` when the given error code is retryable.
 * Convenience wrapper used by `BlockErrorBanner`.
 */
export function isBlockErrorRetryable(code: BlockErrorCode): boolean {
  return COPY_TABLE[code]?.retryable ?? false;
}

/**
 * Returns the human-readable message for a `BlockErrorCode`.
 * Falls back to a generic message for unknown codes.
 */
export function getBlockErrorMessage(code: BlockErrorCode): string {
  return COPY_TABLE[code]?.message ?? "Something went wrong. Please try again.";
}