

import type { CursorPaginationNextCursor } from './cursorPaginationNextCursor';

export interface CursorPagination {

kind: string;

limit: number;

hasNextPage: boolean;

nextCursor: CursorPaginationNextCursor;
}
