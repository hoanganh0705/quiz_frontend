import { Suspense } from 'react';
import { RouteGateSkeleton } from '@/components/ui/loading-states';
import { TournamentDetailPage } from '@/features/tournaments/components';

/**
 * `/tournaments/[id]` — tournament detail page.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.G4.
 */

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
    <main className="min-h-screen p-4 md:p-8 lg:p-12">
      <Suspense fallback={<RouteGateSkeleton />}>
        <TournamentDetailPage tournamentId={id} />
      </Suspense>
    </main>
  );
}
