import { Suspense } from "react";
import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { TournamentDetailPage } from "@/features/tournaments/components";
import { getTournaments } from "@/features/tournaments/api/tournaments";

interface TournamentDetailRouteProps {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Pre-renders active and upcoming tournaments at build time.
 *
 * Tournament IDs are dynamic and not fully enumerable at build time, so this
 * returns only a curated set (active + upcoming) to enable CDN caching and
 * instant navigation for the most-visited tournaments. Fully dynamic tournaments
 * (e.g., ad-hoc user-created events) are served via SSR fallback.
 *
 * If the API is unreachable at build time, this gracefully falls back to an
 * empty array so `next build` still succeeds.
 */
export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  try {
    const activeIds: Array<{ id: string }> = [];
    const extractIds = (res: unknown): Array<{ id: string }> => {
      if (!res) return [];
      if (Array.isArray(res)) {
        return res
          .filter(
            (t): t is { tournamentId: string } =>
              typeof t === "object" && t !== null && "tournamentId" in t,
          )
          .map((t) => ({ id: t.tournamentId }));
      }
      if (typeof res === "object" && res !== null) {
        const obj = res as Record<string, unknown>;
        if (Array.isArray(obj.data)) {
          return obj.data
            .filter(
              (t): t is { tournamentId: string } =>
                typeof t === "object" && t !== null && "tournamentId" in t,
            )
            .map((t) => ({ id: t.tournamentId }));
        }
        if (Array.isArray(obj.items)) {
          return obj.items
            .filter(
              (t): t is { tournamentId: string } =>
                typeof t === "object" && t !== null && "tournamentId" in t,
            )
            .map((t) => ({ id: t.tournamentId }));
        }
        if ("tournamentId" in obj && typeof obj.tournamentId === "string") {
          return [{ id: obj.tournamentId }];
        }
      }
      return [];
    };

    const tournaments = await getTournaments({
      status: "ongoing",
    });
    activeIds.push(...extractIds(tournaments));

    // Also include upcoming tournaments for build-time prerendering
    try {
      const upcomingTournaments = await getTournaments({
        status: "upcoming",
      });
      const upcomingIds = extractIds(upcomingTournaments);
      // Deduplicate
      const seen = new Set(activeIds.map((p) => p.id));
      for (const item of upcomingIds) {
        if (!seen.has(item.id)) {
          activeIds.push(item);
          seen.add(item.id);
        }
      }
    } catch {
      // Upcoming fetch failed — proceed with active tournaments only
    }
    return activeIds;
  } catch {
    // API unreachable at build time — skip prerendering; route stays fully dynamic
    return [];
  }
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
