/**
 * `features/admin/user-role-admin/hooks/useUserSearch.ts`
 *
 * Source epic:   Epic 7.10 — User Role Grant: USER_GRANT_ROLE with Secondary Confirm.
 * Source ticket: TKT-7.10.C1.
 *
 * ## What this hook owns
 *
 * User search hook for the user role admin surface. This is a local stub
 * that provides a debounced user search interface. It wraps the social
 * user search service or provides a local implementation.
 *
 * ## Why a local stub
 *
 * The Phase 6 `useUserSearch` hook is designed for the social discovery
 * surface with friend/block relationships. The user role admin surface
 * needs a simpler search that just returns user info (userId, username,
 * email, avatar, currentRoles). This local stub provides the simplified
 * interface.
 *
 * ## Search behavior
 *
 * - Debounces at 300ms
 * - Minimum query length: 2 characters
 * - Returns normalized UserSearchResultDto[] results
 * - Handles loading and error states
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import useSWR from 'swr';

import { ApiError } from '@/lib/api/core/ApiError';
import { getFeatureFlagValue } from '@/lib/feature-flags';

import type { UserSearchResultDto } from '../user-role-admin-types';
import { userRoleAdminSearchKey } from '../user-role-admin-cache';

// ─── Constants ────────────────────────────────────────────────────────────

/** Debounce delay in milliseconds */
export const USER_SEARCH_DEBOUNCE_MS = 300;

/** Minimum query length */
export const USER_SEARCH_MIN_QUERY_LENGTH = 2;

/**
 * Phase 6 useUserSearch verdict from TKT-7.10.A1.
 * If Phase 6 hook is available and compatible, this stub can be replaced.
 * Currently using a local stub for the simplified user role admin interface.
 */

// ─── Internal types ───────────────────────────────────────────────────────

interface SearchUsersResponse {
  users: UserSearchResultDto[];
  total: number;
}

/** Raw search result from the social search endpoint */
interface SocialUserSearchResult {
  userId: string;
  username: string;
  email: string;
  avatarUrl: string | null;
}

/**
 * Simple debounce implementation
 */
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

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseUserSearchResult {
  /** Search results for the current query */
  readonly users: readonly UserSearchResultDto[];
  /** Total number of results */
  readonly total: number;
  /** True while a search request is in-flight */
  readonly isLoading: boolean;
  /** True when the first search has not yet resolved */
  readonly isStale: boolean;
  /** The current error, if any */
  readonly error: ApiError | null;
  /** Load more results (for pagination) */
  readonly loadMore: () => void;
  /** True when there are more pages to load */
  readonly hasMore: boolean;
}

// ─── Safe fallback ───────────────────────────────────────────────────────

const FALLBACK_RESULT: UseUserSearchResult = Object.freeze({
  users: [],
  total: 0,
  isLoading: false,
  isStale: false,
  error: null,
  loadMore: () => undefined,
  hasMore: false,
});

// ─── Hook ────────────────────────────────────────────────────────────────

/**
 * Search for users for the user role admin surface.
 *
 * @param query - The raw search query
 * @returns Search results with loading/error states
 */
export function useUserSearch(query: string): UseUserSearchResult {
  // Feature flag gating
  const flagValue = getFeatureFlagValue('phase7_admin_user_role');
  const isFlagPlaceholder = flagValue === 'placeholder';

  if (isFlagPlaceholder) {
    return FALLBACK_RESULT;
  }

  // Normalize query
  const normalizedQuery = query.trim().toLowerCase();

  // Short-circuit for empty/short queries
  if (normalizedQuery.length < USER_SEARCH_MIN_QUERY_LENGTH) {
    return FALLBACK_RESULT;
  }

  // Debounce
  const { debouncedValue: debouncedQuery } = useDebouncedValue(
    normalizedQuery,
    USER_SEARCH_DEBOUNCE_MS,
  );

  // SWR key
  const key = useMemo<readonly [string, string] | null>(
    () =>
      debouncedQuery.length >= USER_SEARCH_MIN_QUERY_LENGTH
        ? [userRoleAdminSearchKey(debouncedQuery), debouncedQuery] as const
        : null,
    [debouncedQuery],
  );

  // Fetcher
  const fetcher = useCallback(async (): Promise<SearchUsersResponse> => {
    // Call the social search endpoint
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

    // Normalize to UserSearchResultDto
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
