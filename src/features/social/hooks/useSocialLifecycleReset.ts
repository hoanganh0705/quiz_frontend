"use client";

/**
 * `useSocialLifecycleReset` — Extended lifecycle-reset listener for
 * the Story 6.3 analytics surfaces.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.B5.
 *
 * ## What this hook owns
 *
 * Two additional resets the Story 6.3 surfaces must wire into their
 * lifecycle (Phase 6 master plan Phase 6 Risks line 67: "offsets
 * reset on logout" + Story 6.3 Exit Criterion #6: "Period state
 * resets on logout"):
 *
 *   1. **Period reset.** When the viewer signs out while on
 *      `/social/me/analytics`, the cached `?period` URL state is
 *      wiped so a subsequent user on the same browser cannot
 *      inherit the prior user's period selection.
 *
 *   2. **List reset (delegated).** When the viewer signs out while
 *      on `/social/users/:id/...`, the Epic 6.2 list-page lifecycle
 *      primitive (`useSocialListLifecycleReset`, TKT-6.2.B4) already
 *      handles the `cursor` / `limit` reset. This hook does NOT
 *      duplicate that work — it forwards the logout transition to
 *      the list reset so a single listener covers the social-graph
 *      list pages AND the analytics pages.
 *
 * The hook is intentionally thin. The actual URL mutation lives in
 * `usePeriodFilter.reset()` (TKT-6.3.B4) and in
 * `useSocialListUrlState.reset()` (Epic 6.2 / TKT-6.2.B3); this hook
 * only coordinates when the reset must fire.
 *
 * ## Why two callbacks
 *
 * The hook reads `usePathname()` and decides which reset to fire.
 * Passing both callbacks explicitly (instead of reading them via
 * `usePeriodFilter()` / `useSocialListUrlState()`) keeps the hook
 * SSR-safe and side-effect-free: the URL reads happen in the leaf
 * hooks, the reset coordination happens here.
 *
 * The hook fires `periodReset` on `/social/me/analytics` only;
 * fires `listReset` on any `/social/users/:id/...` route. Other
 * routes are a no-op (the hook is mounted on those routes by the
 * analytics pages; the gate decides which callback to supply).
 *
 * ## SSR-safety
 *
 * The hook subscribes to a window event and reads from the auth
 * bootstrap context. Both are client-only; the consumers of this
 * hook are client components (the My Analytics page and the
 * per-user Stats page).
 *
 * ## Consumer pattern
 *
 * ```tsx
 * function MyAnalyticsPage() {
 *   const periodFilter = usePeriodFilter();
 *   useSocialLifecycleReset({ periodReset: periodFilter.reset });
 *   ...
 * }
 *
 * function UserStatsPage({ targetUserId }: { targetUserId: string }) {
 *   const urlState = useSocialListUrlState(targetUserId);
 *   useSocialLifecycleReset({ targetUserId, listReset: urlState.reset });
 *   ...
 * }
 * ```
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";

const AUTH_STATE_EVENT = "auth-state-change";

/**
 * The configuration shape for `useSocialLifecycleReset`.
 */
export interface UseSocialLifecycleResetOptions {
  /**
   * Optional target user id for the list-page reset branch. When
   * provided AND the viewer is on `/social/users/:id/...`, a logout
   * event calls `listReset()`. The argument is a no-op when the
   * viewer is on `/social/me/analytics`.
   */
  targetUserId?: string | null;
  /**
   * Reset callback for the list-page URL state
   * (`useSocialListUrlState.reset`). Called on logout when the
   * viewer is on `/social/users/:id/...`.
   */
  listReset?: () => void;
  /**
   * Reset callback for the period URL state (`usePeriodFilter.reset`).
   * Called on logout when the viewer is on `/social/me/analytics`.
   */
  periodReset?: () => void;
}

/**
 * Best-effort read of "is the viewer currently authenticated?" from
 * `document.cookie`. Duplicates the read used by the auth store so
 * this hook is independent of the cookie module — same pattern as
 * `useSocialListLifecycleReset` (TKT-6.2.B4).
 */
function readIsAuthenticatedFromWindow(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)auth_token=/.test(document.cookie);
}

/**
 * Lifecycle-reset listener for the four Story 6.3 analytics surfaces
 * (My Analytics, Stats, Friend Leaderboard, Social Hub). Extends the
 * Epic 6.2 `useSocialListLifecycleReset` primitive (TKT-6.2.B4) so a
 * single listener covers the social-graph list pages AND the
 * analytics period state.
 */
export function useSocialLifecycleReset(
  options: UseSocialLifecycleResetOptions,
): void {
  const { targetUserId, listReset, periodReset } = options;
  const pathname = usePathname() ?? "";
  const auth = useAuthSession();
  const isAuthenticated = auth.isAuthenticated;

  /**
   * Stable refs to the reset callbacks so the logout-listener
   * effect does not re-attach on every parent re-render.
   */
  const listResetRef = useRef(listReset);
  const periodResetRef = useRef(periodReset);

  /**
   * Track the previous auth state. We only fire `reset()` on the
   * `true → false` transition so a page re-render that happens to
   * coincide with an unauthenticated state does not falsely reset.
   */
  const wasAuthenticatedRef = useRef<boolean>(isAuthenticated);

  useEffect(() => {
    listResetRef.current = listReset;
    periodResetRef.current = periodReset;
  }, [listReset, periodReset]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAuthStateChange = () => {
      const next = readIsAuthenticatedFromWindow();
      const was = wasAuthenticatedRef.current;
      if (was === true && next === false) {
        // Logout transition: wipe the URL pagination state. The
        // specific reset depends on the route the viewer was on:
        //   - `/social/me/analytics` → period reset
        //   - `/social/users/:id/...` → list reset
        //   - any other route → no-op
        if (pathname.startsWith("/social/me/analytics")) {
          periodResetRef.current?.();
        } else if (
          targetUserId &&
          pathname.startsWith(`/social/users/${targetUserId}`)
        ) {
          listResetRef.current?.();
        }
      }
      wasAuthenticatedRef.current = next;
    };
    window.addEventListener(AUTH_STATE_EVENT, onAuthStateChange);
    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, onAuthStateChange);
    };
  }, [pathname, targetUserId]);

  useEffect(() => {
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);
}

export const __testing = {
  AUTH_STATE_EVENT,
  readIsAuthenticatedFromWindow,
};