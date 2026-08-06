"use client";

/**
 * `SelfActionGate` — Hide action CTAs (follow / block / friend-request)
 * when the target user is the viewer themselves.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views
 *                (followers / following / friends / blocked).
 * Source ticket: TKT-6.2.D2 (relationship-dependent privacy gate).
 *
 * ## Purpose
 *
 * Self-action CTAs ("Follow yourself", "Block yourself") make no
 * sense and would surface confusing UX. The gate prevents that by
 * rendering only the children when the target user id differs from
 * the viewer's id, and the fallback otherwise.
 *
 * The viewer's id is read from the auth bootstrap context's
 * `currentUser.userId` field, which is the canonical Phase 2 / 6
 * identity source. If the auth bootstrap is not yet resolved, the
 * gate renders the children (i.e. does not hide the CTA) — the
 * backend will still reject a self-follow with
 * `SOCIAL_SELF_FRIEND_REQUEST` / `SOCIAL_FOLLOW_NOT_FOUND`, so
 * favouring visibility over hiding when the identity is unknown
 * avoids a flicker.
 *
 * ## Why a separate gate
 *
 * Mirrors the `BlockedContentGate` reasoning — a single privacy /
 * identity gate is easier to reason about and easier to lint
 * against than inline `if (userId !== currentUser.userId)` checks.
 *
 * ## SSR-safety
 *
 * The gate is a Client Component because `useAuthBootstrap` reads
 * from a React context that is only mounted at the client root.
 */

import type { ReactNode } from "react";

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";

interface SelfActionGateProps {
  /**
   * The target user id the action is aimed at. The gate renders
   * `children` only when this differs from the viewer's id.
   */
  targetUserId: string;
  /** The action UI rendered when the target is someone else. */
  children: ReactNode;
  /**
   * Optional fallback rendered when the target is the viewer. The
   * default is `null` (the CTA is simply not rendered).
   */
  fallback?: ReactNode;
}

const DEFAULT_FALLBACK: ReactNode = null;

/**
 * Identity gate that hides action CTAs targeting the viewer.
 */
export function SelfActionGate(props: SelfActionGateProps): ReactNode {
  const { targetUserId, children, fallback = DEFAULT_FALLBACK } = props;
  const auth = useAuthBootstrap();
  const viewerId = auth.currentUser?.userId ?? null;

  if (viewerId !== null && targetUserId === viewerId) {
    return fallback;
  }

  return children;
}