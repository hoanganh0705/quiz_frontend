/**
 * `MyQuizzesTableRow` — renders a single quiz row in the author's table.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.D1.
 *
 * Columns: checkbox | title (clamped) | slug | status badge | question count |
 *          updated at | actions (Edit).
 *
 * ## Soft-delete
 *
 * `MyQuizListItem` carries `isHidden: true` for soft-deleted quizzes
 * (the backend surfaces these on `me/all` only). The row renders a
 * "Deleted" badge and omits the Edit/Clone CTAs when `isHidden` is true.
 *
 * ## Attempt count & rating
 *
 * Per-quiz attempt counts and ratings are not on `QuizListItemDto` — they
 * come from `GET /quizzes/:id/stats` (Story 3.6). The table columns are
 * omitted per Story 4.4 objective (Story 4.4 line 431 specifies the listed
 * fields; attemptCount / averageRating are shown on the per-quiz analytics
 * page instead).
 */

import Link from "next/link";

import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableCell, TableRow } from "@/components/ui/Table";

import type { MyQuizListItem } from "@/features/quizzes/types/my-quizzes";

interface MyQuizzesTableRowProps {
  /** The quiz data for this row. */
  quiz: MyQuizListItem;
  /** Called when the row is clicked (navigation to edit page). */
  onRowClick?: () => void;
}

/** Format `updatedAt` using the runtime locale. */
function formatUpdatedAt(iso: string): string {
  const locale = typeof navigator !== "undefined" ? navigator.language : "en-US";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Returns the display text + variant for the status badge. */
function getStatusInfo(
  quiz: MyQuizListItem,
): { label: string; variant: "default" | "secondary" | "outline" | "destructive" } {
  if (quiz.isHidden) {
    return { label: "Deleted", variant: "destructive" };
  }
  const status = quiz.publishedVersion?.status;
  if (status === "published") {
    return { label: "Published", variant: "default" };
  }
  return { label: "Draft", variant: "secondary" };
}

/**
 * Single row in the author's quizzes table.
 */
export function MyQuizzesTableRow({
  quiz,
  onRowClick,
}: MyQuizzesTableRowProps): React.ReactElement {
  const isDeleted = quiz.isHidden;
  const { label: statusLabel, variant: statusVariant } = getStatusInfo(quiz);
  const questionCount = (quiz.publishedVersion as unknown as { questionCount?: number })?.questionCount ?? 0;

  return (
    <TableRow
      data-quiz-id={quiz.quizId}
      className={onRowClick ? "cursor-pointer" : undefined}
      onClick={onRowClick}
    >
      {/* Checkbox — reserved for future bulk-select */}
      <TableCell className="w-10">
        <input
          type="checkbox"
          aria-label={`Select "${quiz.title}"`}
          className="accent-brand h-4 w-4 rounded"
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>

      {/* Title — clamped at 2 lines; full title in aria-label */}
      <TableCell className="min-w-48 max-w-80">
        <span
          className="line-clamp-2 font-medium"
          aria-label={quiz.title}
          title={quiz.title}
        >
          {quiz.title || "Untitled Quiz"}
        </span>
      </TableCell>

      {/* Slug */}
      <TableCell>
        <span className="text-muted-foreground text-sm">/{quiz.slug}</span>
      </TableCell>

      {/* Status badge */}
      <TableCell>
        <Badge variant={statusVariant}>{statusLabel}</Badge>
      </TableCell>

      {/* Question count */}
      <TableCell>
        <span className="text-sm">{questionCount}</span>
      </TableCell>

      {/* Updated at */}
      <TableCell>
        <span className="text-muted-foreground text-sm">
          {formatUpdatedAt(quiz.updatedAt)}
        </span>
      </TableCell>

      {/* Actions — omitted when soft-deleted */}
      <TableCell className="w-36">
        {!isDeleted && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <Link href={`/my-quizzes/${quiz.quizId}`}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Link>
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
