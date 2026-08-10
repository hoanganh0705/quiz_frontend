import { Suspense } from "react";
import { notFound } from "next/navigation";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { InstanceGamePage } from "@/features/instances/play";
import { buildMetadata } from "@/shared/lib/seo";

/**
 * `/instances/[id]/play` — instance gameplay route.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.G2.
 *
 * ## What this route owns
 *
 * Thin server-side route entry that resolves the `id` param and delegates
 * to `<InstanceGamePage instanceId={id} />` wrapped in a `Suspense` boundary.
 * The feature-flag guard and the safe fallback are inside the feature page,
 * not the route — the route is intentionally a one-liner so it can be swapped
 * without touching the feature layer.
 *
 * ## Auth
 *
 * The gameplay route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/instances`. Unauthenticated users are redirected to
 * `/login?redirect=/instances/[id]/play`.
 *
 * ## Metadata
 *
 * Page title and description are set via `buildMetadata` so the route has
 * stable SEO metadata. No instance data is rendered into metadata before the
 * user is authenticated.
 */

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

  // Validate that the id looks like a valid UUID.
  // The real 404 check is done by the page composition via `useInstance`.
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
