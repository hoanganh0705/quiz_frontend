

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
"",
"Title",
"Slug",
"Status",
"Questions",
"Attempts",
"Rating",
"Last Updated",
"Actions",
] as const;

function SkeletonRow(): React.ReactElement {
return (
<TableRow>
{/* Checkbox placeholder */}
<TableCell className="w-10">
<Skeleton className="h-4 w-4 rounded" />
</TableCell>
{/* Title — widest cell */}
<TableCell>
<Skeleton className="h-4 w-48" />
<Skeleton className="mt-1 h-3 w-32" />
</TableCell>
{/* Slug */}
<TableCell>
<Skeleton className="h-4 w-24" />
</TableCell>
{/* Status badge */}
<TableCell>
<Skeleton className="h-5 w-16 rounded-md" />
</TableCell>
{/* Question count */}
<TableCell>
<Skeleton className="h-4 w-8" />
</TableCell>
{/* Attempt count */}
<TableCell>
<Skeleton className="h-4 w-8" />
</TableCell>
{/* Average rating */}
<TableCell>
<Skeleton className="h-4 w-10" />
</TableCell>
{/* Last updated */}
<TableCell>
<Skeleton className="h-4 w-28" />
</TableCell>
{/* Actions */}
<TableCell>
<div className="flex gap-2">
<Skeleton className="h-7 w-14 rounded-md" />
<Skeleton className="h-7 w-16 rounded-md" />
</div>
</TableCell>
</TableRow>
  );
}

export function MyQuizzesSkeleton(): React.ReactElement {
return (
<Table aria-busy="true" aria-label="Loading quizzes">
<TableHeader>
<TableRow>
{COLUMN_HEADERS.map((label, i) => (
<TableHead
key={i}
className={i === 1 ? "min-w-48" : i === 8 ? "w-36" : ""}
            >
{label}
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
  );
}
