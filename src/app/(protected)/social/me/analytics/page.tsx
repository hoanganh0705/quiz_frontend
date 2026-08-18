import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { AnalyticsRouteGate } from "@/features/social/components/AnalyticsRouteGate";

export default function MyAnalyticsRoute(): React.ReactElement {
return (
<Suspense fallback={<RouteGateSkeleton />}>
<AnalyticsRouteGate kind="my-analytics" requireAuth />
</Suspense>
  );
}
