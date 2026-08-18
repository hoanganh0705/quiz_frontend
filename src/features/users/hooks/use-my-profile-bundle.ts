'use client'

import { useMemo } from 'react';
import {
ApiError,
coerceToApiError,
isApiError,
useSingleWithRetry,
} from '@/lib/api';
import type { SingleFetcher } from '@/lib/api/use-single-with-retry';
import { getUsers } from '@/lib/api';
import type {
TimeSeriesDto,
UserActivityItemDto,
UserAnalyticsResponseDto,
UserProfileBundleResponseDto,
UserSummaryResponseDto,
} from '@/lib/api/generated/schemas';

export interface UseMyProfileBundleResult {
summary: UserSummaryResponseDto | null;
analytics: UserAnalyticsResponseDto | null;
xpHistory: TimeSeriesDto | null;
recentActivity: readonly UserActivityItemDto[];
notFound: boolean;
isLoading: boolean;
error: ApiError | null;
retry: () => Promise<void>;
isRetrying: boolean;
}

function isNotFoundError(err: unknown): boolean {
if (!isApiError(err)) return false;
return err.status === 404;
}

export function useMyProfileBundle(): UseMyProfileBundleResult {
const key = useMemo(
() => ['useMyProfileBundle'] as const,
[],
  );

const fetcher = useMemo<SingleFetcher<UserProfileBundleResponseDto>>(
() => async ({ signal }) => {
let response: UserProfileBundleResponseDto | null;
try {
const envelope = await getUsers().userControllerGetMyProfileBundle();
const payload = (envelope?.data as UserProfileBundleResponseDto | undefined) ?? null;
response = payload;
      } catch (err) {
if (isApiError(err)) {
throw err;
        }
throw coerceToApiError(err);
      }
if (signal.aborted) {
throw new DOMException('aborted', 'AbortError');
      }
if (
response === null ||
typeof response !== 'object' ||
!('summary' in response)
      ) {
throw coerceToApiError(
new Error(
'[useMyProfileBundle] malformed profile bundle envelope',
          ),
        );
      }
return response;
    },
[],
  );

const swr = useSingleWithRetry<UserProfileBundleResponseDto>({ key, fetcher });

const notFound =
!swr.isLoading && swr.error !== null && isNotFoundError(swr.error);

const error = swr.error && !isNotFoundError(swr.error) ? swr.error : null;

const data = swr.data ?? null;

return {
summary: data?.summary ?? null,
analytics: data?.analytics ?? null,
xpHistory: data?.xpHistory ?? null,
recentActivity: data?.recentActivity ?? [],
notFound,
isLoading: swr.isLoading,
error,
retry: swr.retry,
isRetrying: swr.isRetrying,
  };
}