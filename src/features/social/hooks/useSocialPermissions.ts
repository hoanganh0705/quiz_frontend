"use client";

/**
 * `useSocialPermissions` — derive UI permissions from the relationship
 * status between the viewer and a target user.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.D2.
 *
 * ## What this hook owns
 *
 * - Derive a stable permission set (`canFollow`, `canUnfollow`,
 *   `canFriendRequest`, `canCancelRequest`, `canRespond`,
 *   `canUnfriend`, `canBlock`, `canUnblock`) from the
 *   `Relationship` value returned by `useRelationship`.
 * - Surface the cross-cutting identity flags (`isSelf`,
 *   `isAuthenticated`) so consumers can branch on a single object
 *   rather than re-reading `useAuthBootstrap`.
 * - The strictest permission set is returned when the relationship
 *   is unknown (loading) or when the viewer is unauthenticated —
 *   the client never grants a permission based on local state alone.
 *
 * ## Server authority
 *
 * `Relationship` is server-derived (see `useRelationship`). The
 * permission set is therefore also server-derived; the hook is a pure
 * derivation. Components that misread the relationship cannot
 * accidentally grant a permission because every unknown relationship
 * returns the strictest (no-action) set.
 */

import { useMemo } from "react";

import { useRelationship } from "@/features/social/hooks/useRelationship";
import type { Relationship } from "@/features/social/types";

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * The permission set consumed by every social CTA and the
 * `SelfActionGate` primitive.
 *
 * Field semantics:
 *   - `canFollow`     — viewer can start following the target.
 *   - `canUnfollow`   — viewer can stop following the target.
 *   - `canFriendRequest` — viewer can send a friend request.
 *   - `canCancelRequest` — viewer can cancel their own pending request.
 *   - `canRespond`    — viewer can accept / decline a received request.
 *   - `canUnfriend`   — viewer can remove an existing friendship.
 *   - `canBlock`      — viewer can block the target.
 *   - `canUnblock`    — viewer can unblock the target.
 *   - `isSelf`        — the target is the viewer.
 *   - `isAuthenticated` — the viewer is signed in.
 */
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

/**
 * The strictest permission set — no action permitted. Used both for
 * the unauthenticated case and as a frozen base for every derivation.
 */
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

/**
 * Pure permission resolver.
 *
 * Given a server-derived `Relationship` value plus the cross-cutting
 * identity flags, compute the permission bitmask. The function is
 * pure — it has no side effects and does not read from React context.
 *
 * Permission rules (one row per documented `Relationship` value):
 *
 *   - `self`             → all `false` (you cannot act on yourself).
 *   - `none`             → `canFollow`, `canFriendRequest`, `canBlock` `true`.
 *   - `following`        → `canUnfollow` `true`.
 *   - `follower`         → `canFollow`, `canFriendRequest`, `canBlock` `true`.
 *   - `friend`           → `canUnfriend`, `canBlock` `true`.
 *   - `outgoing_request` → `canCancelRequest` `true`.
 *   - `incoming_request` → `canRespond` `true`.
 *   - `blocked`          → `canUnblock` `true`.
 *   - `blocked_by`       → all `false` (the target has blocked the
 *                          viewer; any action would be rejected by
 *                          the backend anyway).
 */
export function resolveSocialPermissions(args: {
  relationship: Relationship;
  isSelf: boolean;
  isAuthenticated: boolean;
}): UseSocialPermissionsResult {
  const { relationship, isSelf, isAuthenticated } = args;

  if (!isAuthenticated || isSelf) {
    return { ...STRICTEST_PERMISSIONS, isSelf, isAuthenticated };
  }

  // `blocked_by` is terminal — the backend will reject any action.
  if (relationship === "blocked_by") {
    return { ...STRICTEST_PERMISSIONS, isAuthenticated: true };
  }

  switch (relationship) {
    case "self":
      // Defensive: `useRelationship` short-circuits to `self` only
      // when the target equals the viewer. The strictest set is the
      // safe default.
      return { ...STRICTEST_PERMISSIONS, isSelf: true, isAuthenticated: true };
    case "none":
    case "follower":
      // The viewer can act on a stranger or on someone who follows them.
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
      // The viewer is already following — only unfollow is permitted.
      // Sending a friend request while already following is a
      // backend-level concern; the UI should not expose the CTA.
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
      // Bidirectional friendship — viewer can unfriend or block.
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
      // Viewer sent a request — they can cancel it. Blocking is
      // intentionally hidden here: the dominant user expectation is
      // to wait for the addressee's response or cancel the existing
      // request.
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
      // Viewer received a request — they can accept or decline.
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
      // Viewer has blocked the target — only unblock is permitted.
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

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseSocialPermissionsOptions {
  /**
   * Optional override for the current user id. Tests inject this to
   * keep the test pure; production callers omit it so the hook reads
   * from `useAuthBootstrap` (via `useRelationship`).
   */
  currentUserId?: string | null;
}

export function useSocialPermissions(
  targetUserId: string | null,
  options: UseSocialPermissionsOptions = {},
): UseSocialPermissionsResult {
  // The hook delegates the relationship fetch to `useRelationship`. We
  // do not duplicate the auth / flag / short-circuit logic — we trust
  // the read hook as the single source of truth.
  const relationship = useRelationship(targetUserId, {
    currentUserId: options.currentUserId ?? null,
  });

  // `isSelf` is derived from the relationship value: `useRelationship`
  // short-circuits to `Relationship.self` when target === viewer. The
  // hook also surfaces `isAuthenticated` directly so we do not need to
  // re-read the auth bootstrap.
  const isSelf = relationship.relationship === "self";

  return useMemo<UseSocialPermissionsResult>(() => {
    return resolveSocialPermissions({
      relationship: relationship.relationship,
      isSelf,
      isAuthenticated: relationship.isAuthenticated,
    });
  }, [relationship.relationship, relationship.isAuthenticated, isSelf]);
}
