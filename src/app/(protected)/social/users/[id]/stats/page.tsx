import { Suspense } from "react";
import { notFound } from "next/navigation";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { AnalyticsRouteGate } from "@/features/social/components/AnalyticsRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

interface UserStatsRouteProps {
params: Promise<{ id: string }>;
}

export default async function UserStatsRoute({
params,
}: UserStatsRouteProps): Promise<React.ReactElement> {
const { id } = await params;
if (!isUuid(id)) {
notFound();
  }
return (
<Suspense fallback={<RouteGateSkeleton />}>
<AnalyticsRouteGate kind="stats" targetUserId={id} />
</Suspense>
  );
}