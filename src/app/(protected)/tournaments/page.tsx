import { Suspense } from "react";
import { Trophy } from "lucide-react";
import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { TournamentsPage } from "@/features/tournaments/components";

export default function TournamentsRoute() {
  return (
    <main className="mx-auto max-w-7xl min-h-screen text-foreground px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      <header className="border-b border-border/80 pb-6 space-y-1.5">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Trophy className="h-8 w-8 text-brand shrink-0" aria-hidden="true" />
          <span>Tournaments</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl leading-relaxed">
          Discover, join, and compete in community quiz tournaments to win glory and rewards.
        </p>
      </header>
      <Suspense fallback={<RouteGateSkeleton />}>
        <TournamentsPage />
      </Suspense>
    </main>
  );
}
