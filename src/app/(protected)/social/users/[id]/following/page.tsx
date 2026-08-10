import { notFound } from "next/navigation";

import { SocialListRouteGate } from "@/features/social/components/SocialListRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

/**
 * `/social/users/[id]/following` — Following list for a public
 * user.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.2 (lines 139–180).
 * Source ticket: TKT-6.2.B1.
 *
 * Thin server-side route entry that validates the `:id` segment
 * and delegates to `<SocialListRouteGate />`. See the
 * `followers` route for the full auth / 404 / flag-gating
 * contract — the three routes are structurally identical.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`.
 *
 * ## 404
 *
 * The `:id` segment must be a UUID-shaped string; otherwise the
 * route short-circuits to `notFound()`.
 */
interface FollowingRouteProps {
  params: Promise<{ id: string }>;
}

export default async function FollowingRoute({
  params,
}: FollowingRouteProps): Promise<React.ReactElement> {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  return <SocialListRouteGate kind="following" targetUserId={id} />;
}
