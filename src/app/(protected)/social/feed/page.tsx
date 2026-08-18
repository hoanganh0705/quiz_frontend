import { Suspense } from "react";

import { SocialFeedRouteGate } from "@/features/social/components/SocialFeedRouteGate";
import { RouteGateSkeleton } from "@/components/ui/loading-states";

export default function SocialFeedRoute(): React.ReactElement {
return (
<Suspense fallback={<RouteGateSkeleton />}>
<SocialFeedRouteGate />
</Suspense>
  );
}
