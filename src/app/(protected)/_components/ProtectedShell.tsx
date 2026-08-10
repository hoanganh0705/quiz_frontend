'use client';

/**
 * `ProtectedShell` — client-side defense-in-depth auth wrapper.
 *
 * Source epic: Folder-convention refactor (move admin/social/instances/
 *   notifications/tournaments into app/(protected)/).
 *
 * ## Purpose
 *
 * The Next.js middleware (`src/proxy.ts`) is the authoritative gate that
 * redirects unauthenticated requests to `/login`. That middleware is
 * presence-only — it checks that the access-token cookie exists, but it
 * does NOT validate the JWT, and it runs on the server side.
 *
 * `ProtectedShell` is a client-side belt-and-braces check that catches
 * the rare race where:
 *
 *   1. The user was authenticated when the middleware redirected them.
 *   2. The cookie was cleared client-side (e.g. another tab logged out)
 *      before the protected page finished hydrating.
 *   3. The page is now rendered for an unauthenticated client.
 *
 * If `useAuthState()` reports `isAuthenticated === false` after hydration,
 * we redirect to `/login` immediately and render a brief loading state.
 *
 * ## Functional value (not just `<>{children}</>`)
 *
 * - Consistent `data-protected-route="true"` attribute for E2E tests.
 * - Accessible `role="region"` + `aria-label="Authenticated content"` so
 *   assistive tech can scope announcements to authed areas.
 * - Graceful "Checking authentication…" state for the (rare) edge case.
 *
 * @see src/proxy.ts — the server-side gate.
 * @see src/features/auth/hooks/use-auth-state.ts — the cookie subscription.
 */
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';

export interface ProtectedShellProps {
  children: ReactNode;
}

export function ProtectedShell({ children }: ProtectedShellProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuthState();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div
        role='status'
        aria-live='polite'
        data-protected-shell-state='checking'
        style={{
          padding: '2rem',
          textAlign: 'center',
          opacity: 0.7,
        }}
      >
        Checking authentication…
      </div>
    );
  }

  return (
    <div
      data-protected-route='true'
      data-testid='protected-shell'
      role='region'
      aria-label='Authenticated content'
    >
      {children}
    </div>
  );
}