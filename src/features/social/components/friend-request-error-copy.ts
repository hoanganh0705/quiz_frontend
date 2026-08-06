/**
 * `friend-request-error-copy.ts` — Friend-request error code → user-facing
 * copy registry.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.F3.
 *
 * ## Purpose
 *
 * Maps every error code that the four friend-request mutation hooks
 * (`useSendFriendRequest`, `useRespondFriendRequest`,
 * `useCancelFriendRequest`, `useUnfriend`) can emit (via `ApiError.code`)
 * to user-visible copy with `{ title, description, actionLabel?, dataTestid }`
 * shape. Consumed exclusively by `FriendRequestErrorBanner` (TKT-6.8.E10).
 *
 * ## Error code taxonomy
 *
 * Friend-request mutations can emit four classes of error:
 *
 *   1. Domain social codes — `SOCIAL_*` (from `ErrorCode`).
 *   2. Synthesized global codes — `GLOBAL_*` (from `ErrorCode`).
 *   3. Transport-level codes outside the SOCIAL set.
 *   4. `NETWORK_ERROR` — a synthetic sentinel for a fetch-level failure
 *      where the response was not HTTP.
 *
 * ## Non-idempotent DELETE handling (copy semantics)
 *
 * `SOCIAL_FRIEND_REQUEST_NOT_FOUND` and `SOCIAL_FRIENDSHIP_NOT_FOUND` are
 * documented as "treated as successful terminal state" in the hook
 * implementations. The hook short-circuits the error before surfacing it
 * to the caller, so the banner should never actually appear. The copy
 * entries for these two codes document the user-visible outcome (the
 * action had no effect) so a future regression does not surface a
 * misleading error banner.
 *
 * ## Render-side shape
 *
 * The registry exposes `title`, `description`, optional `actionLabel`
 * (used to render a retry button on retryable codes), and `dataTestid`
 * for QA automation. The component reads from the registry; no copy is
 * hardcoded in the component.
 */

import type { ErrorCode } from "@/lib/api/error-codes";

// ─── Friend-request specific error code union ────────────────────────────

/**
 * Every error code that the four friend-request mutation hooks can
 * surface via `ApiError.code`. `NETWORK_ERROR` is a synthetic sentinel
 * for non-HTTP fetch failures.
 */
export type FriendRequestErrorCode =
  | "SOCIAL_FRIEND_REQUEST_NOT_FOUND"
  | "SOCIAL_FRIEND_REQUEST_FORBIDDEN"
  | "SOCIAL_SELF_FRIEND_REQUEST"
  | "SOCIAL_FRIENDSHIP_NOT_FOUND"
  | "SOCIAL_USER_BLOCKED"
  | "SOCIAL_BLOCKED_USER"
  | ErrorCode;

// ─── Entry shape ────────────────────────────────────────────────────────

export interface FriendRequestErrorCopy {
  /**
   * Short heading shown to the user. Should describe the category of
   * failure ("Couldn't send friend request" / "Action couldn't complete")
   * not the HTTP semantics.
   */
  readonly title: string;
  /**
   * One-sentence explanation of the error and (where useful) the user
   * action that can resolve it. Avoids HTTP codes.
   */
  readonly description: string;
  /**
   * Optional label for a retry / primary action button. When `null`
   * the banner renders without an action button — used for terminal /
   * non-retryable codes.
   */
  readonly actionLabel: string | null;
  /**
   * Stable `data-testid` value for QA automation. Format:
   * `friend-request-error.{code}` (lower-snake).
   */
  readonly dataTestid: string;
}

// ─── Registry ───────────────────────────────────────────────────────────

/**
 * Stable id generator for the `data-testid` field.
 */
function testidFor(code: string): string {
  const slug = code.toLowerCase().replace(/_/g, "-");
  return `friend-request-error.${slug}`;
}

