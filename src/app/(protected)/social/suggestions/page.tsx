"use client";

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

if (isBootstrapping) {
return (
<div className="flex items-center justify-center p-8">
<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
</div>
    );
  }

if (flagValue === "placeholder") {
return <SocialDiscoveryPlaceholder surface="suggestions" />;
  }

if (isAuthenticated) {
return <SuggestionsPanel />;
  }

return <SocialDiscoveryPlaceholder surface="suggestions" />;
}

export default function SuggestionsRoute(): React.ReactElement {
return (
<Suspense fallback={<RouteGateSkeleton />}>
<SuggestionsRouteGate />
</Suspense>
  );
}
