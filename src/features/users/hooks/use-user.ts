'use client';

import { useCallback, useEffect, useState } from 'react';
import { getUsers } from '@/lib/api';
import type { UserMeResponseDto } from '@/features/users/types';
import type { UserControllerMeResult } from '@/lib/api/generated/users/users';

export interface UseUserState {
user: UserMeResponseDto | null;
isLoading: boolean;
isDegraded: boolean;
error: Error | null;
}

export interface UseUserActions {
refetch: () => Promise<void>;
recoverFromDegraded: () => Promise<void>;
}

export type UseUser = UseUserState & UseUserActions;

async function fetchUserProfile(): Promise<UserMeResponseDto> {
const result: UserControllerMeResult = await getUsers().userControllerMe();
if (!result.data) {
throw new Error('No data returned from /users/me');
  }
return result.data;
}

const initialState: UseUserState = {
user: null,
isLoading: false,
isDegraded: false,
error: null,
};

export function useUser(): UseUser {
const [state, setState] = useState<UseUserState>(initialState);

const doFetch = useCallback(async (): Promise<void> => {
setState((prev) => ({ ...prev, isLoading: true, error: null }));
try {
const user = await fetchUserProfile();
setState({ user, isLoading: false, isDegraded: false, error: null });
    } catch (err) {
const error =
err instanceof Error ? err : new Error('Failed to fetch user profile');

setState((prev) => ({
...prev,
isLoading: false,
isDegraded: true,
error,
      }));
    }
  }, []);

const refetch = useCallback(async (): Promise<void> => {
await doFetch();
  }, [doFetch]);

const recoverFromDegraded = useCallback(async (): Promise<void> => {
await doFetch();
  }, [doFetch]);

useEffect(() => {
doFetch();
    // Intentionally empty deps — we want a single fetch on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

return {
...state,
refetch,
recoverFromDegraded,
  };
}
