import { notFound } from "next/navigation";
import { Suspense } from "react";

import { RouteGateSkeleton } from "@/components/ui/loading-states";
import { SocialListRouteGate } from "@/features/social/components/SocialListRouteGate";

/**
 * `/social/blocked` — The viewer's blocked users list.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.2 (lines 139–180).
 * Source ticket: TKT-6.2.B2.
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
 * `/login?redirect=/social/blocked` by `proxy.ts` *before* this
 * route module executes. As a defensive fallback, the gate also
 * renders the privacy-notice variant if `proxy.ts` ever fails to
 * redirect (e.g. local development without middleware).
 *
 * ## 404
 *
 * The route has no URL parameters, so it never calls
 * `notFound()` itself. The route does not depend on a `:id`
 * segment at all.
 *
 * ## Composition
 *
 * The gate requires client-side state (`useAuthState`,
 * `getFeatureFlagValue`), so it is wrapped in a `<Suspense>`
 * boundary per the Phase 5 / notifications route convention
 * (TKT-5.4.F3).
 */
export default function BlockedRoute(): React.ReactElement {
  return (
    <Suspense fallback={<RouteGateSkeleton />}>
      <SocialListRouteGate kind="blocked" requireAuth />
    </Suspense>
  );
}

// Defensive: `notFound` is re-exported here so any future dynamic
// variant of this route can validate an `:id` segment against the
// UUID contract (see `/social/users/[id]/followers/page.tsx` for
// the pattern).
void notFound;
