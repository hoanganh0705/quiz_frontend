"use client";

/**
 * `AnalyticsRouteGate` — Client-side gate that decides whether a
 * Story 6.3 analytics route renders the placeholder, a privacy
 * notice, or the live page component.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source tickets: TKT-6.3.B1 / B2 / B3 (route scaffolds).
 *
 * ## What this component owns
 *
 * The route shell delegates to this component once the URL params
 * have been validated (UUID for the per-user stats route; no params
 * for the hub, my-analytics, and leaderboard routes). The gate reads
 * the `phase6_social` parent flag and renders one of four branches:
 *
 *   1. `requireAuth && !isAuthenticated` → a privacy notice
 *      (via the Epic 6.2 `PrivacyRestrictedNotice` primitive). This
 *      is the defensive fallback; the authoritative redirect lives
 *      in `proxy.ts` (per the Epic 6.2 / B2 convention).
 *   2. `phase6_social === 'placeholder'` → `<SocialHubPlaceholder />`
 *      for the hub, or `<AnalyticsPlaceholder />` for the analytics
 *      kinds.
 *   3. `phase6_social === 'live'` → the live page component for the
 *      `kind`. The mapping is:
 *        - `hub`           → `SocialHubPage` (TKT-6.3.E1)
 *        - `stats`         → `UserStatsCard` (TKT-6.3.E3)
 *        - `my-analytics`  → `MyAnalyticsPage` (TKT-6.3.F2)
 *        - `leaderboard`   → `FriendLeaderboardPage` (TKT-6.3.G2)
 *
 * ## Live-branch wiring
 *
 * The `hub` and `stats` live branches are owned by Batch E
 * (`SocialHubPage` and `UserStatsCard`); the `my-analytics`
 * branch lands in Batch F; the `leaderboard` branch lands in
 * Batch G. Each branch renders the live component when the
 * corresponding page component exists; otherwise it falls back
 * to the placeholder surface so the route is observable even if
 * a future regression de-lists the live page.
 *
 * ## Why a client component
 *
 * The flag values live in `process.env.NEXT_PUBLIC_*` and are read
 * by a `getFeatureFlagValue` helper that is a pure function. The
 * helper would in principle work in a Server Component too, but the
 * route uses the feature-flag value to decide whether to render a
 * placeholder or the live page; both are presentational components
 * with no server-side data, so a Client Component is the natural
 * home.
 *
 * ## Unauthenticated viewers
 *
 * On the `/social/me/analytics` and `/social/friends/leaderboard`
 * routes, an unauthenticated viewer must be redirected to sign-in.
 * The route-level authentication gate (`proxy.ts`) is the
 * authoritative redirect; the gate keeps a defensive branch in case
 * the middleware is misconfigured. The auth read uses `useAuthState`
 * (Phase 2 cookie-based presence check) because the auth-bootstrap
 * context is not mounted at the root layout — only the cookie
 * utility is universally available.
 */

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { AnalyticsKind } from "@/features/social/types/analytics";

import { SocialHubPlaceholder } from "./SocialHubPlaceholder";
import { AnalyticsPlaceholder } from "./AnalyticsPlaceholder";
import { PrivacyRestrictedNotice } from "./PrivacyRestrictedNotice";
import { SocialHubPage } from "@/features/social/lists/SocialHubPage";
import { UserStatsCard } from "@/features/social/lists/UserStatsCard";
import { MyAnalyticsPage } from "@/features/social/lists/MyAnalyticsPage";
import { FriendLeaderboardPage } from "@/features/social/lists/FriendLeaderboardPage";

interface AnalyticsRouteGateProps {
  /** The analytics surface the gate represents. */
  kind: AnalyticsKind;
  /**
   * Target user id (optional; only the per-user stats route has
   * one). The My Analytics and Friend Leaderboard surfaces are
   * viewer-only and have no `:id` segment.
   */
  targetUserId?: string | null;
  /**
   * Whether the route requires an authenticated viewer. When
   * `true`, the gate renders a privacy notice for unauthenticated
   * users instead of the placeholder.
   */
  requireAuth?: boolean;
}

export function AnalyticsRouteGate(
  props: AnalyticsRouteGateProps,
): React.ReactElement {
  const { kind, targetUserId, requireAuth = false } = props;

  const parentFlag = useMemo(
    () => getFeatureFlagValue("phase6_social"),
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

  if (parentFlag === "placeholder") {
    if (kind === "hub") {
      return <SocialHubPlaceholder />;
    }
    return <AnalyticsPlaceholder kind={kind} targetUserId={targetUserId} />;
  }

  // Both flags are 'live'. The live page components for each
  // surface land in Batches E, F, and G. The gate is committed
  // first (Batch B) so the route scaffolds can mount it; the live
  // branches will start rendering the moment Batch E / F / G lands.
  //
  // Until the live page components exist, render the placeholder.
  // This is a temporary stand-in; it is replaced by the live branch
  // once Batch E / F / G ships. The `void` blocks below document
  // the eventual shape without making this commit depend on
  // Batch E / F / G.
  if (kind === "hub") {
    // TKT-6.3.E1 — wired in Batch E. The live page renders.
    void targetUserId;
    return <SocialHubPage />;
  }
  if (kind === "stats") {
    if (targetUserId === null || targetUserId === undefined) {
      return <AnalyticsPlaceholder kind="stats" targetUserId={targetUserId} />;
    }
    // TKT-6.3.E3 — wired in Batch E. The live card renders for a
    // validated target user id.
    return <UserStatsCard targetUserId={targetUserId} />;
  }
  if (kind === "my-analytics") {
    // TKT-6.3.F3 — wired in Batch F. The live page renders.
    void targetUserId;
    return <MyAnalyticsPage />;
  }
  // leaderboard
  // TKT-6.3.G3 — wired in Batch G. The live page renders.
  void targetUserId;
  return <FriendLeaderboardPage />;
}
