"use client";

/**
 * `FriendRequestRouteGate` — Client-side gate that decides whether the
 * incoming / outgoing friend-request list routes render the placeholder
 * or the live page.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.8 (lines 385–428).
 * Source tickets: TKT-6.8.E5 (IncomingRequestsListPage),
 *                 TKT-6.8.E6 (OutgoingRequestsListPage),
 *                 TKT-6.8.H1 (route wiring).
 *
 * ## What this component owns
 *
 * The route shell (`/social/friend-requests/incoming/page.tsx` and
 * `/social/friend-requests/outgoing/page.tsx`) delegates to this
 * component. The gate reads:
 *
 *   - `phase6_social` (the parent flag)
 *   - `phase6_social_relationship` (the read sub-flag)
 *
 * and renders one of three branches:
 *
 *   1. `requireAuth && !isAuthenticated` →
 *      `<PrivacyRestrictedNotice variant="not_available" />`.
 *      (Defensive fallback; `proxy.ts` is the authoritative redirect.)
 *   2. Either flag `'placeholder'` →
 *      `<FriendRequestEmptyState kind="incoming" | "outgoing" />`.
 *      The page intentionally still uses the real empty-state copy so
 *      the route is observable during the placeholder phase.
 *   3. Both flags `'live'` and viewer is authenticated →
 *      `<IncomingRequestsListPage />` or
 *      `<OutgoingRequestsPage />`.
 *
 * ## Why a client component
 *
 * The flag values live in `process.env.NEXT_PUBLIC_*` and the auth
 * read uses `useAuthState` (Phase 2 cookie-based presence check).
 * Both are client-side reads; the route uses the flag value to decide
 * whether to render a placeholder or the live page, so a Client
 * Component is the natural home (mirrors `SocialListRouteGate` and
 * `AnalyticsRouteGate`).
 *
 * ## `friendshipId` hygiene
 *
 * The gate is a pure routing primitive. It does NOT handle
 * `friendshipId`. The `friendshipId` only appears inside the live
 * page's render-prop callbacks (per `FriendRequestItem`'s contract
 * documented in TKT-6.8.E7) and inside the per-row dialogs
 * (TKT-6.8.E3 / E4). The gate never sees a request DTO.
 */

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
  IncomingRequestsListPage,
  OutgoingRequestsListPage,
} from "@/features/social/pages";
import { FriendRequestEmptyState } from "./FriendRequestEmptyState";
import { PrivacyRestrictedNotice } from "./PrivacyRestrictedNotice";

/**
 * The two route surfaces this gate serves. The discriminated union
 * is closed: adding a new surface requires a new entry here AND a
 * new route under `app/social/friend-requests/<surface>/page.tsx`.
 */
export type FriendRequestRouteKind = "incoming" | "outgoing";

interface FriendRequestRouteGateProps {
  /** Which surface the gate represents. */
  kind: FriendRequestRouteKind;
  /**
   * Whether the route requires an authenticated viewer. Both
   * friend-request surfaces are viewer-only — they have no `:id`
   * segment — so this is `true` for both routes.
   */
  requireAuth?: boolean;
}

export function FriendRequestRouteGate(
  props: FriendRequestRouteGateProps,
): React.ReactElement {
  const { kind, requireAuth = false } = props;

  const parentFlag = useMemo(
    () => getFeatureFlagValue("phase6_social"),
    [],
  );
  const readFlag = useMemo(
    () => getFeatureFlagValue("phase6_social_relationship"),
    [],
  );

  const { isAuthenticated } = useAuthState();
  if (requireAuth && !isAuthenticated) {
    return (
      <PrivacyRestrictedNotice
        variant="not_available"
        resourceKind="blocked"
      />
    );
  }

  // Either flag in placeholder mode. Render the empty-state copy so
  // the route is observable. The placeholder uses the same copy as
  // the empty branch; the user cannot tell the difference.
  if (parentFlag === "placeholder" || readFlag === "placeholder") {
    return <FriendRequestEmptyState kind={kind} />;
  }

  // Both flags 'live'. Render the live page component. The page
  // owns its own loading / error / empty / populated branches.
  if (kind === "incoming") {
    return <IncomingRequestsListPage />;
  }
  return <OutgoingRequestsListPage />;
}