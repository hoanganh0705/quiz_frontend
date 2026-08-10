import { Suspense } from "react";
import { notFound } from "next/navigation";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { AnalyticsRouteGate } from "@/features/social/components/AnalyticsRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

/**
 * `/social/users/[id]/stats` — A user's public social stats page.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.B3 (route scaffold).
 *                TKT-6.3.E4 (live-page wiring).
 *
 * ## What this route owns
 *
 * The per-user stats surface renders a single `UserStatsCard`
 * (TKT-6.3.E3) for the target user. The route:
 *
 *   - Reads the `:id` route param and validates it as a UUID-shaped
 *     string via `isUuid` (Epic 6.2 / TKT-6.2.B1 — the same helper
 *     Epic 6.2 established for the followers / following / friends
 *     list routes).
 *   - Short-circuits to `notFound()` when the `:id` segment is not
 *     a UUID — the backend would reject the request anyway, but the
 *     route should not even attempt to render before the format is
 *     valid.
 *   - Delegates to `<AnalyticsRouteGate kind="stats" targetUserId={id} />`,
 *     which renders either the placeholder or the live
 *     `UserStatsCard` (TKT-6.3.E3) based on the `social_live` flag.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated viewers are redirected to
 * `/login?redirect=/social/users/:id/stats` by `proxy.ts` *before*
 * this route module executes. The stats route does NOT require
 * `requireAuth` on the gate because the stats endpoint is
 * publicly readable (the target user's `showActivity` privacy flag
 * is enforced server-side, and `UserStatsCard` renders a
 * `PrivacyRestrictedNotice` when the flag is `false`).
 *
 * ## 404
 *
 * If the `:id` segment is not a UUID-shaped string, the route
 * short-circuits to `notFound()` and renders the standard 404
 * page. This mirrors the pattern in
 * `app/social/users/[id]/followers/page.tsx` (TKT-6.2.B1).
 *
 * ## Composition
 *
 * The gate requires client-side state (`useAuthState`,
 * `getFeatureFlagValue`), so it is wrapped in a `<Suspense>`
 * boundary per the Epic 6.2 / B2 convention.
 */
interface UserStatsRouteProps {
  params: Promise<{ id: string }>;
}

export default async function UserStatsRoute({
  params,
}: UserStatsRouteProps): Promise<React.ReactElement> {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  return (
    <Suspense fallback={<RouteGateSkeleton />}>
      <AnalyticsRouteGate kind="stats" targetUserId={id} />
    </Suspense>
  );
}