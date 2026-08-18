'use client';

import {
createContext,
useCallback,
useContext,
useEffect,
useMemo,
useRef,
useState,
type ReactNode,
} from 'react';
import { getAuth } from '@/lib/api';

const singleflight = async <T,>(_key: string, fn: () => Promise<T>): Promise<T> => fn();
const sharedBootstrapRefresh = async (): Promise<void> => {};
import { handleTerminal401 } from '@/features/auth/utils/auth-redirect';
import { clearAllAuthCache } from '@/features/auth/utils/user-scoped-cache';
import { clearVerificationFlags } from '@/features/auth/utils/verification-flag';
import {
subscribeToAuthEvents,
type AuthEvent,
} from '@/lib/api/core/broadcast-channel';
import {
subscribeToProfileEvents,
type ProfileUpdatedEvent,
} from '@/lib/api/core/profile-broadcast-channel';
import type { CurrentUserResponseDto } from '@/features/auth/types';
import type { UserMeResponseDto } from '@/features/users/types';
import type { ApiError } from '@/lib/api';

export type BootstrapState =
| 'idle'
  | 'bootstrapping'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

export interface BootstrapData {
currentUser: CurrentUserResponseDto;
user: UserMeResponseDto;
}

export interface AuthBootstrapValue {

bootstrapState: BootstrapState;
isBootstrapping: boolean;
isAuthenticated: boolean;
isDegraded: boolean;

currentUser: CurrentUserResponseDto | null;
user: UserMeResponseDto | null;

error: Error | null;
profileError: Error | null;

refetch: () => Promise<void>;
clearBootstrap: () => void;
}

const AuthBootstrapContext = createContext<AuthBootstrapValue | null>(null);

interface AuthBootstrapProviderProps {
children: ReactNode;
}

export function AuthBootstrapProvider({
children,
}: AuthBootstrapProviderProps): React.ReactElement {
const [bootstrapState, setBootstrapState] =
useState<BootstrapState>('idle');
const [currentUser, setCurrentUser] =
useState<CurrentUserResponseDto | null>(null);
const [user, setUser] = useState<UserMeResponseDto | null>(null);
const [error, setError] = useState<Error | null>(null);
const [profileError, setProfileError] = useState<Error | null>(null);

const doBootstrapRef = useRef<() => Promise<void>>(async () => {});
const clearBootstrapRef = useRef<() => void>(() => {});

const doBootstrap = useCallback(async () => {
const bootstrapKey = 'auth-bootstrap';

try {
setBootstrapState('bootstrapping');
setError(null);
setProfileError(null);

try {
await sharedBootstrapRefresh();
      } catch {
        // Refresh failed — this will likely result in 401, which we handle below
      }

const [identityResult, profileResult] = await Promise.allSettled([
singleflight(bootstrapKey + '-identity', async () => {
const wire = await getAuth().authControllerGetCurrentUser();
if (!wire || (wire as { data?: unknown }).data === undefined) {
throw new Error('No data returned from /auth/me');
          }
return (wire as { data: CurrentUserResponseDto }).data;
        }),
singleflight(bootstrapKey + '-profile', async () => {
const { getUsers } = await import('@/lib/api');
const wire = await getUsers().userControllerMe();
if (
!wire ||
(wire as { data?: unknown }).data === undefined
          ) {
throw new Error('No data returned from /users/me');
          }
return (wire as { data: UserMeResponseDto }).data;
        }),
      ]);

if (identityResult.status === 'rejected') {
const identityError =
identityResult.reason instanceof Error
? identityResult.reason
: new Error('Identity fetch failed');
throw identityError;
      }

setCurrentUser(identityResult.value);

if (profileResult.status === 'rejected') {
const profError =
profileResult.reason instanceof Error
? profileResult.reason
: new Error('Profile fetch failed');
setProfileError(profError);
setBootstrapState('authenticated');
return;
      }

setUser(profileResult.value);
setBootstrapState('authenticated');
    } catch (err) {
const caughtError =
err instanceof Error ? err : new Error('Bootstrap failed');
setError(caughtError);

const is401 = isAuthError(caughtError);

if (is401) {
clearAllAuthCache();
handleTerminal401();
setBootstrapState('unauthenticated');
      } else {
setBootstrapState('error');
      }
    }
  }, []);

doBootstrapRef.current = doBootstrap;

function isAuthError(error: Error): boolean {
if (typeof (error as ApiError).status === 'number') {
return (error as ApiError).status === 401;
    }
return (
error.message.includes('401') ||
error.message.includes('Unauthorized') ||
error.message.includes('unauthorized')
    );
  }

const refetch = useCallback(async () => {
await doBootstrap();
  }, [doBootstrap]);

const clearBootstrap = useCallback(() => {
setBootstrapState('idle');
setCurrentUser(null);
setUser(null);
setError(null);
setProfileError(null);
  }, []);

clearBootstrapRef.current = clearBootstrap;

useEffect(() => {
void doBootstrapRef.current();

  }, []);

useEffect(() => {
const handleAuthEvent = (event: AuthEvent) => {
switch (event.type) {
case 'LOGGED_OUT': {
clearBootstrapRef.current();
clearVerificationFlags();
break;
        }

case 'LOGGED_IN': {
clearAllAuthCache();
clearBootstrapRef.current();
clearVerificationFlags();
void doBootstrapRef.current();
break;
        }

case 'TOKEN_REFRESHED': {
break;
        }
      }
    };

const unsubscribe = subscribeToAuthEvents(handleAuthEvent);
return () => {
unsubscribe();
    };

  }, []);

useEffect(() => {
const handleProfileEvent = (_event: ProfileUpdatedEvent) => {
void doBootstrapRef.current();
    };

const unsubscribe = subscribeToProfileEvents(handleProfileEvent);
return () => {
unsubscribe();
    };

  }, []);

useEffect(() => {
const handleAuthStateChange = () => {
if (typeof document === 'undefined') return;
const hasToken = document.cookie.includes('auth_token=');
if (!hasToken) {
clearBootstrapRef.current();
      }
    };

window.addEventListener('auth-state-change', handleAuthStateChange);
return () => {
window.removeEventListener('auth-state-change', handleAuthStateChange);
    };

  }, []);

useEffect(() => {
let cleanup: (() => void) | undefined;
let cancelled = false;
void import('@/lib/social/social-list-loaded-broadcast-channel').then(
(mod) => {
if (cancelled) return;
cleanup = mod.installSocialListLoadedLogoutReset();
      },
    );
return () => {
cancelled = true;
if (typeof cleanup === 'function') {
cleanup();
      }
    };
  }, []);

const value = useMemo<AuthBootstrapValue>(
() => ({
bootstrapState,
isBootstrapping: bootstrapState === 'bootstrapping',
isAuthenticated:
bootstrapState === 'authenticated' || bootstrapState === 'bootstrapping',
isDegraded: bootstrapState === 'authenticated' && profileError !== null,
currentUser,
user,
error,
profileError,
refetch,
clearBootstrap,
    }),
[
bootstrapState,
currentUser,
user,
error,
profileError,
refetch,
clearBootstrap,
    ]
  );

return (
<AuthBootstrapContext.Provider value={value}>
{children}
</AuthBootstrapContext.Provider>
  );
}

export function useAuthBootstrap(): AuthBootstrapValue {
const context = useContext(AuthBootstrapContext);
if (context === null) {
throw new Error(
'useAuthBootstrap must be used within an AuthBootstrapProvider'
    );
  }
return context;
}