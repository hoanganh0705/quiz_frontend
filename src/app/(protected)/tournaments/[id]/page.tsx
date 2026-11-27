import { Suspense } from "react";

import { TournamentDetailPage } from "@/features/tournaments/components";

import { RouteGateSkeleton } from "@/components/ui/loading-states";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Tournament Details | QuizHub",
  description: "View tournament rounds, participants, and standings.",
  path: "/tournaments",
  noIndex: true,
});

interface TournamentDetailRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TournamentDetailRoute({
  params,
}: TournamentDetailRouteProps) {
  const { id } = await params;

  return (
    <main className={PAGE_CONTAINER_CLASS}>
      <Suspense fallback={<RouteGateSkeleton />}>
        <TournamentDetailPage tournamentId={id} />
      </Suspense>
    </main>
  );
}
