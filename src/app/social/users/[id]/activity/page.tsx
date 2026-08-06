import { notFound } from "next/navigation";

import { ActivityRouteGate } from "@/features/social/components/ActivityRouteGate";
import { isUuid } from "@/features/social/utils/is-uuid";

/**
 * `/social/users/[id]/activity` — Per-user activity stream.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source tickets: TKT-6.4.G2 (route scaffold), TKT-6.4.G3
 *                 (live-branch wiring via `ActivityRouteGate`).
 *
 * Thin server-side route entry that validates the `:id` segment
 * and delegates to `<ActivityRouteGate />`. The gate decides
 * between the placeholder and the live stream based on the
 * `phase6_social` and `phase6_social_activity` flag values.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated users are redirected to
 * `/login?redirect=/social/users/:id/activity`.
 *
 * ## 404
 *
 * If the `:id` segment is not a UUID-shaped string, the route
 * short-circuits to `notFound()` and renders the standard 404
 * page. This mirrors the pattern in
 * `app/social/users/[id]/followers/page.tsx` (TKT-6.2.B1).
 */
interface ActivityRouteProps {
  params: Promise<{ id: string }>;
}

export default async function UserActivityRoute({
  params,
}: ActivityRouteProps): Promise<React.ReactElement> {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  return <ActivityRouteGate targetUserId={id} />;
}