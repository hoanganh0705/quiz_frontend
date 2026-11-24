"use client";

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

import type {
  MyQuizListItem,
  MyQuizzesTab,
} from "@/features/quizzes/types/my-quizzes";
import type { UseCursorPaginatedResult } from "@/lib/api/use-cursor-paginated.types";

import { MyQuizzesTableEmpty } from "./MyQuizzesTableEmpty";
import { MyQuizzesTableRow } from "./MyQuizzesTableRow";

interface MyQuizzesTableProps {
  items: readonly MyQuizListItem[];

  isLoading: boolean;

  isLoadingMore: boolean;

  hasMore: boolean;

  loadMore: () => void;

  retryBannerVisible: boolean;

  refresh: () => Promise<void>;

  tab: "all" | "drafts" | "published";
}

const COLUMN_HEADERS = [
  { label: "Title", className: "min-w-48" },
  { label: "Slug", className: "hidden md:table-cell" },
  { label: "Status", className: "" },
  { label: "Questions", className: "hidden sm:table-cell" },
  { label: "Last Updated", className: "hidden lg:table-cell" },
  { label: "Actions", className: "w-32 text-right" },
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
      className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-warning-foreground"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
      <p className="flex-1 text-sm">
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
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

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
        <RetryBanner onDismiss={refresh} onRetry={refresh} />
      )}

      <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        <Table aria-label={`My ${tab} quizzes`}>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              {COLUMN_HEADERS.map((col, i) => (
                <TableHead
                  key={i}
                  className={`px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground ${col.className}`}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isEmpty ? (
              <tr>
                <TableCell
                  colSpan={COLUMN_HEADERS.length}
                  className="h-64 text-center"
                >
                  <MyQuizzesTableEmpty tab={tab} />
                </TableCell>
              </tr>
            ) : (
              items.map((quiz) => (
                <MyQuizzesTableRow
                  key={quiz.quizId}
                  quiz={quiz}
                  onRowClick={() =>
                    router.push(`/my-quizzes/${quiz.quizId}/edit`)
                  }
                />
              ))
            )}
          </TableBody>

          {!isEmpty && (
            <tfoot className="border-t border-border bg-muted/15">
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={COLUMN_HEADERS.length}
                  className="px-4 py-4 text-center"
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
    </div>
  );
}
