'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
getActiveSessions,
} from '@/features/auth/services/auth.service';
import { ApiError } from '@/lib/api/core/ApiError';
import type { SessionListItemDto, SessionListResponseDto } from '@/lib/api';

export type ActiveSessionsStatus =
| 'idle'
  | 'loading'
  | 'success'
  | 'error';

export type SessionsUpdater = (
current: SessionListItemDto[],
) => SessionListItemDto[];

export interface UseActiveSessionsResult {
sessions: SessionListItemDto[];
status: ActiveSessionsStatus;
error: ApiError | null;

currentSessionId: string | null;
revalidate: () => Promise<void>;

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

const inFlightRef = useRef<Promise<void> | null>(null);

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
