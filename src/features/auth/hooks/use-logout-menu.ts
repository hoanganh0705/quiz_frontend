'use client';

/**
 * Logout menu hook — wired to the user menu's Sign Out button.
 *
 * Source epic: Epic 2.4 — Login, logout, and protected-route return flow.
 * Source ticket: TKT-2.4.C3.
 *
 * ## What this hook does
 *
 * `useLogout` is the general-purpose logout state machine. This hook
 * wraps it with:
 *
 *   1. A loading indicator via the `isPending` flag (for the menu item).
 *   2. Optional error handling for the `server_unconfirmed` state
 *      (currently routes to `/` without a toast — the C4 spec does not
 *      require one; add a toast if future designs call for it).
 *
 * The hook does NOT navigate directly — the menu's click handler
 * dismisses the menu and the logout promise settles in the background.
 */

import { useLogout, type UseLogoutState } from '@/features/auth/hooks/use-logout';

export interface UseLogoutMenu {
  state: UseLogoutState;
  isPending: boolean;
  signOut: () => Promise<void>;
}

export function useLogoutMenu(): UseLogoutMenu {
  const { state, logout } = useLogout();

  return {
    state,
    isPending: state.status === 'pending',
    signOut: logout,
  };
}
