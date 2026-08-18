"use client";

import { Suspense } from "react";

import { TournamentsPage } from "@/features/tournaments/components";
import { RouteGateSkeleton } from "@/components/ui/loading-states";

export default function TournamentRoute() {
return (
<main className="min-h-screen text-foreground p-4 md:p-8 lg:p-12">
<header className="mb-8">
<h1 className="text-3xl font-bold tracking-tight">Quiz Tournaments</h1>
<p className="text-muted-foreground mt-1">
Compete against other quiz enthusiasts and win amazing prizes
        </p>
</header>
<Suspense fallback={<RouteGateSkeleton />}>
<TournamentsPage />
</Suspense>
</main>
  );
}