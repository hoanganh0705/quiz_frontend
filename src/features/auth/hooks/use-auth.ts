'use client';

/**
 * `useAuth` — slim identity state hook (singleton pattern with deduplication).
 *
 * Only ONE fetch runs at a time (inFlightFetch dedup). The `useEffect` only
 * fires when the component first mounts or the token changes. After the first
 * successful fetch, we don't refetch on every re-render.
 */
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

// ─── Module-level singleton state ─────────────────────────────────────────────

let singletonState: UseAuthState = {
  currentUser: null,
  isLoading: true,
  error: null,
};

const listeners = new Set<() => void>();
let inFlightFetch: Promise<void> | null = null;

/**
 * Track the last token we fetched with. If the token changes, we need to
 * refetch. This prevents unnecessary fetches when the token hasn't changed.
 */
let lastFetchedToken: string | null = null;

/**
 * Prevent the useEffect from running on every render. We only want to fetch
 * once per mount (unless token changes).
 */
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

/**
 * Fetch the current user identity from `GET /auth/me`.
 */
async function fetchCurrentUserIdentity(): Promise<CurrentUserResponseDto> {
  const result = await getAuth().authControllerGetCurrentUser();
  if (!result || (result as { data?: unknown }).data === undefined) {
    throw new Error('No data returned from /auth/me');
  }
  return (result as { data: CurrentUserResponseDto }).data;
}

/**
 * Core fetch function. Only one fetch runs at a time (inFlightFetch dedup).
 * Skips fetch if we already have data for the current token.
 */
async function doFetch(): Promise<void> {
  const token = getAuthToken();

  // Deduplicate: if fetch is in progress, wait for it
  if (inFlightFetch) {
    return inFlightFetch;
  }

  // No token = not authenticated
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

  // Skip if we already have valid data for this token
  if (
    singletonState.currentUser !== null &&
    lastFetchedToken === token &&
    !singletonState.isLoading
  ) {
    return;
  }

  // Start the fetch
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

/**
 * Stable server snapshot — required by `useSyncExternalStore`. The
 * snapshot is the "no auth on the server" projection; React calls
 * this function during SSR and during the very first client render
 * (before hydration). Returning a NEW object on each call would
 * break the `===` snapshot identity contract and trigger
 *
 *   "The result of getServerSnapshot should be cached to avoid an
 *    infinite loop"
 *
 * plus cause React to discard the SSR snapshot on every render. We
 * freeze a single module-level reference and return it for every
 * call (the server never observes auth state).
 */
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

// ─── Public Hook ─────────────────────────────────────────────────────────────

export function useAuth(): UseAuth {
  const state = useSyncExternalStore(
    subscribeToStoreChanges,
    getSnapshot,
    getServerSnapshot,
  );

  const refetch = useCallback(async () => {
    // Clear the token cache so next fetch actually runs
    lastFetchedToken = null;
    await doFetch();
  }, []);

  /**
   * Auto-fetch on mount OR when token changes. The `token` dependency ensures
   * we refetch if the user logs in/out. The `currentUser` check ensures we
   * don't refetch on every re-render.
   */
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
