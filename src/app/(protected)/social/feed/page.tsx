import { Suspense } from "react";

import { SocialFeedRouteGate } from "@/features/social/components/SocialFeedRouteGate";
import { RouteGateSkeleton } from "@/components/ui/loading-states";

/**
 * `/social/feed` — The viewer's global social feed surface.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source tickets: TKT-6.9.G1 (gate + page shell),
 *                 TKT-6.9.I1 (route wiring).
 *
 * ## What this route owns
 *
 * The endpoint is **viewer-only** — the feed is keyed on the
 * viewer's user id (no `:id` segment). The route does NOT take a
 * dynamic segment; unauthenticated viewers see a privacy notice
 * instead of the placeholder or live feed.
 *
 * ## Auth
 *
 * The route is gated behind `proxy.ts`'s `PROTECTED_PREFIXES`
 * entry for `/social`. Unauthenticated viewers are redirected to
 * `/login?redirect=/social/feed` by `proxy.ts` *before* this
 * route module executes. The gate (`SocialFeedRouteGate`,
 * TKT-6.9.G1) keeps a defensive `PrivacyRestrictedNotice` branch
 * in case `proxy.ts` ever fails to redirect.
 *
 * ## Composition
 *
 * The gate reads feature-flag values (`getFeatureFlagValue`) and
 * the auth-bootstrap context (`useAuthBootstrap`); both are
 * client-only. The route module is a thin server entry that
 * delegates to the gate inside a `<Suspense>` boundary per the
 * Epic 6.2 / B2 convention and the `SocialListRouteGate`
 * precedent. The gate then composes the live page
 * (`SocialFeedPage`, TKT-6.9.G1), the placeholder, or the
 * privacy notice.
 */
export default function SocialFeedRoute(): React.ReactElement {
  return (
    <Suspense fallback={<RouteGateSkeleton />}>
      <SocialFeedRouteGate />
    </Suspense>
  );
}
