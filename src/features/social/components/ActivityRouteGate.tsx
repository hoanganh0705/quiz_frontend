"use client";

/**
 * `ActivityRouteGate` — Client-side gate that decides whether the
 * Story 6.4 activity route renders the placeholder or the live
 * stream.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4.
 * Source tickets: TKT-6.4.G2 (route scaffold), TKT-6.4.G3
 *                 (live-branch wiring).
 *
 * ## What this component owns
 *
 * The route shell delegates to this component once the `:id`
 * segment has been validated as a UUID. The gate reads the
 * `phase6_social` parent flag and the `phase6_social_activity`
 * sub-flag and renders one of three branches:
 *
 *   1. `!isAuthenticated` →
 *      `<PrivacyRestrictedNotice variant="not_available" />`.
 *   2. `phase6_social_activity === 'placeholder'` →
 *      `<SocialActivityPlaceholder />`.
 *   3. Both flags `'live'` → `<UserActivityStream />` (TKT-6.4.F1).
 *
 * ## Why a client component
 *
 * The flag values live in `process.env.NEXT_PUBLIC_*` and are read
 * by a `getFeatureFlagValue` helper that is a pure function. The
 * helper would in principle work in a Server Component too, but the
 * route uses the feature-flag value to decide whether to render a
 * placeholder or the live stream; both are presentational
 * components with no server-side data, so a Client Component is the
 * natural home.
 *
 * ## Unauthenticated viewers
 *
 * The activity route requires an authenticated viewer. The
 * route-level authentication gate (`proxy.ts`) is the authoritative
 * redirect; this gate keeps a defensive branch
 * (`PrivacyRestrictedNotice`) in case the middleware is
 * misconfigured. The auth read uses `useAuthState` (Phase 2
 * cookie-based presence check) because the auth-bootstrap context
 * is not mounted at the root layout — only the cookie utility is
 * universally available.
 */

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { SocialActivityPlaceholder } from "@/features/social/components/SocialActivityPlaceholder";
import { UserActivityStream } from "@/features/social/lists/UserActivityStream";
import { getFeatureFlagValue } from "@/lib/feature-flags";

interface ActivityRouteGateProps {
  /** Target user id the activity stream is scoped to. */
  targetUserId: string;
}

export function ActivityRouteGate(
  props: ActivityRouteGateProps,
): React.ReactElement {
  const { targetUserId } = props;

  const parentFlag = useMemo(
    () => getFeatureFlagValue("phase6_social"),
    [],
  );
  const activityFlag = useMemo(
    () => getFeatureFlagValue("phase6_social_activity"),
    [],
  );

  const { isAuthenticated } = useAuthState();

  // Defensive unauthenticated branch — `proxy.ts` redirects before
  // the gate mounts in production. The fallback is a privacy notice
  // rather than a redirect because the gate is a Client Component
  // and cannot call `redirect()` from `next/navigation`.
  if (!isAuthenticated) {
    return (
      <PrivacyRestrictedNotice
        variant="not_available"
        resourceKind="activity"
      />
    );
  }

  // Placeholder branch — the parent flag OR the activity sub-flag
  // being `'placeholder'` short-circuits to the placeholder.
  if (parentFlag === "placeholder" || activityFlag === "placeholder") {
    return (
      <SocialActivityPlaceholder targetUserId={targetUserId} />
    );
  }

  // Live branch — render the activity stream page
  // (TKT-6.4.F1 / TKT-6.4.G3).
  return <UserActivityStream targetUserId={targetUserId} />;
}