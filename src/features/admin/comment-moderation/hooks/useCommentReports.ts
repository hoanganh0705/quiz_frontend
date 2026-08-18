'use client';

import { useCallback, useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import {
useCursorPaginated,
type CursorFetcherArgs,
type CursorPage,
type UseCursorPaginatedResult,
} from '@/lib/api';

import { listCommentReports } from '@/features/admin/services/comment-moderation.service';

import {
COMMENT_REPORTS_PAGE_SIZE,
type CommentReportDto,
type CommentReportState,
} from '../admin-comment-report-types';
import {
DEFAULT_COMMENT_REPORT_SHOW_FILTER,
isCommentReportShowFilter,
type CommentReportShowFilter,
} from '../admin-comment-report-types';

export type CommentReportsShow = CommentReportShowFilter;

export const COMMENT_REPORTS_SHOW_VALUES: readonly CommentReportsShow[] =
Object.freeze(['pending', 'resolved'] as const);

export const DEFAULT_COMMENT_REPORTS_SHOW: CommentReportsShow =
DEFAULT_COMMENT_REPORT_SHOW_FILTER;

type ListCommentReportsWireResponse = {
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

export interface UseCommentReportsFetcherParams {
show: CommentReportsShow;
}

export interface UseCommentReportsParams {

enabled?: boolean;
}

export interface UseCommentReportsResult extends Omit<
UseCursorPaginatedResult<CommentReportDto & { id: string }>,
'refresh'
> {

show: CommentReportsShow;

setShow: (next: CommentReportsShow) => void;

refresh: () => Promise<void>;
}

export function commentReportsKey(
show: CommentReportsShow,
): readonly unknown[] {
return ['admin', 'comment-reports', 'list', show];
}

export function commentReportsKeyMatcher(key: unknown): boolean {
return (
Array.isArray(key) &&
key[0] === 'admin' &&
key[1] === 'comment-reports' &&
key[2] === 'list'
  );
}

export function isCommentReportsShow(value: unknown): value is CommentReportsShow {
return isCommentReportShowFilter(value);
}

export function normalizeCommentReportsShow(
value: unknown,
): CommentReportsShow {
return isCommentReportsShow(value) ? value : DEFAULT_COMMENT_REPORTS_SHOW;
}

function buildServiceFilter(
show: CommentReportsShow,
): { status?: CommentReportState } {
if (show === 'pending') {
return { status: 'open' };
  }
return {};
}

function readShowFromSearchParams(
searchParams: ReadonlyURLSearchParams | null,
): CommentReportsShow {
if (searchParams === null) {
return DEFAULT_COMMENT_REPORTS_SHOW;
  }
return normalizeCommentReportsShow(searchParams.get('show'));
}

type ReadonlyURLSearchParams = ReturnType<typeof useSearchParams>;

export function useCommentReports(
params: UseCommentReportsParams = {},
): UseCommentReportsResult {
const { enabled = true } = params;
const router = useRouter();
const searchParams = useSearchParams();

const show = useMemo<CommentReportsShow>(
() => readShowFromSearchParams(searchParams),
[searchParams],
  );

const key = useMemo(
() =>
enabled
? commentReportsKey(show)
: ['admin', 'comment-reports', 'disabled'],
[enabled, show],
  );

const fetcher = useMemo(
() =>
async ({
cursor,
      }: CursorFetcherArgs<UseCommentReportsFetcherParams>): Promise<
CursorPage<CommentReportDto & { id: string }>
      > => {

const wire = (await listCommentReports({
...buildServiceFilter(show),
limit: COMMENT_REPORTS_PAGE_SIZE,
...(cursor !== null ? { cursor } : {}),
        })) as unknown as ListCommentReportsWireResponse | undefined;

const rawItems = Array.isArray(wire?.data)
? (wire!.data as CommentReportDto[])
: [];
const items = rawItems.map((item) => ({
...item,
id: item.reportId,
        }));

const pagination = wire?.meta?.pagination;
const page: CursorPage<CommentReportDto & { id: string }> = {
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
(next: CommentReportsShow): void => {
const target = normalizeCommentReportsShow(next);
const url = new URL(window.location.href);
if (target === DEFAULT_COMMENT_REPORTS_SHOW) {
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
CommentReportDto & { id: string },
UseCommentReportsFetcherParams
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
