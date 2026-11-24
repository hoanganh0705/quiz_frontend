import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { InstanceRoomPage } from "@/features/instances/pages/InstanceRoomPage";
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
    <main className="min-h-screen py-6 px-4 sm:py-8 sm:px-6 md:py-10 md:px-8 max-w-4xl mx-auto w-full">
      <Suspense fallback={<RouteGateSkeleton />}>
        <InstanceRoomPage instanceId={id} />
      </Suspense>
    </main>
  );
}
