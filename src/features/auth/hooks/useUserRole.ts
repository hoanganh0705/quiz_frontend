'use client';

import useSWR from 'swr';

import { ApiError, getAuth } from '@/lib/api';
import type { CurrentUserResponseDto } from '@/lib/api';
import { getAuthToken } from '@/features/auth/utils/auth-cookies';

export const USER_ROLE_KEY = 'auth:current-user-role' as const;

export interface UseUserRole {
  isLoading: boolean;
  error: ApiError | null;
  role: string | null;
  isVerified: boolean;
}

async function fetchCurrentUserRole(): Promise<CurrentUserResponseDto | null> {
  const token = getAuthToken();
  if (!token) return null;
  const result = await getAuth().authControllerGetCurrentUser();
  return result.data ?? null;
}

export function useUserRole(): UseUserRole {
  const { data, error, isLoading } = useSWR<CurrentUserResponseDto | null, ApiError>(
    USER_ROLE_KEY,
    fetchCurrentUserRole,
  );

  return {
    isLoading: Boolean(isLoading) && data === undefined,
    error: error ?? null,
    role: data?.role ?? null,
    isVerified: data?.isVerified ?? false,
  };
}
