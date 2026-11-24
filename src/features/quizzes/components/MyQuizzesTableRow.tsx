import Link from "next/link";

import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableCell, TableRow } from "@/components/ui/Table";

import type { MyQuizListItem } from "@/features/quizzes/types/my-quizzes";

interface MyQuizzesTableRowProps {
  quiz: MyQuizListItem;

  onRowClick?: () => void;
}

function formatUpdatedAt(iso: string): string {
  const locale =
    typeof navigator !== "undefined" ? navigator.language : "en-US";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusInfo(quiz: MyQuizListItem): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
} {
  if (quiz.isHidden) {
    return { label: "Deleted", variant: "destructive" };
  }
  const status = quiz.publishedVersion?.status;
  if (status === "published") {
    return { label: "Published", variant: "default" };
  }
  return { label: "Draft", variant: "secondary" };
}

export function MyQuizzesTableRow({
  quiz,
  onRowClick,
}: MyQuizzesTableRowProps): React.ReactElement {
  const isDeleted = quiz.isHidden;
  const { label: statusLabel, variant: statusVariant } = getStatusInfo(quiz);
  const questionCount =
    (quiz.publishedVersion as unknown as { questionCount?: number })
      ?.questionCount ?? 0;

  return (
    <TableRow
      data-quiz-id={quiz.quizId}
      className={
        onRowClick
          ? "group cursor-pointer transition-colors hover:bg-muted/40"
          : undefined
      }
      onClick={onRowClick}
    >
      {/* Title — clamped at 2 lines; full title in aria-label */}
      <TableCell className="min-w-48 max-w-80 px-4 py-4">
        <span
          className="line-clamp-2 font-medium text-foreground transition-colors group-hover:text-primary"
          aria-label={quiz.title}
          title={quiz.title}
        >
          {quiz.title || "Untitled Quiz"}
        </span>
      </TableCell>

      {/* Slug */}
      <TableCell className="hidden px-4 py-4 md:table-cell">
        <span className="text-muted-foreground font-mono text-xs">
          /{quiz.slug}
        </span>
      </TableCell>

      {/* Status badge */}
      <TableCell className="px-4 py-4">
        <Badge
          variant={statusVariant}
          className="font-mono text-xs font-medium"
        >
          {statusLabel}
        </Badge>
      </TableCell>

      {/* Question count */}
      <TableCell className="hidden px-4 py-4 sm:table-cell">
        <span className="text-muted-foreground font-mono text-sm">
          {questionCount}
        </span>
      </TableCell>

      {/* Updated at */}
      <TableCell className="hidden px-4 py-4 lg:table-cell">
        <span className="text-muted-foreground text-sm">
          {formatUpdatedAt(quiz.updatedAt)}
        </span>
      </TableCell>

      {/* Actions — omitted when soft-deleted */}
      <TableCell className="w-32 px-4 py-4 text-right">
        {!isDeleted && (
          <div
            className="flex justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              asChild
              className="transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <Link href={`/my-quizzes/${quiz.quizId}/edit`}>
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
