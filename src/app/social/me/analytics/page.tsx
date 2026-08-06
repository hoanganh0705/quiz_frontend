import { Suspense } from "react";

import { AnalyticsRouteGate } from "@/features/social/components/AnalyticsRouteGate";

/**
 * `/social/me/analytics` — The viewer's My Analytics deep-dive page.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.B2 (route scaffold).
 *                TKT-6.3.F3 (live-page wiring).
 *
 * ## What this route owns
 *
 * The My Analytics deep-dive is the viewer-only analytics surface
 * (Story 6.3 Required Authentication line 199: "Counts and my
 * analytics require auth"). The route:
 *
 *   - Has no URL params (the period discriminator is owned by
 *     `usePeriodFilter` via `?period=...` — see TKT-6.3.B4).
 *   - Delegates to `<AnalyticsRouteGate kind="my-analytics" requireAuth />`,
 *     which renders either the placeholder or the live
 *     `MyAnalyticsPage` (TKT-6.3.F2) based on the `phase6_social`
 *     flag.
 *   - Requires an authenticated viewer; `proxy.ts` redirects
 *     unauthenticated requests to sign-in *before* this route
 *     module executes.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated viewers are redirected to
 * `/login?redirect=/social/me/analytics`. The gate keeps a defensive
 * `requireAuth` branch in case `proxy.ts` ever fails to redirect.
 *
 * ## Composition
 *
 * The gate requires client-side state (`useAuthState`,
 * `getFeatureFlagValue`), so it is wrapped in a `<Suspense>`
 * boundary per the Epic 6.2 / B2 convention.
 */
export default function MyAnalyticsRoute(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <AnalyticsRouteGate kind="my-analytics" requireAuth />
    </Suspense>
  );
}
