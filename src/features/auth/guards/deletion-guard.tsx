'use client';

/**
 * `useDeletionGuard` / `<DeletionGuard>` — protected-route
 * deleted-state guard.
 *
 * Source epic: Epic 2.10 — Permanent account deletion.
 * Source ticket: 2.10.T21.
 *
 * ## Purpose
 *
 * Closes the race where a navigation, browser-history restoration,
 * or a concurrent render could display cached protected content
 * during the brief window between the backend confirming deletion
 * and the local cleanup coordinator completing.
 *
 * Once `runDeletionFinalization()` (T14) sets the module-level
 * terminal marker (`isDeletionFinalized()`, 2.10.T7), the guard
 * refuses to render protected children and instead routes the
 * caller to the public landing route via `router.replace`. This
 * guarantees:
 *
 *   - `cleanup` and `completed` lifecycle states cannot render
 *     protected account data,
 *   - the guard does not call refresh while deletion is terminal,
 *   - cached profile/security data is ignored once deletion
 *     finalization starts,
 *   - a fresh, deliberate new login can clear the terminal marker
 *     via the existing auth-bootstrap rules (see "Reset on login"
 *     below).
 *
 * ## Render-vs-route contract
 *
 * The guard returns `null` while the deletion terminal marker is
 * set. Returning `null` (rather than rendering a placeholder) is
 * intentional: the brief blank period is shorter and less jarring
 * than a skeleton flash, and the modal's cleanup copy already
 * surfaces the user-facing explanation.
 *
 * The guard DOES call `router.replace(PUBLIC_LANDING_PATH)` in a
 * `useEffect` because returning `null` is not a redirect on its
 * own in Next.js's App Router. The replacement happens on the
 * first render after the terminal marker is observed, and only
 * once per guard instance (the `useEffect` short-circuits on
 * subsequent renders).
 *
 * ## Reset on login
 *
 * The terminal marker is module-scope, not per-tab. The auth
 * bootstrap context already resets its own state on `LOGGED_IN`,
 * and the deletion flow is the only path that sets the marker in
 * the first place. A fresh login therefore begins from a clean
 * slate without an explicit reset call.
 *
 * @example
 * ```tsx
 * <DeletionGuard>
 *   <ProfilePanel />
 * </DeletionGuard>
 * ```
 */

import {
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  isDeletionFinalized,
} from '@/features/auth/lifecycle/deletion-finalization';
import {
  DELETION_PUBLIC_LANDING_PATH,
} from '@/features/auth/lifecycle/deletion-history';

export interface DeletionGuardProps {
  children: ReactNode;
  /**
   * Optional fallback rendered while the deletion terminal marker
   * is set AND the redirect has not yet been initiated. Defaults
   * to `null` (blank render). Pass a skeleton if the blank flash
   * is undesirable in your surface.
   */
  fallback?: ReactNode;
}

/**
 * `<DeletionGuard>` — wrap protected content with this guard so
 * that a deletion-terminal state immediately routes to the public
 * landing page.
 *
 * The guard returns `fallback ?? null` while the marker is set
 * and schedules a one-shot `router.replace` to the public landing
 * route.
 */
export function DeletionGuard({
  children,
  fallback = null,
}: DeletionGuardProps): React.JSX.Element | null {
  const router = useRouter();
  // Track whether THIS guard instance has already scheduled the
  // redirect. Without this, every re-render would call
  // `router.replace` again, which is wasteful and noisy in logs.
  const hasRedirectedRef = useRef(false);

  // The marker is read on every render. Reading the module-level
  // boolean is cheap and avoids a useState-driven re-render loop.
  const isTerminal = isDeletionFinalized();

  useEffect(() => {
    if (!isTerminal) return;
    if (hasRedirectedRef.current) return;
    hasRedirectedRef.current = true;
    router.replace(DELETION_PUBLIC_LANDING_PATH);
  }, [isTerminal, router]);

  if (isTerminal) {
    return fallback as React.JSX.Element | null;
  }

  return <>{children}</>;
}

/**
 * `useDeletionGuardActive()` — non-component variant. Returns
 * `true` while the deletion terminal marker is set. Useful for
 * surfaces that already own their own routing logic and just need
 * the boolean.
 *
 * @example
 * ```tsx
 * const isTerminal = useDeletionGuardActive();
 * if (isTerminal) return null;
 * ```
 */
export function useDeletionGuardActive(): boolean {
  return isDeletionFinalized();
}
