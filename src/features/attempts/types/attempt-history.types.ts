

import type { AttemptSummaryResponseDto } from '@/lib/api/generated/schemas';

export type AttemptHistoryStatusFilter =
| 'all'
  | 'started'
  | 'completed'
  | 'abandoned';

export type AttemptHistoryDateRange =
| 'all'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days';

export interface AttemptHistoryFilters {

status: AttemptHistoryStatusFilter;

dateRange: AttemptHistoryDateRange;

search: string;

cursor: string | null;

limit?: number;
}

export const DEFAULT_ATTEMPT_HISTORY_FILTERS: AttemptHistoryFilters = {
status: 'all',
dateRange: 'all',
search: '',
cursor: null,
};

export interface AttemptHistoryPage {
items: readonly AttemptHistoryRow[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
}

export type AttemptHistoryRow = AttemptSummaryResponseDto & {
id: string;
};

export function serializeAttemptHistoryFilters(
filters: AttemptHistoryFilters,
): string {
const parts: string[] = [
`status=${filters.status}`,
`date=${filters.dateRange}`,
`q=${filters.search.trim().toLowerCase()}`,
  ];
if (filters.cursor !== null) {
parts.push(`cursor=${filters.cursor}`);
  }
if (typeof filters.limit === 'number') {
parts.push(`limit=${filters.limit}`);
  }
return parts.join('|');
}

export const ATTEMPT_HISTORY_CACHE_KEYS = {

list(sessionId: string, filters: AttemptHistoryFilters) {
return [
'attempts',
'history',
sessionId,
serializeAttemptHistoryFilters(filters),
    ] as const;
  },

all(sessionId: string) {
return ['attempts', 'history', sessionId, '*'] as const;
  },
} as const;