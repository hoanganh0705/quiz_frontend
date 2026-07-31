'use client';

/**
 * `useGoogleLogin` — React-binding layer for the Google Sign-In flow.
 *
 * Source epic: Epic 2.6 — Google sign-in parity.
 * Source ticket: TKT-2.6.T9.
 *
 * ## State machine
 *
 *   idle → provider_initializing → provider_pending → exchange_pending → success | error
 *   error → idle (via `reset`)
 *
 * The hook orchestrates two distinct phases:
 *
 *   1. **Provider phase**: Google Identity Services renders the popup/One Tap.
 *      The state transitions are `idle → provider_initializing → provider_pending`.
 *      The user may cancel the popup at any point; this returns to `idle`.
 *
 *   2. **Exchange phase**: The hook exchanges the Google ID token with our backend.
 *      The state transitions are `provider_pending → exchange_pending → success | error`.
 *      Errors are mapped to `GoogleLoginErrorKind` via `mapGoogleLoginError`.
 *
 * ## Why the hook owns `clearAuthToken`
 *
 * The hook clears the auth token before initiating a new Google sign-in.
 * This handles the edge case where an authenticated user initiates Google
 * sign-in for a different account. The credential login flow doesn't need
 * this because the user is already on the login page (not authenticated).
 *
 * ## Single-flight discipline
 *
 * Rapid repeated calls to `startGoogleLogin()` share the same in-flight
 * `Promise`. The `useRef` ensures that:
 *
 *   1. Multiple clicks during the provider phase resolve to the same exchange.
 *   2. Multiple clicks during the exchange phase resolve to the same result.
 *
 * ## Cleanup on unmount
 *
 * If the component unmounts mid-flight, the in-flight slot is cleared so
 * a subsequent mount starts fresh.
 */

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
  /** Whether Google sign-in is available (configured + SDK loaded). */
  isAvailable: boolean;
  /** Initiate the Google sign-in flow. */
  start: () => Promise<GoogleLoginSubmitResult>;
  /** Reset to idle state. */
  reset: () => void;
}

const initialState: UseGoogleLoginState = { status: 'idle' };

export function useGoogleLogin(
  deps: GoogleLoginSubmitDeps = defaultGoogleLoginSubmitDeps,
): UseGoogleLogin {
  const [state, setState] = useState<UseGoogleLoginState>(initialState);
  const { isAuthenticated } = useAuthState();

  // Module-replacement for the in-flight slot.
  const inFlightRef = useRef<Promise<GoogleLoginSubmitResult> | null>(null);

  // Derived availability: Google Auth must be configured in env vars.
  const isAvailable = isGoogleAuthConfigured();

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      inFlightRef.current = null;
    };
  }, []);

  const start = useCallback(
    (): Promise<GoogleLoginSubmitResult> => {
      // Single-flight: share the in-flight promise.
      if (inFlightRef.current) {
        return inFlightRef.current;
      }

      // If user is already authenticated, clear the session first.
      // This handles the edge case where an authenticated user initiates
      // Google sign-in for a different account.
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

/**
 * Internal async function that performs the Google sign-in flow.
 * Extracted so it can be awaited by the single-flight logic in `start()`.
 */
async function doGoogleSignIn(
  deps: GoogleLoginSubmitDeps,
  setState: React.Dispatch<React.SetStateAction<UseGoogleLoginState>>,
  inFlightRef: RefObject<Promise<GoogleLoginSubmitResult> | null>,
): Promise<GoogleLoginSubmitResult> {
  try {
    // 1. Load the Google Identity Services SDK.
    setState({ status: 'provider_initializing' });

    const google = await loadGoogleSDK();

    if (!google) {
      // SDK unavailable — this is a retryable error, not a conflict.
      const result = { kind: 'error' as const, errorKind: 'retryable' as const };
      setState({ status: 'error', errorKind: result.errorKind });
      return result;
    }

    // 2. Request an ID token from Google.
    setState({ status: 'provider_pending' });

    const idToken = await requestGoogleToken(google);

    if (!idToken) {
      // User cancelled or popup blocked — return to idle silently.
      setState({ status: 'idle' });
      return { kind: 'error', errorKind: 'retryable' };
    }

    // 3. Check if the token is expired client-side.
    if (isTokenExpired(idToken)) {
      const result = { kind: 'error' as const, errorKind: 'invalid_token' as const };
      setState({ status: 'error', errorKind: result.errorKind });
      return result;
    }

    // 4. Exchange the Google ID token with our backend.
    setState({ status: 'exchange_pending' });

    const result = await googleLoginSubmit(idToken, deps);

    if (result.kind === 'success') {
      setState({ status: 'success', user: result.user });
    } else {
      setState({ status: 'error', errorKind: result.errorKind });
    }

    return result;
  } catch {
    // Unexpected error — treat as retryable.
    const result = { kind: 'error' as const, errorKind: 'retryable' as const };
    setState({ status: 'error', errorKind: result.errorKind });
    return result;
  } finally {
    // Release the in-flight slot.
    inFlightRef.current = null;
  }
}

/**
 * Requests an ID token from Google Identity Services.
 *
 * Uses the `google.accounts.id.prompt()` API which shows the One Tap prompt
 * or falls back to the button-based flow. The function returns a Promise
 * that resolves with the ID token or null if the user cancelled.
 */
function requestGoogleToken(google: GoogleIdentity): Promise<string | null> {
  return new Promise((resolve) => {
    // Set a timeout in case the popup is blocked or Google doesn't respond.
    const timeoutId = setTimeout(() => {
      resolve(null);
    }, 120_000); // 2 minutes

    // The prompt() API shows the One Tap UI or auto-selects the session.
    // If no session is found, it may show an account picker.
    google.accounts.id.prompt((response: GoogleTokenResponse) => {
      clearTimeout(timeoutId);

      if (response.credential) {
        resolve(response.credential);
      } else {
        // No credential means: user cancelled, popup blocked, or an error occurred.
        resolve(null);
      }
    });
  });
}
