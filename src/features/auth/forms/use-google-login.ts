'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import { clearAuthToken } from '@/features/auth/utils/auth-cookies';
import { isGoogleAuthConfigured } from '@/features/auth/config/google-identity.config';
import { loadGoogleSDK, type GoogleIdentity } from '@/features/auth/utils/google-sdk-loader';
import { isTokenExpired } from '@/features/auth/utils/google-token';
import type { GoogleTokenResponse } from '@/features/auth/utils/google-sdk-loader';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import {
googleLoginSubmit,
type GoogleLoginSubmitResult,
type GoogleLoginSubmitDeps,
defaultGoogleLoginSubmitDeps,
} from './google-login-submit';

export type UseGoogleLoginState =
| { status: 'idle' }
  | { status: 'provider_initializing' }
  | { status: 'provider_pending' }
  | { status: 'exchange_pending' }
  | { status: 'success'; user: NonNullable<Extract<GoogleLoginSubmitResult, { kind: 'success' }>['user']> }
  | { status: 'error'; errorKind: NonNullable<Extract<GoogleLoginSubmitResult, { kind: 'error' }>['errorKind']> };

export interface UseGoogleLogin {
state: UseGoogleLoginState;

isAvailable: boolean;

start: () => Promise<GoogleLoginSubmitResult>;

reset: () => void;
}

const initialState: UseGoogleLoginState = { status: 'idle' };

export function useGoogleLogin(
deps: GoogleLoginSubmitDeps = defaultGoogleLoginSubmitDeps,
): UseGoogleLogin {
const [state, setState] = useState<UseGoogleLoginState>(initialState);
const { isAuthenticated } = useAuthState();

const inFlightRef = useRef<Promise<GoogleLoginSubmitResult> | null>(null);

const isAvailable = isGoogleAuthConfigured();

useEffect(() => {
return () => {
inFlightRef.current = null;
    };
  }, []);

const start = useCallback(
(): Promise<GoogleLoginSubmitResult> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

if (isAuthenticated) {
clearAuthToken();
      }

setState({ status: 'provider_initializing' });

const promise = doGoogleSignIn(deps, setState, inFlightRef);
inFlightRef.current = promise;

return promise;
    },
[deps, isAuthenticated],
  );

const reset = useCallback(() => {
inFlightRef.current = null;
setState(initialState);
  }, []);

return { state, isAvailable, start, reset };
}

async function doGoogleSignIn(
deps: GoogleLoginSubmitDeps,
setState: React.Dispatch<React.SetStateAction<UseGoogleLoginState>>,
inFlightRef: RefObject<Promise<GoogleLoginSubmitResult> | null>,
): Promise<GoogleLoginSubmitResult> {
try {

setState({ status: 'provider_initializing' });

const google = await loadGoogleSDK();

if (!google) {

const result = { kind: 'error' as const, errorKind: 'retryable' as const };
setState({ status: 'error', errorKind: result.errorKind });
return result;
    }

setState({ status: 'provider_pending' });

const idToken = await requestGoogleToken(google);

if (!idToken) {

setState({ status: 'idle' });
return { kind: 'error', errorKind: 'retryable' };
    }

if (isTokenExpired(idToken)) {
const result = { kind: 'error' as const, errorKind: 'invalid_token' as const };
setState({ status: 'error', errorKind: result.errorKind });
return result;
    }

setState({ status: 'exchange_pending' });

const result = await googleLoginSubmit(idToken, deps);

if (result.kind === 'success') {
setState({ status: 'success', user: result.user });
    } else {
setState({ status: 'error', errorKind: result.errorKind });
    }

return result;
  } catch {

const result = { kind: 'error' as const, errorKind: 'retryable' as const };
setState({ status: 'error', errorKind: result.errorKind });
return result;
  } finally {

inFlightRef.current = null;
  }
}

function requestGoogleToken(google: GoogleIdentity): Promise<string | null> {
return new Promise((resolve) => {

const timeoutId = setTimeout(() => {
resolve(null);
    }, 120_000);

google.accounts.id.prompt((response: GoogleTokenResponse) => {
clearTimeout(timeoutId);

if (response.credential) {
resolve(response.credential);
      } else {

resolve(null);
      }
    });
  });
}
