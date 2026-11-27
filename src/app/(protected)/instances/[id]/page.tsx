import { Suspense } from "react";

import { InstanceRoomPage } from "@/features/instances/pages/InstanceRoomPage";

import { RouteGateSkeleton } from "@/components/ui/loading-states";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Quiz Instance | QuizHub",
  description:
    "Join a live multiplayer quiz instance. See the lobby, player roster, and host controls in real time.",
  path: "/instances",
  noIndex: true,
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
    <main className={PAGE_CONTAINER_CLASS}>
      <Suspense fallback={<RouteGateSkeleton />}>
        <InstanceRoomPage instanceId={id} />
      </Suspense>
    </main>
  );
}
