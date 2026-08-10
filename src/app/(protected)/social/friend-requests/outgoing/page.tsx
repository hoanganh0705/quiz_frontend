import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { FriendRequestRouteGate } from "@/features/social/components/FriendRequestRouteGate";

/**
 * `/social/friend-requests/outgoing` — The viewer's outgoing friend
 * requests list.
 *
 * Source epic:   Epic 6.8 — Friend Request Lifecycle.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.8 (lines 385–428).
 * Source tickets: TKT-6.8.E6 (page component),
 *                 TKT-6.8.H1 (route wiring).
 *
 * ## What this route owns
 *
 * The endpoint is **viewer-only** — the target user id is implicit
 * (the JWT subject). The route does NOT take a `:id` segment;
 * unauthenticated viewers see a privacy notice instead of the
 * placeholder or live list.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated viewers are redirected to
 * `/login?redirect=/social/friend-requests/outgoing` by `proxy.ts`
 * *before* this route module executes. The gate keeps a defensive
 * `requireAuth` branch in case `proxy.ts` ever fails to redirect.
 *
 * ## Composition
 *
 * The gate requires client-side state (`useAuthState`,
 * `getFeatureFlagValue`), so it is wrapped in a `<Suspense>`
 * boundary per the Epic 6.2 / B2 convention and the
 * `SocialListRouteGate` precedent.
 */
export default function OutgoingFriendRequestsRoute(): React.ReactElement {
  return (
    <Suspense fallback={<RouteGateSkeleton />}>
      <FriendRequestRouteGate kind="outgoing" requireAuth />
    </Suspense>
  );
}