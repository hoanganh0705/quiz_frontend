'use client';

/**
 * `RedirectIfAuthed` — redirects authenticated visitors away from
 * `/signup`. Used as a guard at the top of the page.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.E1.
 *
 * ## Acceptance criteria (from EPIC_2_1_TICKETS.md TKT-2.1.E1)
 *
 *   1. An authenticated visitor to `/signup` is redirected to `/`.
 *   2. The redirect does not flash the registration form.
 *   3. The acknowledgement page does not redirect authenticated
 *      users away.
 *
 * ## Implementation
 *
 * The guard is a thin React 19 client component that calls
 * `useRouter().replace('/')` on mount if `useAuthState().isAuthenticated`
 * is true. Because `useAuthState` reads from a cookie, the first
 * render after the route mounts already has the token (no flash);
 * the redirect runs in a `useEffect` so the guard never paints the
 * form before navigation.
 *
 * `useAuthState().isAuthenticated` is read via
 * `useSyncExternalStore`, so the value is consistent across SSR and
 * the client.
 *
 * This guard is NOT applied at the `/register/check-inbox` page.
 * A logged-in user who has just registered may visit that page, and
 * a logged-out user must see the inbox message even if the page is
 * served from a logged-in context (e.g. shared link in a private
 * tab). That asymmetry is the cross-epic rule for E1.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthState } from '@/features/auth/hooks/use-auth-state';

export function RedirectIfAuthed({ to = '/' }: { to?: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthState();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(to);
    }
  }, [isAuthenticated, router, to]);

  // Render nothing while the redirect is decided. The form component
  // below this guard never paints when the redirect fires, because
  // the navigation happens before paint in React 19.
  if (isAuthenticated) {
    return null;
  }

  return null;
}
