import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { InstanceRoomPage } from "@/features/instances";
import { buildMetadata } from "@/shared/lib/seo";

/**
 * `/instances/[id]` — instance room route.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.F2.
 *
 * ## What this route owns
 *
 * Thin server-side route entry that resolves the `id` param and
 * delegates to `<InstanceRoomPage />` (TKT-5.7.F1). The page
 * composition handles the feature-flag placeholder surface
 * internally — the route file is intentionally a one-liner so the
 * flag check and the safe fallback live in the feature, not the
 * route shell.
 *
 * ## Auth
 *
 * The instance room is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/instances`. Unauthenticated users are redirected to
 * `/login?redirect=/instances/[id]`.
 *
 * ## Metadata
 *
 * Page title and description are set via `buildMetadata` so the
 * route has stable SEO metadata. No instance data is rendered into
 * metadata before the user is authenticated.
 */

export const metadata = buildMetadata({
  title: "Quiz Instance | QuizHub",
  description:
    "Join a live multiplayer quiz instance. See the lobby, player roster, and host controls in real time.",
  path: "/instances",
});

interface InstanceRoomRouteProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InstanceRoomRoute({
  params,
}: InstanceRoomRouteProps): Promise<React.ReactElement> {
  const { id } = await params;

  return (
    <main className="min-h-screen p-4 md:p-8 lg:p-12">
      <Suspense fallback={<RouteGateSkeleton />}>
        <InstanceRoomPage instanceId={id} />
      </Suspense>
    </main>
  );
}