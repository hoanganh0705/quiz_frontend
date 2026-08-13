"use client";

/**
 * `/tournament` — tournament discovery list page.
 *
 * Composes the live `TournamentsPage` from `@/features/tournaments` so
 * the route renders the real tournament list surface:
 *
 *   - `<TournamentFilters />` — status tabs + debounced search, URL-synced.
 *   - `<TournamentList />` — cursor-paginated grid with skeleton /
 *     empty / error / load-more affordances.
 *   - `<TournamentPlaceholder />` — safe fallback when the
 *     `tournaments_live` feature flag is set to `'placeholder'`.
 *
 * The previous inline implementation relied on hardcoded mock data,
 * rendered a stale "Featured" banner, and triggered a React "unique
 * `key` prop" warning from the category tabs (an undefined category id
 * collided with the literal `"all"`). Replaced by the feature module
 * so the page stays in lock-step with the rest of the tournaments
 * surface (Story 5.2).
 */

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