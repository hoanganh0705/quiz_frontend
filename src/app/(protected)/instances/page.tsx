import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { InstancesPage } from "@/features/instances/pages/InstancesPage";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Live Battles | QuizHub",
  description:
    "Join a live multiplayer quiz battle or host your own room in real time.",
  path: "/instances",
});

export default function InstancesRoute(): React.ReactElement {
  return (
    <main className="mx-auto max-w-7xl min-h-screen text-foreground px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <Suspense fallback={<RouteGateSkeleton />}>
        <InstancesPage />
      </Suspense>
    </main>
  );
}
