"use client";

/**
 * `BlockedContentGate` — Hide the row / panel contents when the
 * viewer has blocked the target user (or vice versa).
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  Story 6.2 — Read-only social graph views
 *                (followers / following / friends / blocked).
 * Source ticket: TKT-6.2.D2 (relationship-dependent privacy gate).
 *
 * ## Purpose
 *
 * Single source of truth for the "viewer is blocked by / has blocked
 * the target" hiding pattern used by every list page in Story 6.2.
 * The gate reads the `Relationship` projection between the viewer
 * and the target user and renders either its children (when no
 * block is in effect) or a privacy-restricted fallback (when a
 * block is in effect).
 *
 * This file is intentionally placed under `features/social/` rather
 * than `@/lib/gates/` because it is currently consumed only by the
 * Story 6.2 list surfaces. Future Epic 6.1 work may lift it to a
 * shared gates directory; that move is tracked separately.
 *
 * ## Behaviour
 *
 *   - `relationship === 'blocked'`     → render the privacy fallback.
 *   - `relationship === 'blocked_by'`  → render the privacy fallback.
 *   - All other values                 → render `children`.
 *
 * The fallback is a small static panel ("This content is hidden")
 * with the same `aria-label` shape used by the Story 6.2 list-page
 * components, so screen readers announce the privacy state
 * uniformly.
 *
 * ## Why a separate gate (not inline)
 *
 * The Phase 6 Risks document (master plan line 49–54) flags block
 * leakage as a privacy-critical concern. Centralising the gate here
 * means there is exactly one place that decides whether to hide
 * blocked / blocked-by content, and the lint invariant script
 * (`scripts/phase6-lint-invariants.mjs`) only needs to assert one
 * pattern instead of every call-site.
 *
 * ## SSR-safety
 *
 * The gate is a Client Component because `useRelationship` reads
 * from SWR via the auth-bootstrap context; server rendering would
 * miss the privacy decision. The fallback panel is statically
 * rendered and contains no client-only state.
 */

import type { ReactNode } from "react";

import { useRelationship } from "@/features/social/hooks/useRelationship";

import type { Relationship } from "@/features/social/types";

interface BlockedContentGateProps {
  /**
   * The target user id. The gate reads the viewer's `Relationship`
   * to this user and renders the fallback when the relationship is
   * `'blocked'` or `'blocked_by'`.
   */
  targetUserId: string;
  /**
   * The children rendered when the relationship is not a blocking
   * state.
   */
  children: ReactNode;
  /**
   * Optional fallback element. Defaults to the static "This
   * content is hidden" panel. Future tickets can pass a richer
   * panel (e.g. an "Unblock" CTA) without touching the gate.
   */
  fallback?: ReactNode;
  /**
   * Optional test seam — overrides the resolved relationship so
   * tests can exercise both branches without mocking SWR.
   */
  relationshipOverride?: Relationship | null;
}

const BLOCKING_RELATIONSHIPS = new Set<Relationship>(["blocked", "blocked_by"]);

const DEFAULT_FALLBACK: ReactNode = (
  <div
    data-testid="blocked-content-gate-fallback"
    aria-label="This content is hidden"
    className="flex flex-col gap-1 p-4 text-sm text-muted-foreground"
  >
    <p className="font-medium">This content is hidden</p>
    <p>
      You cannot view this content because of a block between you and this
      user.
    </p>
  </div>
);

/**
 * Privacy gate that hides the children when the viewer is in a
 * blocking relationship with `targetUserId`.
 */
export function BlockedContentGate(props: BlockedContentGateProps): ReactNode {
  const { targetUserId, children, fallback, relationshipOverride } = props;
  const live = useRelationship(targetUserId);

  // The override lets tests short-circuit the SWR read.
  const relationship: Relationship | null | undefined =
    relationshipOverride !== undefined
      ? relationshipOverride
      : live.relationship;

  const isBlocked =
    relationship !== null &&
    relationship !== undefined &&
    BLOCKING_RELATIONSHIPS.has(relationship);

  if (isBlocked) {
    return fallback ?? DEFAULT_FALLBACK;
  }

  return children;
}