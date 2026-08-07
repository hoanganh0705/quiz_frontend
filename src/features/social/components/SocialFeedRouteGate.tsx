"use client";

/**
 * `SocialFeedRouteGate` — Client-side gate that decides whether the
 * Story 6.9 global feed route renders the placeholder, the privacy
 * notice, or the live feed.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source ticket: TKT-6.9.G1.
 *
 * ## What this component owns
 *
 * The route shell delegates to this component once the page has
 * been mounted at `/social/feed`. The gate reads the
 * `phase6_social` parent flag and the `phase6_social_feed` sub-flag
 * and renders one of three branches:
 *
 *   1. `!isAuthenticated` →
 *      `<PrivacyRestrictedNotice variant="not_available" />`.
 *   2. `phase6_social_feed === 'placeholder'` (or the parent flag is
 *      `'placeholder'`) → `<SocialFeedPlaceholder />`.
 *   3. Both flags `'live'` → `<SocialFeedPage />` (this file's
 *      sibling component, the live surface).
 *
 * ## Why a client component
 *
 * The flag values live in `process.env.NEXT_PUBLIC_*` and are read
 * by a `getFeatureFlagValue` helper that is a pure function. The
 * helper would in principle work in a Server Component too, but the
 * route uses the feature-flag value to decide whether to render a
 * placeholder or the live feed; both are presentational components
 * with no server-side data, so a Client Component is the natural
 * home.
 *
 * ## Unauthenticated viewers
 *
 * The feed route requires an authenticated viewer. The route-level
 * authentication gate (`proxy.ts`) is the authoritative redirect;
 * this gate keeps a defensive branch (`PrivacyRestrictedNotice`) in
 * case the middleware is misconfigured. The auth read uses
 * `useAuthBootstrap` (Phase 2 cookie-based presence check) so the
 * gate is consistent with the rest of the Story 6.x surfaces.
 *
 * The placeholder branch is intentionally rendered *above* the
 * unauthenticated branch. The placeholder is informational only;
 * rendering it for an unauthenticated viewer preserves the
 * "Coming soon" UX across both code paths.
 */

import { useMemo } from "react";

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { RealtimeSocialShell } from "@/features/social/components/RealtimeSocialShell";
import { SocialFeedPlaceholder } from "@/features/social/components/SocialFeedPlaceholder";
import { SocialFeedPage } from "@/features/social/pages/SocialFeedPage";
import { getFeatureFlagValue } from "@/lib/feature-flags";

/**
 * `SocialFeedRouteGate` — routes between the placeholder,
 * privacy-notice, and live-feed branches.
 *
 * The component accepts no props: the route is statically
 * `/social/feed` and the viewer is read from the auth-bootstrap
 * context.
 */
export function SocialFeedRouteGate(): React.ReactElement {
  const parentFlag = useMemo(
    () => getFeatureFlagValue("phase6_social"),
    [],
  );
  const feedFlag = useMemo(
    () => getFeatureFlagValue("phase6_social_feed"),
    [],
  );

  const auth = useAuthBootstrap();
  const isAuthenticated = auth.isAuthenticated;

  // Placeholder branch — the parent flag OR the feed sub-flag being
  // `'placeholder'` short-circuits to the placeholder. The
  // placeholder renders before the unauthenticated branch so the
  // "Coming soon" UX is preserved for unauthenticated viewers (the
  // route is gated by `proxy.ts` in production).
  if (parentFlag === "placeholder" || feedFlag === "placeholder") {
    return <SocialFeedPlaceholder />;
  }

  // Defensive unauthenticated branch — `proxy.ts` redirects before
  // the gate mounts in production. The fallback is a privacy notice
  // rather than a redirect because the gate is a Client Component
  // and cannot call `redirect()` from `next/navigation`.
  if (!isAuthenticated) {
    return (
      <PrivacyRestrictedNotice
        variant="not_available"
        resourceKind="feed"
      />
    );
  }

  // Live branch — wrap the live feed page in the realtime integration
  // shell so all social realtime listener hooks and UI primitives are
  // active on this route (TKT-6.10.H1).
  return (
    <RealtimeSocialShell>
      <SocialFeedPage />
    </RealtimeSocialShell>
  );
}

export const __testing = {
  // Re-exported for the spec to introspect the gate without
  // re-deriving the flag names.
  PARENT_FLAG: "phase6_social" as const,
  FEED_FLAG: "phase6_social_feed" as const,
};
