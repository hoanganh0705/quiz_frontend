

'use client';

import { useCallback, useEffect, useMemo } from 'react';

import {
subscribeToProfileEvents,
type ProfileUpdatedEvent,
} from '@/lib/api/core/profile-broadcast-channel';
import {
useUserStore,
} from '@/features/users/store/user-store';
import type { UserMeResponseDto } from '@/features/users/types/user-backend';

export interface UseMyProfileReturn {

profile: UserMeResponseDto | null;

isLoading: boolean;

isHydrated: boolean;

error: string | null;

refetch: () => Promise<UserMeResponseDto | null>;
}

export function useMyProfile(): UseMyProfileReturn {
const profile = useUserStore((s) => s.user);
const isLoading = useUserStore((s) => s.isLoading);
const error = useUserStore((s) => s.error);
const fetchCurrentUser = useUserStore((s) => s.fetchCurrentUser);

const isHydrated = profile !== null;

const refetch = useCallback(async (): Promise<UserMeResponseDto | null> => {
const result = await fetchCurrentUser();
return result ?? null;
  }, [fetchCurrentUser]);

useEffect(() => {
const handler = (event: ProfileUpdatedEvent) => {

if (!profile || event.userId !== profile.userId) return;

void refetch();
    };

const unsubscribe = subscribeToProfileEvents(handler);

return () => {
unsubscribe();
    };
  }, [profile, refetch]);

return useMemo<UseMyProfileReturn>(
() => ({
profile,
isLoading,
isHydrated,
error,
refetch,
    }),
[profile, isLoading, isHydrated, error, refetch],
  );
}
