"use client";

/**
 * `/social/users/trending` — Trending users page.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source tickets: TKT-6.5.G1 (route scaffold).
 *                TKT-6.5.G3 (live-page wiring).
 *
 * ## What this route owns
 *
 * The trending users surface. The route:
 *
 *   - When `phase6_social_discovery === 'placeholder'`, renders
 *     `<SocialDiscoveryPlaceholder surface="trending" />`.
 *   - When `phase6_social_discovery === 'live'` and the viewer
 *     is unauthenticated, redirects to sign-in.
 *   - When `phase6_social_discovery === 'live'` and the viewer
 *     is authenticated, renders `<TrendingUsersList />`.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated viewers are redirected to
 * `/login?redirect=/social/users/trending` by `proxy.ts` before
 * this route module executes.
 *
 * ## SSR-safety
 *
 * The route reads `phase6_social_discovery` from env vars and
 * `useAuthBootstrap` from the auth context. Both are client-side
 * reads; the route is a Client Component wrapped in a `<Suspense>`
 * boundary.
 */

import { Suspense } from "react";

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";
import { useMemo } from "react";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import { SocialDiscoveryPlaceholder } from "@/features/social/components/SocialDiscoveryPlaceholder";
import { TrendingUsersList } from "@/features/social/lists/TrendingUsersList";

function TrendingRouteGate(): React.ReactElement {
  const { isAuthenticated, isBootstrapping } = useAuthBootstrap();

  const flagValue = useMemo(
    () => getFeatureFlagValue("phase6_social_discovery"),
    [],
  );

  // Loading state while auth is being determined.
  if (isBootstrapping) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Placeholder branch.
  if (flagValue === "placeholder") {
    return <SocialDiscoveryPlaceholder surface="trending" />;
  }

  // Live branch: authenticated viewer sees the live list.
  if (isAuthenticated) {
    return <TrendingUsersList />;
  }

  // Fallback for unexpected state (should be caught by proxy.ts redirect).
  return <SocialDiscoveryPlaceholder surface="trending" />;
}

export default function TrendingRoute(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <TrendingRouteGate />
    </Suspense>
  );
}
