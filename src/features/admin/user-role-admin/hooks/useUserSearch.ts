

import { useCallback, useMemo, useRef, useState } from 'react';

import useSWR from 'swr';

import { ApiError } from '@/lib/api/core/ApiError';
import { getFeatureFlagValue } from '@/lib/feature-flags';

import type { UserSearchResultDto } from '../user-role-admin-types';
import { userRoleAdminSearchKey } from '../user-role-admin-cache';

export const USER_SEARCH_DEBOUNCE_MS = 300;

export const USER_SEARCH_MIN_QUERY_LENGTH = 2;

interface SearchUsersResponse {
users: UserSearchResultDto[];
total: number;
}

interface SocialUserSearchResult {
userId: string;
username: string;
email: string;
avatarUrl: string | null;
}

function useDebouncedValue(value: string, delay: number): { debouncedValue: string } {
const [debouncedValue, setDebouncedValue] = useState(value);
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

useMemo(() => {
if (timeoutRef.current) {
clearTimeout(timeoutRef.current);
    }
timeoutRef.current = setTimeout(() => {
setDebouncedValue(value);
    }, delay);

return () => {
if (timeoutRef.current) {
clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

return { debouncedValue };
}

export interface UseUserSearchResult {

readonly users: readonly UserSearchResultDto[];

readonly total: number;

readonly isLoading: boolean;

readonly isStale: boolean;

readonly error: ApiError | null;

readonly loadMore: () => void;

readonly hasMore: boolean;
}

const FALLBACK_RESULT: UseUserSearchResult = Object.freeze({
users: [],
total: 0,
isLoading: false,
isStale: false,
error: null,
loadMore: () => undefined,
hasMore: false,
});

export function useUserSearch(query: string): UseUserSearchResult {

const flagValue = getFeatureFlagValue('admin_user_role_live');
const isFlagPlaceholder = flagValue === 'placeholder';

if (isFlagPlaceholder) {
return FALLBACK_RESULT;
  }

const normalizedQuery = query.trim().toLowerCase();

if (normalizedQuery.length < USER_SEARCH_MIN_QUERY_LENGTH) {
return FALLBACK_RESULT;
  }

const { debouncedValue: debouncedQuery } = useDebouncedValue(
normalizedQuery,
USER_SEARCH_DEBOUNCE_MS,
  );

const key = useMemo<readonly [string, string] | null>(
() =>
debouncedQuery.length >= USER_SEARCH_MIN_QUERY_LENGTH
? [userRoleAdminSearchKey(debouncedQuery), debouncedQuery] as const
: null,
[debouncedQuery],
  );

const fetcher = useCallback(async (): Promise<SearchUsersResponse> => {

const response = await fetch(
`/api/v1/social/users/search?query=${encodeURIComponent(debouncedQuery)}`,
{
credentials: 'same-origin',
headers: { Accept: 'application/json' },
      },
    );

if (!response.ok) {
throw new ApiError({
isAxiosError: true,
name: 'FetchError',
message: 'User search failed',
config: undefined,
request: undefined,
response: {
status: response.status,
data: {
status: response.status,
detail: 'User search failed',
title: 'SearchError',
          },
        },
toJSON: () => ({}),
      } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
    }

const data = await response.json() as { items?: SocialUserSearchResult[]; users?: SocialUserSearchResult[]; total?: number };

const items = (data.items ?? data.users ?? []) as SocialUserSearchResult[];

return {
users: items.map((item): UserSearchResultDto => ({
userId: item.userId,
username: item.username,
email: item.email,
avatar: item.avatarUrl,
currentRoles: [], // User search doesn't return roles; we'll fetch them separately
      })),
total: data.total ?? items.length,
    };
  }, [debouncedQuery]);

const { data, error, isLoading } = useSWR<
SearchUsersResponse,
ApiError
  >(key, fetcher, {
revalidateOnFocus: false,
revalidateOnReconnect: true,
  });

const loadMore = useCallback(() => {
    // Pagination not implemented in this stub
    // TODO: Implement pagination if needed
  }, []);

return {
users: data?.users ?? [],
total: data?.total ?? 0,
isLoading,
isStale: isLoading,
error: error ?? null,
loadMore,
hasMore: false, // Pagination not implemented
  };
}
