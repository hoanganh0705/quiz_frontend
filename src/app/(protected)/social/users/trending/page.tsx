"use client";

import { Suspense } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useMemo } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { SocialDiscoveryPlaceholder } from "@/features/social/components/SocialDiscoveryPlaceholder";
import { TrendingUsersList } from "@/features/social/lists/TrendingUsersList";

function TrendingRouteGate(): React.ReactElement {
const { isAuthenticated, isBootstrapping } = useAuthSession();

const flagValue = useMemo(
() => getFeatureFlagValue("social_discovery_live"),
[],
  );

if (isBootstrapping) {
return (
<div className="flex items-center justify-center p-8">
<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
</div>
    );
  }

if (flagValue === "placeholder") {
return <SocialDiscoveryPlaceholder surface="trending" />;
  }

if (isAuthenticated) {
return <TrendingUsersList />;
  }

return <SocialDiscoveryPlaceholder surface="trending" />;
}

export default function TrendingRoute(): React.ReactElement {
return (
<Suspense fallback={<RouteGateSkeleton />}>
<TrendingRouteGate />
</Suspense>
  );
}
