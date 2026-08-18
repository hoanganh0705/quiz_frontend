'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { getAuth } from '@/lib/api';
import type { CurrentUserResponseDto } from '@/features/auth/types';
import {
getAuthToken,
subscribeToAuthChanges,
} from '@/features/auth/utils/auth-cookies';

export interface UseAuthState {
currentUser: CurrentUserResponseDto | null;
isLoading: boolean;
error: Error | null;
}

export interface UseAuthActions {
refetch: () => Promise<void>;
}

export type UseAuth = UseAuthState & UseAuthActions;

let singletonState: UseAuthState = {
currentUser: null,
isLoading: true,
error: null,
};

const listeners = new Set<() => void>();
let inFlightFetch: Promise<void> | null = null;

let lastFetchedToken: string | null = null;

function subscribeToStoreChanges(callback: () => void) {
listeners.add(callback);

const unsubscribeCookies = subscribeToAuthChanges(callback);

return () => {
listeners.delete(callback);
unsubscribeCookies();
  };
}

function notifyListeners() {
listeners.forEach((listener) => listener());
}

async function fetchCurrentUserIdentity(): Promise<CurrentUserResponseDto> {
const result = await getAuth().authControllerGetCurrentUser();
if (!result || (result as { data?: unknown }).data === undefined) {
throw new Error('No data returned from /auth/me');
  }
return (result as { data: CurrentUserResponseDto }).data;
}

async function doFetch(): Promise<void> {
const token = getAuthToken();

if (inFlightFetch) {
return inFlightFetch;
  }

if (!token) {
if (singletonState.currentUser !== null || singletonState.isLoading) {
singletonState = {
currentUser: null,
isLoading: false,
error: null,
      };
notifyListeners();
    }
return;
  }

if (
singletonState.currentUser !== null &&
lastFetchedToken === token &&
!singletonState.isLoading
  ) {
return;
  }

inFlightFetch = (async () => {
singletonState = {
...singletonState,
isLoading: true,
error: null,
    };
notifyListeners();

try {
const currentUser = await fetchCurrentUserIdentity();
lastFetchedToken = token;
singletonState = {
currentUser,
isLoading: false,
error: null,
      };
notifyListeners();
    } catch (err) {
const error =
err instanceof Error ? err : new Error('Failed to fetch current user');
singletonState = {
...singletonState,
isLoading: false,
error,
      };
notifyListeners();
    } finally {
inFlightFetch = null;
    }
  })();

return inFlightFetch;
}

const SERVER_AUTH_SNAPSHOT: UseAuthState = Object.freeze({
currentUser: null,
isLoading: true,
error: null,
}) as UseAuthState;

function getServerSnapshot(): UseAuthState {
return SERVER_AUTH_SNAPSHOT;
}

function getSnapshot(): UseAuthState {
return singletonState;
}

export function useAuth(): UseAuth {
const state = useSyncExternalStore(
subscribeToStoreChanges,
getSnapshot,
getServerSnapshot,
  );

const refetch = useCallback(async () => {

lastFetchedToken = null;
await doFetch();
  }, []);

const token = getAuthToken();
const hasFetchedRef = useRef(false);

useEffect(() => {
if (hasFetchedRef.current && singletonState.currentUser !== null) {
return;
    }
hasFetchedRef.current = true;
void doFetch();
  }, [token]);

return {
...state,
refetch,
  };
}
