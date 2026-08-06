import { Suspense } from "react";

import { AnalyticsRouteGate } from "@/features/social/components/AnalyticsRouteGate";

/**
 * `/social/friends/leaderboard` — The viewer's Friend Leaderboard page.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.B2 (route scaffold).
 *                TKT-6.3.G3 (live-page wiring).
 *
 * ## What this route owns
 *
 * The Friend Leaderboard is the viewer-only leaderboard surface
 * (Story 6.3 Required Authentication line 199: "Friend leaderboard
 * requires auth"). The route:
 *
 *   - Has no URL params (the period discriminator is owned by
 *     `usePeriodFilter` via `?period=...` — see TKT-6.3.B4).
 *   - Delegates to `<AnalyticsRouteGate kind="leaderboard" requireAuth />`,
 *     which renders either the placeholder or the live
 *     `FriendLeaderboardPage` (TKT-6.3.G2) based on the
 *     `phase6_social` flag.
 *   - Requires an authenticated viewer; `proxy.ts` redirects
 *     unauthenticated requests to sign-in *before* this route
 *     module executes.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated viewers are redirected to
 * `/login?redirect=/social/friends/leaderboard`. The gate keeps a
 * defensive `requireAuth` branch in case `proxy.ts` ever fails to
 * redirect.
 *
 * ## Composition
 *
 * The gate requires client-side state (`useAuthState`,
 * `getFeatureFlagValue`), so it is wrapped in a `<Suspense>`
 * boundary per the Epic 6.2 / B2 convention.
 */
export default function FriendLeaderboardRoute(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <AnalyticsRouteGate kind="leaderboard" requireAuth />
    </Suspense>
  );
}