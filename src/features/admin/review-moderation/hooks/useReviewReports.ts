'use client';

import { useCallback, useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import {
useCursorPaginated,
type CursorFetcherArgs,
type CursorPage,
type UseCursorPaginatedResult,
} from '@/lib/api';

import { listReviewReports } from '@/features/admin/services/review-moderation.service';

import {
REVIEW_REPORTS_PAGE_SIZE,
type AdminReportDto,
type ReportState,
} from '../admin-report-types';

export type ReviewReportsShow = 'pending' | 'resolved';

export const REVIEW_REPORTS_SHOW_VALUES: readonly ReviewReportsShow[] =
Object.freeze(['pending', 'resolved'] as const);

export const DEFAULT_REVIEW_REPORTS_SHOW: ReviewReportsShow = 'pending';

export function isReviewReportsShow(value: unknown): value is ReviewReportsShow {
return (
value === 'pending' || value === 'resolved'
  );
}

export function normalizeReviewReportsShow(
value: unknown,
): ReviewReportsShow {
return isReviewReportsShow(value) ? value : DEFAULT_REVIEW_REPORTS_SHOW;
}

type ListReviewReportsWireResponse = {
data?: unknown;
meta?: {
pagination?: {
kind?: string;
limit?: number;
nextCursor?: string | null;
hasNextPage?: boolean;
    };
  };
};

export interface UseReviewReportsFetcherParams {
show: ReviewReportsShow;
}

export interface UseReviewReportsParams {

enabled?: boolean;
}

export interface UseReviewReportsResult extends Omit<
UseCursorPaginatedResult<AdminReportDto & { id: string }>,
'refresh'
> {

show: ReviewReportsShow;

setShow: (next: ReviewReportsShow) => void;

refresh: () => Promise<void>;
}

export function reviewReportsKey(
show: ReviewReportsShow,
): readonly unknown[] {
return ['admin', 'review-reports', 'list', show];
}

export function reviewReportsKeyMatcher(
key: unknown,
): boolean {
return (
Array.isArray(key) &&
key[0] === 'admin' &&
key[1] === 'review-reports' &&
key[2] === 'list'
  );
}

function buildServiceFilter(
show: ReviewReportsShow,
): { status?: ReportState } {
if (show === 'pending') {
return { status: 'open' };
  }
return {};
}

function readShowFromSearchParams(
searchParams: ReadonlyURLSearchParams | null,
): ReviewReportsShow {
if (searchParams === null) {
return DEFAULT_REVIEW_REPORTS_SHOW;
  }
return normalizeReviewReportsShow(searchParams.get('show'));
}

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

export function useReviewReports(
params: UseReviewReportsParams = {},
): UseReviewReportsResult {
const { enabled = true } = params;
const router = useRouter();
const searchParams = useSearchParams();

const show = useMemo<ReviewReportsShow>(
() => readShowFromSearchParams(searchParams),
[searchParams],
  );

const key = useMemo(
() => (enabled ? reviewReportsKey(show) : ['admin', 'review-reports', 'disabled']),
[enabled, show],
  );

const fetcher = useMemo(
() =>
async ({
cursor,
      }: CursorFetcherArgs<UseReviewReportsFetcherParams>): Promise<
CursorPage<AdminReportDto & { id: string }>
      > => {

const wire = (await listReviewReports({
...buildServiceFilter(show),
limit: REVIEW_REPORTS_PAGE_SIZE,
...(cursor !== null ? { cursor } : {}),
        })) as unknown as ListReviewReportsWireResponse | undefined;

const rawItems = Array.isArray(wire?.data)
? (wire!.data as AdminReportDto[])
: [];
const items = rawItems.map((item) => ({
...item,
id: item.reportId,
        }));

const pagination = wire?.meta?.pagination;
const page: CursorPage<AdminReportDto & { id: string }> = {
items,
nextCursor: pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit: pagination?.limit ?? items.length,
        };
return page;
      },
[show],
  );

const setShow = useCallback(
(next: ReviewReportsShow): void => {
const target = normalizeReviewReportsShow(next);
const url = new URL(window.location.href);
if (target === DEFAULT_REVIEW_REPORTS_SHOW) {
url.searchParams.delete('show');
      } else {
url.searchParams.set('show', target);
      }
const nextSearch = url.searchParams.toString();
router.replace(
nextSearch.length === 0
? url.pathname
: `${url.pathname}?${nextSearch}`,
{ scroll: false },
      );
    },
[router],
  );

const paginated = useCursorPaginated<
AdminReportDto & { id: string },
UseReviewReportsFetcherParams
  >({
key,
fetcher,
params: { show },
paginationKind: 'cursor',
  });

return {
items: paginated.items,
isLoading: paginated.isLoading,
isLoadingMore: paginated.isLoadingMore,
hasMore: paginated.hasMore,
loadMore: paginated.loadMore,
error: paginated.error,
refresh: paginated.refresh,
retryBannerVisible: paginated.retryBannerVisible,
show,
setShow,
  };
}
