'use client';

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
