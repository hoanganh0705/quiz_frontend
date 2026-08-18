import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { FriendRequestRouteGate } from "@/features/social/components/FriendRequestRouteGate";

export default function OutgoingFriendRequestsRoute(): React.ReactElement {
return (
<Suspense fallback={<RouteGateSkeleton />}>
<FriendRequestRouteGate kind="outgoing" requireAuth />
</Suspense>
  );
}