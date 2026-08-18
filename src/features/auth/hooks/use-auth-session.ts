'use client';

import {
useIsUserLoading,
useUser,
useUserStore,
} from '@/features/users/store/user-store';
import { useAuthState } from '@/features/auth/hooks';

export type AuthSessionBootstrapState =
| 'unauthenticated'
  | 'bootstrapping'
  | 'authenticated';

export interface AuthSessionValue {

isAuthenticated: boolean;

isBootstrapping: boolean;

isDegraded: boolean;

bootstrapState: AuthSessionBootstrapState;

currentUserId: string | null;

user: ReturnType<typeof useUser>;

currentUser: ReturnType<typeof useUser>;
}

export function useAuthSession(): AuthSessionValue {
const { isAuthenticated } = useAuthState();
const isBootstrapping = useIsUserLoading();
const user = useUser();

const currentUserId = user?.userId ?? null;

const bootstrapState: AuthSessionBootstrapState =
!isAuthenticated
? 'unauthenticated'
: isBootstrapping || user === null
? 'bootstrapping'
: 'authenticated';

const error = useUserStore((state) => state.error);
const isDegraded = bootstrapState === 'authenticated' && user === null && error !== null;

return {
isAuthenticated,
isBootstrapping,
isDegraded,
bootstrapState,
currentUserId,
user,

currentUser: user,
  };
}