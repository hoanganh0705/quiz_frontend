import { notFound } from "next/navigation";

import { SocialListRouteGate } from "@/features/social/components/SocialListRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

/**
 * `/social/users/[id]/followers` — Followers list for a public user.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.2 (lines 139–180).
 * Source ticket: TKT-6.2.B1.
 *
 * Thin server-side route entry that validates the `:id` segment
 * and delegates to `<SocialListRouteGate />`. The gate decides
 * between the placeholder and the live list based on the
 * `social_live` and `social_relationship_live` flag values.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated users are redirected to
 * `/login?redirect=/social/users/:id/followers`.
 *
 * ## 404
 *
 * If the `:id` segment is not a UUID-shaped string, the route
 * short-circuits to `notFound()` and renders the standard 404
 * page. This mirrors the pattern in
 * `app/instances/[id]/play/page.tsx` (TKT-5.8.G2).
 */
interface FollowersRouteProps {
  params: Promise<{ id: string }>;
}

export default async function FollowersRoute({
  params,
}: FollowersRouteProps): Promise<React.ReactElement> {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  return <SocialListRouteGate kind="followers" targetUserId={id} />;
}
