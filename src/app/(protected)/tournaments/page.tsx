import { Suspense } from 'react';
import { RouteGateSkeleton } from '@/components/ui/loading-states';
import { TournamentsPage } from '@/features/tournaments/components';

export default function TournamentsRoute() {
return (
<main className="min-h-screen p-4 md:p-8 lg:p-12">
<header className="mb-8">
<h1 className="text-3xl font-bold tracking-tight">Tournaments</h1>
<p className="text-muted-foreground mt-1">
Discover and compete in quiz tournaments
        </p>
</header>
<Suspense fallback={<RouteGateSkeleton />}>
<TournamentsPage />
</Suspense>
</main>
  );
}
