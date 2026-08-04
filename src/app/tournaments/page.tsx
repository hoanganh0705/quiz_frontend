import { Suspense } from 'react';
import { TournamentsPage } from '@/features/tournaments/components';

/**
 * `/tournaments` — tournament discovery list page.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.G3.
 */

export default function TournamentsRoute() {
  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
        <p className="text-muted-foreground mt-1">
          Discover and compete in quiz tournaments
        </p>
      </header>
      <Suspense fallback={null}>
        <TournamentsPage />
      </Suspense>
    </main>
  );
}
