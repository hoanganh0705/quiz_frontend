import { notFound } from "next/navigation";

import { MutualsRouteGate } from "@/features/social/components/MutualsRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

/**
 * `/social/users/[id]/mutual-friends` — Mutual friends list for a
 * public user.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source tickets: TKT-6.4.G1 (route scaffold), TKT-6.4.G3
 *                 (live-branch wiring via `MutualsRouteGate`).
 *
 * Thin server-side route entry that validates the `:id` segment
 * and delegates to `<MutualsRouteGate />`. The gate decides
 * between the placeholder and the live list based on the
 * `social_live` and `social_mutuals_live` flag values.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated users are redirected to
 * `/login?redirect=/social/users/:id/mutual-friends`.
 *
 * ## 404
 *
 * If the `:id` segment is not a UUID-shaped string, the route
 * short-circuits to `notFound()` and renders the standard 404
 * page. This mirrors the pattern in
 * `app/social/users/[id]/followers/page.tsx` (TKT-6.2.B1).
 */
interface MutualFriendsRouteProps {
  params: Promise<{ id: string }>;
}

export default async function MutualFriendsRoute({
  params,
}: MutualFriendsRouteProps): Promise<React.ReactElement> {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  return <MutualsRouteGate kind="friends" targetUserId={id} />;
}