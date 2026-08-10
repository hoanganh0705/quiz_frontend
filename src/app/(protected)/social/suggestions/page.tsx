"use client";

/**
 * `/social/suggestions` — Social suggestions page.
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
 * The social suggestions surface. The route:
 *
 *   - When `social_discovery_live === 'placeholder'`, renders
 *     `<SocialDiscoveryPlaceholder surface="suggestions" />`.
 *   - When `social_discovery_live === 'live'` and the viewer
 *     is unauthenticated, redirects to sign-in.
 *   - When `social_discovery_live === 'live'` and the viewer
 *     is authenticated, renders `<SuggestionsPanel />`.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated viewers are redirected to
 * `/login?redirect=/social/suggestions` by `proxy.ts` before
 * this route module executes.
 *
 * ## SSR-safety
 *
 * The route reads `social_discovery_live` from env vars and
 * `useAuthSession` from the auth context. Both are client-side
 * reads; the route is a Client Component wrapped in a `<Suspense>`
 * boundary.
 */

import { Suspense } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useMemo } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { SocialDiscoveryPlaceholder } from "@/features/social/components/SocialDiscoveryPlaceholder";
import { SuggestionsPanel } from "@/features/social/lists/SuggestionsPanel";

function SuggestionsRouteGate(): React.ReactElement {
  const { isAuthenticated, isBootstrapping } = useAuthSession();

  const flagValue = useMemo(
    () => getFeatureFlagValue("social_discovery_live"),
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
    return <SocialDiscoveryPlaceholder surface="suggestions" />;
  }

  // Live branch: authenticated viewer sees the live panel.
  if (isAuthenticated) {
    return <SuggestionsPanel />;
  }

  // Fallback for unexpected state (should be caught by proxy.ts redirect).
  return <SocialDiscoveryPlaceholder surface="suggestions" />;
}

export default function SuggestionsRoute(): React.ReactElement {
  return (
    <Suspense fallback={<RouteGateSkeleton />}>
      <SuggestionsRouteGate />
    </Suspense>
  );
}
