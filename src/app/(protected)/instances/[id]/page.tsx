import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { InstanceRoomPage } from "@/features/instances";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
title: "Quiz Instance | QuizHub",
description:
"Join a live multiplayer quiz instance. See the lobby, player roster, and host controls in real time.",
path: "/instances",
});

interface InstanceRoomRouteProps {
params: Promise<{
id: string;
  }>;
}

export default async function InstanceRoomRoute({
params,
}: InstanceRoomRouteProps): Promise<React.ReactElement> {
const { id } = await params;

return (
<main className="min-h-screen p-4 md:p-8 lg:p-12">
<Suspense fallback={<RouteGateSkeleton />}>
<InstanceRoomPage instanceId={id} />
</Suspense>
</main>
  );
}