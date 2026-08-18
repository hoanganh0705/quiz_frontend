import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { AnalyticsRouteGate } from "@/features/social/components/AnalyticsRouteGate";

export default function SocialHubRoute(): React.ReactElement {
return (
<Suspense fallback={<RouteGateSkeleton />}>
<AnalyticsRouteGate kind="hub" />
</Suspense>
  );
}
