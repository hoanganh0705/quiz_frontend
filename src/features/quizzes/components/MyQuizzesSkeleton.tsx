import { Skeleton } from "@/components/ui/Skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

const SKELETON_ROW_COUNT = 10 as const;

const COLUMN_HEADERS = [
  { label: "Title", className: "min-w-48" },
  { label: "Slug", className: "hidden md:table-cell" },
  { label: "Status", className: "" },
  { label: "Questions", className: "hidden sm:table-cell" },
  { label: "Last Updated", className: "hidden lg:table-cell" },
  { label: "Actions", className: "w-32 text-right" },
] as const;

function SkeletonRow(): React.ReactElement {
  return (
    <TableRow className="hover:bg-transparent">
      {/* Title — widest cell */}
      <TableCell className="min-w-48 px-4 py-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-1.5 h-3 w-32" />
      </TableCell>
      {/* Slug */}
      <TableCell className="hidden px-4 py-4 md:table-cell">
        <Skeleton className="h-4 w-24" />
      </TableCell>
      {/* Status badge */}
      <TableCell className="px-4 py-4">
        <Skeleton className="h-5 w-16 rounded-md" />
      </TableCell>
      {/* Question count */}
      <TableCell className="hidden px-4 py-4 sm:table-cell">
        <Skeleton className="h-4 w-8" />
      </TableCell>
      {/* Last updated */}
      <TableCell className="hidden px-4 py-4 lg:table-cell">
        <Skeleton className="h-4 w-28" />
      </TableCell>
      {/* Actions */}
      <TableCell className="w-32 px-4 py-4 text-right">
        <div className="flex justify-end gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export function MyQuizzesSkeleton(): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
      <Table aria-busy="true" aria-label="Loading quizzes">
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
          {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
            <SkeletonRow key={i} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
