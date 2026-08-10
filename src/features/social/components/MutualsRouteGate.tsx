"use client";

/**
 * `MutualsRouteGate` — Client-side gate that decides whether a
 * Story 6.4 mutual route renders the placeholder or the live list.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4.
 * Source tickets: TKT-6.4.G1 (route scaffolds), TKT-6.4.G3
 *                 (live-branch wiring).
 *
 * ## What this component owns
 *
 * The route shell delegates to this component once the `:id`
 * segment has been validated as a UUID. The gate reads the
 * `social_live` parent flag and the `social_mutuals_live`
 * sub-flag and renders one of four branches:
 *
 *   1. `requireAuth && !isAuthenticated` →
 *      `<PrivacyRestrictedNotice variant="not_available" />`.
 *   2. `social_mutuals_live === 'placeholder'` → the
 *      `<SocialMutualsPlaceholder>` for the `kind`.
 *   3. Both flags `'live'` → the live list component for the
 *      `kind` (Batch E2 deliverable):
 *        - `friends`   → `MutualFriendsList`
 *        - `followers` → `MutualFollowersList`
 *
 * ## Why a client component
 *
 * The flag values live in `process.env.NEXT_PUBLIC_*` and are read
 * by a `getFeatureFlagValue` helper that is a pure function. The
 * helper would in principle work in a Server Component too, but the
 * route uses the feature-flag value to decide whether to render a
 * placeholder or the live list; both are presentational components
 * with no server-side data, so a Client Component is the natural
 * home.
 *
 * ## Unauthenticated viewers
 *
 * On the mutual routes, an unauthenticated viewer should be
 * redirected to sign-in. The route-level authentication gate
 * (`proxy.ts`) is the authoritative redirect; this gate keeps a
 * defensive branch (`PrivacyRestrictedNotice`) in case the
 * middleware is misconfigured. The auth read uses `useAuthState`
 * (Phase 2 cookie-based presence check) because the auth-bootstrap
 * context is not mounted at the root layout — only the cookie
 * utility is universally available.
 */

import { useMemo } from "react";

import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import type { MutualPreviewKind } from "@/features/social/components/MutualPreview";
import { MutualFollowersList } from "@/features/social/lists/MutualFollowersList";
import { MutualFriendsList } from "@/features/social/lists/MutualFriendsList";
import { PrivacyRestrictedNotice } from "@/features/social/components/PrivacyRestrictedNotice";
import { SocialMutualsPlaceholder } from "@/features/social/components/SocialMutualsPlaceholder";
import type { SocialListKind } from "@/features/social/components/SocialListKind";
import { getFeatureFlagValue } from "@/lib/feature-flags";

export type MutualsRouteKind = Extract<
  MutualPreviewKind,
  "friends" | "followers"
>;

interface MutualsRouteGateProps {
  /** The mutual surface the gate represents. */
  kind: MutualsRouteKind;
  /** Target user id the mutual is scoped to. */
  targetUserId: string;
}

export function MutualsRouteGate(
  props: MutualsRouteGateProps,
): React.ReactElement {
  const { kind, targetUserId } = props;

  const parentFlag = useMemo(
    () => getFeatureFlagValue("social_live"),
    [],
  );
  const mutualsFlag = useMemo(
    () => getFeatureFlagValue("social_mutuals_live"),
    [],
  );

  const { isAuthenticated } = useAuthState();

  // Defensive unauthenticated branch — `proxy.ts` redirects before
  // the gate mounts in production. The fallback is a privacy notice
  // rather than a redirect because the gate is a Client Component
  // and cannot call `redirect()` from `next/navigation`.
  if (!isAuthenticated) {
    const resourceKind: SocialListKind =
      kind === "friends" ? "mutual-friends" : "mutual-followers";
    return (
      <PrivacyRestrictedNotice
        variant="not_available"
        resourceKind={resourceKind}
      />
    );
  }

  // Placeholder branch — the parent flag OR the mutuals sub-flag
  // being `'placeholder'` short-circuits to the placeholder.
  if (parentFlag === "placeholder" || mutualsFlag === "placeholder") {
    return (
      <SocialMutualsPlaceholder kind={kind} targetUserId={targetUserId} />
    );
  }

  // Live branch — render the corresponding mutual list page
  // (TKT-6.4.E2 / TKT-6.4.G3).
  if (kind === "friends") {
    return <MutualFriendsList targetUserId={targetUserId} />;
  }
  return <MutualFollowersList targetUserId={targetUserId} />;
}