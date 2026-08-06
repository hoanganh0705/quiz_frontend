"use client";

/**
 * `useSocialListLifecycleReset` — Lifecycle reset listener for the
 * Story 6.2 social-graph lists.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.2 (lines 139–180).
 * Source ticket: TKT-6.2.B4.
 *
 * ## What this hook owns
 *
 * Two resets that every Story 6.2 list page must wire into its
 * lifecycle (Story 6.2 Exit Criterion #6: "Pagination offsets reset
 * on logout and on profile change"):
 *
 *   1. **Logout reset.** When the viewer signs out, the cached list
 *      pagination state (`cursor`, `limit` URL keys) is wiped so a
 *      subsequent user on the same browser cannot inherit the prior
 *      user's session. The hook detects logout transitions via the
 *      auth-state-change event the auth store emits.
 *
 *   2. **Profile-change reset.** When `targetUserId` changes, the
 *      hook delegates to `useSocialListUrlState(targetUserId)`
 *      which already resets the cursor / limit on user-id change.
 *      This hook only re-asserts the reset on top of that primitive
 *      so list components have a single, declarative entry point.
 *
 * The hook is intentionally thin. The actual URL mutation lives in
 * `useSocialListUrlState`; this hook only coordinates when the reset
 * must fire.
 *
 * ## Consumer pattern
 *
 * ```tsx
 * function FollowersList({ targetUserId }: { targetUserId: string }) {
 *   const url = useSocialListUrlState(targetUserId);
 *   useSocialListLifecycleReset({ targetUserId, reset: url.reset });
 *   ...
 * }
 * ```
 *
 * ## SSR-safety
 *
 * The hook subscribes to a window event and reads from the auth
 * bootstrap context. Both are client-only; the consumers of this hook
 * are client components.
 */

import { useEffect, useRef } from "react";

import { useAuthBootstrap } from "@/features/auth/contexts/auth-bootstrap-context";

const AUTH_STATE_EVENT = "auth-state-change";

/**
 * The configuration shape for `useSocialListLifecycleReset`.
 */
export interface UseSocialListLifecycleResetOptions {
  /**
   * The target user id the list page is showing. The hook is a
   * no-op if this value changes but the reset is otherwise already
   * delegated to `useSocialListUrlState`; this hook wires the
   * *external* triggers (logout) which `useSocialListUrlState`
   * cannot detect on its own.
   */
  targetUserId: string | null;
  /**
   * The reset callback returned by `useSocialListUrlState`. Called
   * on logout.
   */
  reset: () => void;
}

/**
 * Lifecycle reset listener for the four Story 6.2 list kinds
 * (followers / following / friends / blocked).
 */
export function useSocialListLifecycleReset(
  options: UseSocialListLifecycleResetOptions,
): void {
  const { targetUserId, reset } = options;
  const auth = useAuthBootstrap();
  const isAuthenticated = auth.isAuthenticated;

  /**
   * Keep a stable ref to the reset callback so the logout-listener
   * effect does not re-attach on every parent re-render. The ref is
   * mutated inside the auth-state-change effect below so the value
   * is updated without violating React's "refs during render" rule.
   */
  const resetRef = useRef(reset);

  /**
   * Track the previous auth state. We only fire `reset()` on the
   * `true → false` transition so a page re-render that happens to
   * coincide with an unauthenticated state does not falsely reset.
   */
  const wasAuthenticatedRef = useRef<boolean>(isAuthenticated);

  useEffect(() => {
    // Sync the latest reset callback. Done in an effect so React's
    // "refs during render" rule is not violated.
    resetRef.current = reset;
  }, [reset]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onAuthStateChange = () => {
      // The cookie cleared by `clearAuthToken()` is what toggles the
      // `auth-state-change` event when the viewer logs out. We
      // consume the transition by comparing the cached value against
      // the new one.
      const next = readIsAuthenticatedFromWindow();
      const was = wasAuthenticatedRef.current;
      if (was === true && next === false) {
        // Logout transition: wipe the URL pagination state.
        resetRef.current();
      }
      wasAuthenticatedRef.current = next;
    };
    window.addEventListener(AUTH_STATE_EVENT, onAuthStateChange);
    return () => {
      window.removeEventListener(AUTH_STATE_EVENT, onAuthStateChange);
    };
  }, []);

  useEffect(() => {
    // Keep the cached auth-state ref in sync with the bootstrap
    // context (which fires on every cookie change, not just on the
    // dispatched event).
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  // Profile-change reset is delegated to `useSocialListUrlState`.
  // This hook only exists to wire the logout-triggered reset;
  // nothing else needs to happen when `targetUserId` changes.
  // The unused `targetUserId` parameter keeps the signature
  // discoverable for consumers reading the doc-block above.
  void targetUserId;
}

/**
 * Best-effort read of "is the viewer currently authenticated?" from
 * `document.cookie`. Duplicates the read used by the auth store
 * (`useAuthState`) so this hook is independent of the cookie module.
 */
function readIsAuthenticatedFromWindow(): boolean {
  if (typeof document === "undefined") return false;
  return /(?:^|;\s*)auth_token=/.test(document.cookie);
}

export const __testing = {
  AUTH_STATE_EVENT,
  readIsAuthenticatedFromWindow,
};
