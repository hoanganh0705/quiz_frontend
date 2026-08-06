"use client";

/**
 * `SocialListRouteGate` — Client-side gate that decides whether a
 * Story 6.2 list page renders the placeholder or the live list.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.2 (lines 139–180).
 * Source tickets: TKT-6.2.B1 / B2 (route scaffolds), TKT-6.2.E4 /
 *                F3 (live-route wiring).
 *
 * ## What this component owns
 *
 * The route shell delegates to this component once the `:id`
 * segment has been validated as a UUID. The gate reads the
 * `phase6_social` parent flag and the `phase6_social_relationship`
 * sub-flag and renders one of four branches:
 *
 *   1. `requireAuth && !isAuthenticated` →
 *      `<PrivacyRestrictedNotice variant="not_available" />`.
 *   2. `phase6_social === 'placeholder'` → `<SocialListPlaceholder />`.
 *   3. `phase6_social_relationship === 'placeholder'` → placeholder
 *      (the relationship list is gated by the sub-flag, not the
 *      parent — the parent only gates the Phase 6 surface in
 *      general).
 *   4. Both flags `'live'` → the live list component for the
 *      `kind` (Batch E / F deliverable). The mapping is:
 *        - `followers` → `FollowersList`
 *        - `following` → `FollowingList`
 *        - `friends`   → `FriendsList`
 *        - `blocked`   → `BlockedUsersList`
 *
 * ## Why a client component
 *
 * The flag values live in `process.env.NEXT_PUBLIC_*` and are read
 * by a `getFeatureFlagValue` helper that is a pure function. The
 * helper would in principle work in a Server Component too, but the
 * route uses the feature-flag value to decide whether to render a
 * placeholder or the live list; both are presentational components
 * with no server-side data, so a Client Component is the natural
 * home.
 *
 * ## Unauthenticated viewers
 *
 * On the `/social/blocked` route, an unauthenticated viewer must
 * see a privacy notice instead of the placeholder. The
 * `requireAuth` prop requests that branch; the route-level
 * authentication gate (`proxy.ts`) is the authoritative redirect,
 * but the gate keeps a defensive branch in case the middleware is
 * misconfigured. The auth read uses `useAuthState` (Phase 2
 * cookie-based presence check) because the auth-bootstrap context
 * is not mounted at the root layout — only the cookie utility is
 * universally available.
 */

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { FollowersList } from "@/features/social/lists/FollowersList";
import { FollowingList } from "@/features/social/lists/FollowingList";
import { FriendsList } from "@/features/social/lists/FriendsList";
import { BlockedUsersList } from "@/features/social/lists/BlockedUsersList";

import { PrivacyRestrictedNotice } from "./PrivacyRestrictedNotice";
import { SocialListPlaceholder, type SocialListKind } from "./SocialListPlaceholder";

interface SocialListRouteGateProps {
  /** The list kind the gate represents. */
  kind: SocialListKind;
  /** Target user id (optional; the blocked route has no target user). */
  targetUserId?: string | null;
  /**
   * Whether the route requires an authenticated viewer. When
   * `true`, the gate renders a privacy notice for unauthenticated
   * users instead of the placeholder.
   */
  requireAuth?: boolean;
}

export function SocialListRouteGate(props: SocialListRouteGateProps): React.ReactElement {
  const { kind, targetUserId, requireAuth = false } = props;

  const parentFlag = useMemo(
    () => getFeatureFlagValue("phase6_social"),
    [],
  );
  const relationshipFlag = useMemo(
    () => getFeatureFlagValue("phase6_social_relationship"),
    [],
  );

  const { isAuthenticated } = useAuthState();
  if (requireAuth && !isAuthenticated) {
    return (
      <PrivacyRestrictedNotice
        variant="not_available"
        resourceKind={kind}
      />
    );
  }

  if (parentFlag === "placeholder" || relationshipFlag === "placeholder") {
    return (
      <SocialListPlaceholder
        kind={kind}
        {...(targetUserId !== undefined ? { targetUserId } : {})}
      />
    );
  }

  // Both flags are 'live'. Render the live list branch. The viewer
  // is treated as the owner of the target profile when the target
  // user id is absent (the blocked route) or when the canonical
  // "self" relationship applies. For the user-bound routes, the
  // ownership check is delegated to the visibility / relationship
  // hooks inside the list component.
  if (kind === "blocked") {
    return <BlockedUsersList />;
  }
  if (targetUserId === null || targetUserId === undefined) {
    return (
      <SocialListPlaceholder
        kind={kind}
        {...(targetUserId !== undefined ? { targetUserId } : {})}
      />
    );
  }
  const viewerIsOwner = false; // Per-route ownership is owned by the list
                                 // component's visibility hook; the gate
                                 // only knows the route asked for an
                                 // `:id` segment.
  if (kind === "followers") {
    return <FollowersList targetUserId={targetUserId} viewerIsOwner={viewerIsOwner} />;
  }
  if (kind === "following") {
    return <FollowingList targetUserId={targetUserId} viewerIsOwner={viewerIsOwner} />;
  }
  // friends
  return <FriendsList targetUserId={targetUserId} viewerIsOwner={viewerIsOwner} />;
}
