'use client';

import { CheckCircle2 } from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';

import type { RankingInconsistencyDto } from '../ranking-admin-types';

export interface RankingInconsistencyTableProps {

inconsistencies: RankingInconsistencyDto[];

isLoading?: boolean;
}

function EmptyState() {
return (
<div
data-testid="ranking-inconsistency-empty-state"
role="status"
className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950"
    >
<CheckCircle2
className="h-5 w-5 shrink-0 text-success dark:text-green-400"
aria-hidden="true"
      />
<p className="text-sm text-green-700 dark:text-green-300">
No inconsistencies found. Rankings are consistent.
      </p>
</div>
  );
}

function SkeletonRows() {
return (
<>
{[1, 2, 3].map((i) => (
<TableRow key={i} data-testid="ranking-inconsistency-skeleton-row">
<TableCell>
<Skeleton className="h-4 w-24" />
</TableCell>
<TableCell>
<Skeleton className="h-4 w-16" />
</TableCell>
<TableCell>
<Skeleton className="h-4 w-12" />
</TableCell>
<TableCell>
<Skeleton className="h-4 w-12" />
</TableCell>
<TableCell>
<Skeleton className="h-4 w-16" />
</TableCell>
</TableRow>
      ))}
</>
  );
}

export function RankingInconsistencyTable({
inconsistencies,
isLoading = false,
}: RankingInconsistencyTableProps) {

if (inconsistencies.length === 0 && !isLoading) {
return <EmptyState />;
  }

if (isLoading) {
return (
<Table>
<TableHeader>
<TableRow>
<TableHead>User ID</TableHead>
<TableHead>Field</TableHead>
<TableHead>Expected</TableHead>
<TableHead>Actual</TableHead>
<TableHead>Period</TableHead>
</TableRow>
</TableHeader>
<TableBody>
<SkeletonRows />
</TableBody>
</Table>
    );
  }

return (
<Table>
<TableHeader>
<TableRow>
<TableHead>User ID</TableHead>
<TableHead>Field</TableHead>
<TableHead>Expected</TableHead>
<TableHead>Actual</TableHead>
<TableHead>Period</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{inconsistencies.map((item, index) => (
<TableRow key={`${item.userId}-${item.field}-${index}`} data-testid="ranking-inconsistency-row">
<TableCell className="font-mono text-xs">{item.userId}</TableCell>
<TableCell>{item.field}</TableCell>
<TableCell className="font-mono text-xs">{String(item.expected)}</TableCell>
<TableCell className="font-mono text-xs">{String(item.actual)}</TableCell>
<TableCell>{item.period}</TableCell>
</TableRow>
        ))}
</TableBody>
</Table>
  );
}