/**
 * Maps every documented `FriendRequestErrorCode` to user-visible copy.
 *
 * Sentinel rows for the two non-idempotent DELETE terminal codes:
 *
 *   - `SOCIAL_FRIEND_REQUEST_NOT_FOUND`
 *   - `SOCIAL_FRIENDSHIP_NOT_FOUND`
 *
 * The hooks (`useCancelFriendRequest`, `useUnfriend`) short-circuit
 * these codes before they reach the banner, so the copy entries here
 * are defensive only. The `title` documents "Action completed" — the
 * user-visible outcome — to discourage a future regression from
 * surfacing a misleading error.
 */
const COPY_TABLE: Readonly<
  Partial<Record<FriendRequestErrorCode, FriendRequestErrorCopy>>
> = Object.freeze({
  // ── Domain social codes ─────────────────────────────────────────────
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

  // ── Global synthesized codes ───────────────────────────────────────
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

  // ── NETWORK_ERROR sentinel (non-HTTP fetch failure) ────────────────
  NETWORK_ERROR: {
    title: "Network error",
    description: "Check your connection and try again.",
    actionLabel: "Try again",
    dataTestid: testidFor("NETWORK_ERROR"),
  },
});

// ─── Generic fallback ───────────────────────────────────────────────────

const GENERIC_FALLBACK: FriendRequestErrorCopy = Object.freeze({
  title: "Something went wrong",
  description: "Please try again.",
  actionLabel: "Try again",
  dataTestid: testidFor("GENERIC"),
});

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * The full registry, exported as `Readonly<Record<string, FriendRequestErrorCopy>>`.
 *
 * The key set widens past `FriendRequestErrorCode` to also include the
 * `NETWORK_ERROR` sentinel (which is not part of the `ErrorCode` union
 * — it is the synthetic code for non-HTTP fetch failures).
 */
export const FRIEND_REQUEST_ERROR_COPY: Readonly<
  Record<string, FriendRequestErrorCopy>
> = Object.freeze(COPY_TABLE as Record<string, FriendRequestErrorCopy>);

/**
 * Returns the copy entry for a `FriendRequestErrorCode`, falling back
 * to the generic fallback for unknown codes.
 *
 * The fallback ensures the banner always renders coherent copy — never
 * a blank panel or a raw error string.
 */
export function getFriendRequestErrorCopy(
  code: ErrorCode | string,
): FriendRequestErrorCopy {
  return (
    (COPY_TABLE as Partial<Record<string, FriendRequestErrorCopy>>)[
      code as string
    ] ?? GENERIC_FALLBACK
  );
}

/**
 * Returns `true` when the given error code has an action label
 * (i.e. is conceptually retryable from the user's perspective).
 * Used by `FriendRequestErrorBanner` to decide whether to render the
 * action button.
 *
 * Unknown codes fall back to the generic copy, which IS retryable
 * ("Try again") — so this function returns `true` for unknown codes
 * to match the banner's rendering rules.
 */
export function isFriendRequestErrorRetryable(code: ErrorCode | string): boolean {
  const entry = (COPY_TABLE as Partial<Record<string, FriendRequestErrorCopy>>)[
    code as string
  ];
  // Found entry: defer to its actionLabel.
  if (entry !== undefined) {
    return entry.actionLabel !== null;
  }
  // Unknown code: fall back to the generic copy, which has a
  // retryable action label ("Try again").
  return GENERIC_FALLBACK.actionLabel !== null;
}

/**
 * Returns the human-readable title for the given code, or the
 * generic fallback title. Convenience wrapper.
 */
export function getFriendRequestErrorTitle(code: ErrorCode | string): string {
  return getFriendRequestErrorCopy(code).title;
}

/**
 * Returns the human-readable description for the given code, or the
 * generic fallback description. Convenience wrapper.
 */
export function getFriendRequestErrorDescription(
  code: ErrorCode | string,
): string {
  return getFriendRequestErrorCopy(code).description;
}
