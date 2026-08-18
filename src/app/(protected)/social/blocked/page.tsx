import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { SocialListRouteGate } from "@/features/social/components/SocialListRouteGate";

export default function BlockedRoute(): React.ReactElement {
return (
<Suspense fallback={<RouteGateSkeleton />}>
<SocialListRouteGate kind="blocked" requireAuth />
</Suspense>
  );
}

void notFound;
