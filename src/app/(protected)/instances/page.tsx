import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { InstancesPage } from "@/features/instances";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Live Battles | QuizHub",
  description:
    "Join a live multiplayer quiz battle or host your own room in real time.",
  path: "/instances",
});

export default function InstancesRoute(): React.ReactElement {
  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12">
      <Suspense fallback={<RouteGateSkeleton />}>
        <InstancesPage />
      </Suspense>
    </main>
  );
}
