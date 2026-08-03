/**
 * `MyQuizzesTable` — table wrapper for the author's quizzes list.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.D2.
 *
 * Renders `<thead>`, `<tbody>` (one `MyQuizzesTableRow` per item), and `<tfoot>`
 * with a load-more button. Accepts the cursor-pagination result shape from
 * `useMyQuizzes` / `useMyQuizzesDrafts` / `useMyQuizzesPublished`.
 *
 * ## Retry banner
 *
 * When `retryBannerVisible` is true (5xx from `useCursorPaginated`), renders
 * a dismissible banner above the table with a retry button.
 *
 * ## Empty state
 *
 * Renders `MyQuizzesTableEmpty` when items are empty. The caller passes the
 * current `tab` so the empty state renders the correct copy.
 */

import { useRouter } from "next/navigation";

import { AlertTriangle, ChevronsDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

import type { MyQuizListItem, MyQuizzesTab } from "@/features/quizzes/types/my-quizzes";
import type { UseCursorPaginatedResult } from "@/lib/api/use-cursor-paginated.types";

import { MyQuizzesTableEmpty } from "./MyQuizzesTableEmpty";
import { MyQuizzesTableRow } from "./MyQuizzesTableRow";

interface MyQuizzesTableProps {
  /** Cursor-paginated items. */
  items: readonly MyQuizListItem[];
  /** True while loading the first page. */
  isLoading: boolean;
  /** True while fetching the next page. */
  isLoadingMore: boolean;
  /** True when more pages are available. */
  hasMore: boolean;
  /** Called to load the next page. */
  loadMore: () => void;
  /** True when a 5xx error has occurred and a retry is available. */
  retryBannerVisible: boolean;
  /** Called to refresh (re-fetch from the first page). */
  refresh: () => Promise<void>;
  /** The active tab (used for empty state copy). */
  tab: "all" | "drafts" | "published";
}

const COLUMN_HEADERS = [
  /* checkbox */ "",
  /* title    */ "Title",
  /* slug     */ "Slug",
  /* status   */ "Status",
  /* q count  */ "Questions",
  /* updated  */ "Last Updated",
  /* actions  */ "Actions",
] as const;

function RetryBanner({
  onDismiss,
  onRetry,
}: {
  onDismiss: () => void;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
        Something went wrong loading your quizzes.
      </p>
      <Button
        size="sm"
        variant="outline"
        onClick={onRetry}
        className="shrink-0"
      >
        Retry
      </Button>
      <button
        onClick={onDismiss}
        className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

/**
 * Table container for the author's quizzes list.
 */
export function MyQuizzesTable({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  loadMore,
  retryBannerVisible,
  refresh,
  tab,
}: MyQuizzesTableProps): React.ReactElement {
  const router = useRouter();
  const isEmpty = items.length === 0 && !isLoading;

  return (
    <div className="flex flex-col gap-4">
      {retryBannerVisible && (
        <RetryBanner
          onDismiss={refresh}
          onRetry={refresh}
        />
      )}

      <Table aria-label={`My ${tab} quizzes`}>
        <TableHeader>
          <TableRow>
            {COLUMN_HEADERS.map((label, i) => (
              <TableHead
                key={i}
                className={
                  i === 1 ? "min-w-48" : i === 6 ? "w-36" : ""
                }
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {isEmpty ? (
            <tr>
              <TableCell
                colSpan={COLUMN_HEADERS.length}
                className="h-48 text-center"
              >
                <MyQuizzesTableEmpty tab={tab} />
              </TableCell>
            </tr>
          ) : (
            items.map((quiz) => (
              <MyQuizzesTableRow
                key={quiz.quizId}
                quiz={quiz}
                onRowClick={() => router.push(`/my-quizzes/${quiz.quizId}`)}
              />
            ))
          )}
        </TableBody>

        {!isEmpty && (
          <tfoot>
            <TableRow>
              <TableCell
                colSpan={COLUMN_HEADERS.length}
                className="text-center"
              >
                {hasMore ? (
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="mx-auto"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>
                        <ChevronsDown className="mr-2 h-4 w-4" />
                        Load more
                      </>
                    )}
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-sm">
                    All quizzes loaded
                  </span>
                )}
              </TableCell>
            </TableRow>
          </tfoot>
        )}
      </Table>
    </div>
  );
}
