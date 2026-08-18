import { Suspense } from "react";
import { notFound } from "next/navigation";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { InstanceGamePage } from "@/features/instances/play";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
title: "Quiz Game | QuizHub",
description:
"Play a live multiplayer quiz. Answer questions, compete on the leaderboard, and see your results in real time.",
path: "/instances",
});

interface InstanceGameRouteProps {
params: Promise<{
id: string;
  }>;
}

export default async function InstanceGameRoute({
params,
}: InstanceGameRouteProps): Promise<React.ReactElement> {
const { id } = await params;

if (!id || id.trim().length === 0) {
notFound();
  }

return (
<main className="min-h-screen p-4 md:p-8 lg:p-12">
<Suspense fallback={<RouteGateSkeleton />}>
<InstanceGamePage instanceId={id} />
</Suspense>
</main>
  );
}
