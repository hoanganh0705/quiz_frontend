/**
 * `friend-request-state-machine.ts` — State machine types and runtime
 * helper for the friend-request CTA.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  Story 6.8.
 * Source ticket: TKT-6.8.F1 (types) + TKT-6.8.E1 (runtime).
 *
 * ## Purpose
 *
 * The single source of truth for translating the server-derived
 * `Relationship` value + the local hook state into a UI state for the
 * `FriendRequestCta`. The CTA component reads `resolveFriendRequestUiState`
 * and renders the matching label / icon / onClick handler.
 *
 * Hooks and list pages do NOT duplicate this mapping. Adding a new
 * relationship value is a one-line change in `resolveFriendRequestUiState`
 * below.
 *
 * ## Pure function
 *
 * `resolveFriendRequestUiState` is a pure function. It has no React
 * state, no SWR access, no side effects. The same input always produces
 * the same output.
 *
 * ## `friendshipId` hygiene
 *
 * The `onClick` callbacks returned by the state machine are abstract
 * action verbs (`send`, `openCancel`, `openRespond`, `openUnfriend`).
 * The CTA component owns the dialog state and the `friendshipId`; the
 * state machine never sees the `friendshipId` (it is not in the
 * input args).
 */

import type { Relationship } from "@/features/social/types";

// ─── Hook state ───────────────────────────────────────────────────────────

/**
 * The local hook state passed to the state machine. Mirrors the
 * `isPending` / `error` lifecycle of the four mutation hooks
 * (`useSendFriendRequest`, `useUnfriend`, etc.).
 */
export type FriendRequestHookState = "idle" | "pending" | "error";

// ─── Action kinds ─────────────────────────────────────────────────────────

/**
 * The action verb the CTA's `onClick` should invoke. The CTA component
 * is the only file that maps these verbs to actual hook calls.
 *
 * `null` is returned when the CTA is disabled (e.g. `pending` state,
 * `blocked` relationship, missing permissions).
 */
export type FriendRequestActionKind =
  | "send"
  | "openCancel"
  | "openRespond"
  | "openUnfriend"
  | null;

// ─── UI state ─────────────────────────────────────────────────────────────

/**
 * Stable Lucide icon identifiers used by the `FriendRequestCta`.
 * The discriminated union lets the CTA component exhaustively
 * resolve icons at compile time.
 */
export type FriendRequestCtaIcon =
  | "UserPlus"
  | "UserCheck"
  | "Clock"
  | "Ban"
  | "Loader"
  | "RefreshCw";

/**
 * The UI state for the `FriendRequestCta`. The component renders the
 * label, the icon, the onClick handler, and the disabled state
 * directly from this object.
 */
export interface FriendRequestUiState {
  /** Human-readable label rendered inside the button. */
  readonly label: string;
  /** Lucide icon identifier. Discriminated union — exhaustive switch. */
  readonly icon: FriendRequestCtaIcon;
  /**
   * The action the CTA should dispatch on click. `null` when the
   * button is disabled (e.g. `pending` state, `blocked` relationship).
   */
  readonly onClick: FriendRequestActionKind;
  /** Whether the CTA is disabled. */
  readonly disabled: boolean;
  /** Accessible label for screen readers. */
  readonly ariaLabel: string;
  /** Stable data-testid for QA automation. */
  readonly dataTestid: string;
}

/**
 * The arguments accepted by `resolveFriendRequestUiState`.
 */
export interface ResolveFriendRequestUiStateArgs {
  /** The server-derived `Relationship` value. */
  readonly relationship: Relationship;
  /** The local hook state for the active mutation. */
  readonly localHookState: FriendRequestHookState;
  /** Whether the viewer can send a friend request. */
  readonly canFriendRequest: boolean;
  /** Whether the viewer can unfriend the target. */
  readonly canUnfriend: boolean;
}

// ─── Mapping constants ────────────────────────────────────────────────────

/**
 * Stable data-testid values for the CTA. Exported so the QA suite
 * can reference them without stringly-typed lookups.
 */
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

// ─── Runtime ──────────────────────────────────────────────────────────────

/**
 * Resolve the UI state for the `FriendRequestCta`.
 *
 * The mapping table is exhaustive over `Relationship` × `FriendRequestHookState`.
 *
 * Mapping rules:
 *
 *   - `Relationship` `none` + `idle` → "Send Friend Request" (send)
 *   - `Relationship` `outgoing_request` + `idle` → "Outgoing Request" (openCancel)
 *   - `Relationship` `incoming_request` + `idle` → "Accept / Decline" (openRespond)
 *   - `Relationship` `friend` + `idle` → "Friends" (openUnfriend)
 *   - `Relationship` `blocked` + `idle` → "Unavailable" (disabled, no onClick)
 *   - `Relationship` `self` + `idle` → "Unavailable" (disabled, no onClick)
 *   - `Relationship` `blocked_by` + `idle` → "Unavailable" (disabled, no onClick)
 *   - `Relationship` `following` / `follower` + `idle` → "Unavailable" (no friend CTA yet)
 *   - `localHookState` `pending` → "Sending…" / "Unfriending…" (disabled)
 *   - `localHookState` `error` → "Retry" (send — retry last action)
 *
 * @param args The server-derived `Relationship` + local hook state +
 *             permission flags.
 * @returns The UI state for the CTA.
 */
export function resolveFriendRequestUiState(
  args: ResolveFriendRequestUiStateArgs,
): FriendRequestUiState {
  const { relationship, localHookState, canFriendRequest, canUnfriend } = args;

  // Pending state wins over everything — the button is locked while the
  // mutation is in-flight.
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

  // Error state shows the retry CTA — the only onClick that fires.
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

  // Idle state — branch on the relationship value.
  switch (relationship) {
    case "none":
      return {
        label: "Send Friend Request",
        icon: "UserPlus",
        onClick: "send",
        // Disabled when the permission gate denies the action.
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
        // Disabled when the permission gate denies the action.
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
      // Bidirectional follow relationship without friendship — the
      // friend CTA is not yet available. The follow CTA (Epic 6.6)
      // owns this state.
      return {
        label: "Unavailable",
        icon: "Ban",
        onClick: null,
        disabled: true,
        ariaLabel: "Friend request not available",
        dataTestid: FRIEND_REQUEST_CTA_TESTIDS.blocked,
      };
    default: {
      // Exhaustiveness — adding a new `Relationship` value without
      // updating this switch will fail TypeScript at compile time.
      const _exhaustive: never = relationship;
      return _exhaustive;
    }
  }
}