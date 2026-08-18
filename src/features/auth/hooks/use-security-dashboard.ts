'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
getSecurityDashboard,
} from '@/features/auth/services/auth.service';
import { ApiError } from '@/lib/api/core/ApiError';
import type { AccountSecurityDto } from '@/lib/api';

export type SecurityDashboardStatus =
| 'idle'
  | 'loading'
  | 'success'
  | 'error';

export interface UseSecurityDashboardResult {
data: AccountSecurityDto | null;
status: SecurityDashboardStatus;
error: ApiError | null;
refetch: () => Promise<void>;
}

const initialState: Omit<UseSecurityDashboardResult, 'refetch'> = {
data: null,
status: 'idle',
error: null,
};

export interface UseSecurityDashboardDeps {
fetchSecurityDashboard: () => Promise<AccountSecurityDto>;
}

export const defaultSecurityDashboardDeps: UseSecurityDashboardDeps = {
fetchSecurityDashboard: getSecurityDashboard,
};

export function useSecurityDashboard(
deps: UseSecurityDashboardDeps = defaultSecurityDashboardDeps,
): UseSecurityDashboardResult {
const [state, setState] = useState<
Omit<UseSecurityDashboardResult, 'refetch'>
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
const data = await deps.fetchSecurityDashboard();
if (!mountedRef.current) return;
setState({ data, status: 'success', error: null });
    } catch (err: unknown) {
if (!mountedRef.current) return;
const error =
err && typeof err === 'object' && 'code' in err && 'status' in err
? (err as ApiError)
: null;
setState({
data: null,
status: 'error',
error,
      });
    }
  }, [deps]);

const refetch = useCallback(async (): Promise<void> => {
if (inFlightRef.current) {
return inFlightRef.current;
    }

const promise = doFetch().finally(() => {

inFlightRef.current = null;
    });

inFlightRef.current = promise;
return promise;
  }, [doFetch]);

useEffect(() => {
refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

return {
...state,
refetch,
  };
}
