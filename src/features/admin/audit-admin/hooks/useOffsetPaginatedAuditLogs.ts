'use client';

import { useCallback, useMemo, useState } from 'react';

export const AUDIT_LOG_DEFAULT_PAGE_SIZE = 20;
export const AUDIT_LOG_MAX_PAGE_SIZE = 100;

export interface UseOffsetPaginatedAuditLogsParams {

readonly initialOffset?: number;

readonly initialLimit?: number;

readonly total: number;

readonly maxLimit?: number;
}

export interface UseOffsetPaginatedAuditLogsResult {

readonly offset: number;

readonly limit: number;

readonly page: number;

readonly totalPages: number;

readonly hasNextPage: boolean;

readonly hasPrevPage: boolean;

readonly goToPage: (page: number) => void;

readonly nextPage: () => void;

readonly prevPage: () => void;

readonly resetPagination: () => void;

readonly setOffset: (offset: number) => void;

readonly setLimit: (limit: number) => void;
}

function clampLimit(input: number, maxLimit: number): number {
if (typeof input !== 'number' || !Number.isFinite(input)) {
return AUDIT_LOG_DEFAULT_PAGE_SIZE;
  }
if (input <= 0) return AUDIT_LOG_DEFAULT_PAGE_SIZE;
if (input > maxLimit) return maxLimit;
return Math.floor(input);
}

export function useOffsetPaginatedAuditLogs(
params: UseOffsetPaginatedAuditLogsParams,
): UseOffsetPaginatedAuditLogsResult {
const {
initialOffset = 0,
initialLimit = AUDIT_LOG_DEFAULT_PAGE_SIZE,
total,
maxLimit = AUDIT_LOG_MAX_PAGE_SIZE,
  } = params;

const [offset, setOffsetState] = useState(() =>
Math.max(0, initialOffset),
  );
const [limit, setLimitState] = useState(() =>
clampLimit(initialLimit, maxLimit),
  );

const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
const totalPages = useMemo(
() => Math.max(1, Math.ceil(total / limit)),
[total, limit],
  );
const hasNextPage = useMemo(
() => offset + limit < total,
[offset, limit, total],
  );
const hasPrevPage = useMemo(() => offset > 0, [offset]);

const goToPage = useCallback(
(targetPage: number) => {
if (typeof targetPage !== 'number' || !Number.isFinite(targetPage)) {
return;
      }
const clampedPage = Math.max(1, Math.min(targetPage, totalPages));
const newOffset = (clampedPage - 1) * limit;
setOffsetState(newOffset);
    },
[limit, totalPages],
  );

const nextPage = useCallback(() => {
if (hasNextPage) {
setOffsetState((prev) => prev + limit);
    }
  }, [hasNextPage, limit]);

const prevPage = useCallback(() => {
if (hasPrevPage) {
setOffsetState((prev) => Math.max(0, prev - limit));
    }
  }, [hasPrevPage, limit]);

const resetPagination = useCallback(() => {
setOffsetState(0);
  }, []);

const setOffset = useCallback(
(newOffset: number) => {
if (typeof newOffset !== 'number' || newOffset < 0) return;
const maxOffset = Math.max(0, Math.floor(total / limit) * limit);
setOffsetState(Math.min(newOffset, maxOffset));
    },
[total, limit],
  );

const setLimit = useCallback(
(newLimit: number) => {
const clamped = clampLimit(newLimit, maxLimit);
setLimitState(clamped);

setOffsetState(0);
    },
[maxLimit],
  );

return {
offset,
limit,
page,
totalPages,
hasNextPage,
hasPrevPage,
goToPage,
nextPage,
prevPage,
resetPagination,
setOffset,
setLimit,
  };
}

export const useOffsetPaginated = useOffsetPaginatedAuditLogs;
export type UseOffsetPaginatedParams = UseOffsetPaginatedAuditLogsParams;
export type UseOffsetPaginatedResult = UseOffsetPaginatedAuditLogsResult;