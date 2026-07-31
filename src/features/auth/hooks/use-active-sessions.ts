'use client';

/**
 * `useActiveSessions` — fetches the active-sessions list with
 * revalidation + optimistic-mutation primitives.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T8.
 *
 * ## Purpose
 *
 * Wraps `getActiveSessions()` (`GET /auth/sessions`) in a React hook
 * that owns three primitives the rest of the Epic 2.8 UI needs:
 *
 *   1. **Read** — auto-fetches on mount and exposes `{ sessions,
 *      status, error }`.
 *   2. **Revalidate** — `revalidate()` is the single source of truth
 *      the revocation hooks call after any mutation (`useRevokeSession`,
 *      `useRevokeOtherSessions`, `useLogoutAll`); the list is the
 *      server-truth view of "what sessions exist right now".
 *   3. **Optimistic mutation** — `mutate(updater)` lets a row-revoke
 *      hook apply the change locally *before* the network call lands,
 *      so the row disappears the instant the user clicks Revoke.
 *      Failed mutations revert via the inverse pattern; the T17 hook
 *      wires this through.
 *
 * ## Current-session normalization
 *
 * The backend orders rows by `lastActiveAt desc` and marks exactly
 * one row with `isCurrentSession: true`. This hook defensively moves
 * the current-session row to position 0 — the visual badge and the
 * per-row revoke-button-disabled flag both rely on the current
 * session being discoverable without a full scan.
 *
 * ## `currentSessionId`
 *
 * Derived from the list (the row with `isCurrentSession === true`).
 * The revocation hooks read this so the row's revoke button can be
 * hidden on the current row (the safety guard from US-2.8.2 edge
 * case "A user targets the current session through the generic
 * revoke endpoint; the backend clears its refresh cookie and the
 * frontend must treat it as logout"). It is `null` until the list
 * loads.
 *
 * @see useSecurityDashboard (sister hook, 2.8.T7)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getActiveSessions,
} from '@/features/auth/service/auth.service';
import { ApiError } from '@/lib/api/core/ApiError';
import type { SessionListItemDto, SessionListResponseDto } from '@/lib/api';

/**
 * Load status. Same union as `useSecurityDashboard` (2.8.T7) so
 * the SessionRow / SessionList consumers can share their type
 * imports.
 */
export type ActiveSessionsStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error';

/**
 * Pure list updater. Receives the current list (possibly empty),
 * returns the next list. The reducer shape mirrors react-query's
 * `setQueryData(updater)` so it is familiar to anyone who has
 * used react-query.
 */
export type SessionsUpdater = (
  current: SessionListItemDto[],
) => SessionListItemDto[];

export interface UseActiveSessionsResult {
  sessions: SessionListItemDto[];
  status: ActiveSessionsStatus;
  error: ApiError | null;
  /**
   * `null` until the list has loaded successfully. After load, it
   * matches the row where `isCurrentSession === true`. Stays
   * constant through optimistic mutations.
   */
  currentSessionId: string | null;
  revalidate: () => Promise<void>;
  /**
   * Apply a local list update optimistically. The caller does NOT
   * need to wait for the network round-trip — they call `mutate`,
   * then fire the SDK call, then call `revalidate` on settle.
   */
  mutate: (updater: SessionsUpdater) => void;
}

const initialState: Pick<
  UseActiveSessionsResult,
  'sessions' | 'status' | 'error' | 'currentSessionId'
> = {
  sessions: [],
  status: 'idle',
  error: null,
  currentSessionId: null,
};

/**
 * Re-order so the current-session row is first; pass other rows
 * through untouched. Defensive — the backend already orders by
 * `lastActiveAt desc`, but the visual contract ("This device" at
 * the top) is not safe to depend on a server sort key that can
 * drift over time.
 */
function normalize(sessions: SessionListItemDto[]): SessionListItemDto[] {
  if (sessions.length <= 1) return sessions;
  const head = sessions.filter((s) => s.isCurrentSession);
  const tail = sessions.filter((s) => !s.isCurrentSession);
  return [...head, ...tail];
}

export interface UseActiveSessionsDeps {
  fetchActiveSessions: () => Promise<SessionListResponseDto>;
}

export const defaultActiveSessionsDeps: UseActiveSessionsDeps = {
  fetchActiveSessions: getActiveSessions,
};

export function useActiveSessions(
  deps: UseActiveSessionsDeps = defaultActiveSessionsDeps,
): UseActiveSessionsResult {
  const [state, setState] = useState<
    Pick<
      UseActiveSessionsResult,
      'sessions' | 'status' | 'error' | 'currentSessionId'
    >
  >(initialState);

  // In-flight tracker — same dedup discipline as T7.
  const inFlightRef = useRef<Promise<void> | null>(null);

  // Mount tracker — T7 pattern.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const doFetch = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const response = await deps.fetchActiveSessions();
      if (!mountedRef.current) return;
      const sessions = normalize(response.sessions ?? []);
      const currentSessionId =
        sessions.find((s) => s.isCurrentSession)?.sessionId ?? null;
      setState({
        sessions,
        status: 'success',
        error: null,
        currentSessionId,
      });
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const error =
        err && typeof err === 'object' && 'code' in err && 'status' in err
          ? (err as ApiError)
          : null;
      setState({
        sessions: [],
        status: 'error',
        error,
        currentSessionId: null,
      });
    }
  }, [deps]);

  const revalidate = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    const promise = doFetch().finally(() => {
      inFlightRef.current = null;
    });

    inFlightRef.current = promise;
    return promise;
  }, [doFetch]);

  const mutate = useCallback((updater: SessionsUpdater): void => {
    setState((prev) => {
      const nextSessions = normalize(updater(prev.sessions));
      const currentSessionId =
        nextSessions.find((s) => s.isCurrentSession)?.sessionId ?? null;
      return {
        ...prev,
        sessions: nextSessions,
        currentSessionId,
      };
    });
  }, []);

  useEffect(() => {
    revalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state,
    revalidate,
    mutate,
  };
}
