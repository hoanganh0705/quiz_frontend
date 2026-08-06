import { Suspense } from "react";

import { AnalyticsRouteGate } from "@/features/social/components/AnalyticsRouteGate";

/**
 * `/social` — The Social Hub landing page.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.B1 (route scaffold).
 *                TKT-6.3.E4 (live-page wiring).
 *
 * ## What this route owns
 *
 * The Social Hub is the landing page for the four analytics
 * surfaces. The route:
 *
 *   - Has no URL params.
 *   - Delegates to `<AnalyticsRouteGate kind="hub" />`, which
 *     decides between the placeholder and the live
 *     `SocialHubPage` (TKT-6.3.E1) based on the `phase6_social`
 *     flag.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated viewers are redirected to
 * `/login?redirect=/social` by `proxy.ts` *before* this route
 * module executes. The gate does not require `requireAuth` because
 * the authoritative redirect happens upstream; defensive fallback is
 * documented in `AnalyticsRouteGate`.
 *
 * ## Composition
 *
 * The gate requires client-side state (`useAuthState`,
 * `getFeatureFlagValue`), so it is wrapped in a `<Suspense>`
 * boundary per the Phase 5 / notifications route convention
 * (TKT-5.4.F3) and the Epic 6.2 / B2 convention.
 */
export default function SocialHubRoute(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <AnalyticsRouteGate kind="hub" />
    </Suspense>
  );
}
