import { Suspense } from "react";

import { Trophy } from "lucide-react";

import { TournamentsPage } from "@/features/tournaments/components";

import { RouteGateSkeleton } from "@/components/ui/loading-states";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Tournaments | QuizHub",
  description:
    "Discover, join, and compete in community quiz tournaments to win glory and rewards.",
  path: "/tournaments",
  noIndex: true,
});

export default function TournamentsRoute() {
  return (
    <main className={`${PAGE_CONTAINER_CLASS} space-y-8`}>
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
