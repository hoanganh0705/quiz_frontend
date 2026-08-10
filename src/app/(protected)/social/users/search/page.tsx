"use client";

/**
 * `/social/users/search` — Social user search page.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source tickets: TKT-6.5.G2 (route scaffold).
 *                TKT-6.5.G3 (live-page wiring).
 *
 * ## What this route owns
 *
 * The social user search surface. The route:
 *
 *   - When `social_user_search_live === 'placeholder'`, renders
 *     `<SocialSearchPlaceholder />`.
 *   - When `social_user_search_live === 'live'` and the viewer
 *     is unauthenticated, redirects to sign-in.
 *   - When `social_user_search_live === 'live'` and the viewer
 *     is authenticated, renders `<UserSearchResults />` with
 *     URL-owned query state.
 *
 * ## URL-owned query
 *
 * The route reads `q` from the URL query string and passes it
 * to the page component via `onQueryChange` that writes back
 * to the URL.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated viewers are redirected to
 * `/login?redirect=/social/users/search` by `proxy.ts` before
 * this route module executes.
 *
 * ## SSR-safety
 *
 * The route reads `social_user_search_live` from env vars and
 * `useAuthSession` from the auth context. Both are client-side
 * reads; the route is a Client Component wrapped in a `<Suspense>`
 * boundary.
 */

import { Suspense, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useMemo } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { SocialSearchPlaceholder } from "@/features/social/components/SocialSearchPlaceholder";
import { UserSearchResults } from "@/features/social/lists/UserSearchResults";

function SearchRouteGate(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const { isAuthenticated, isBootstrapping } = useAuthSession();

  const flagValue = useMemo(
    () => getFeatureFlagValue("social_user_search_live"),
    [],
  );

  // Current query from URL.
  const query = useMemo(() => searchParams.get("q") ?? "", [searchParams]);

  // Write query back to URL.
  const handleQueryChange = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim() === "") {
        params.delete("q");
      } else {
        params.set("q", next);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
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
    return <SocialSearchPlaceholder />;
  }

  // Live branch: authenticated viewer sees the live search.
  if (isAuthenticated) {
    return <UserSearchResults query={query} onQueryChange={handleQueryChange} />;
  }

  // Fallback for unexpected state (should be caught by proxy.ts redirect).
  return <SocialSearchPlaceholder />;
}

export default function SearchRoute(): React.ReactElement {
  return (
    <Suspense fallback={<RouteGateSkeleton />}>
      <SearchRouteGate />
    </Suspense>
  );
}
