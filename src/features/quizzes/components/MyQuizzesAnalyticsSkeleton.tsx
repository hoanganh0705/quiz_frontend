

import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

const CARD_COUNT = 4 as const;

function SkeletonCard(): React.ReactElement {
return (
<Card>
<CardContent className="pt-6">
<Skeleton className="mb-2 h-3 w-24 rounded" />
<Skeleton className="h-8 w-16 rounded" />
</CardContent>
</Card>
  );
}

export function MyQuizzesAnalyticsSkeleton(): React.ReactElement {
return (
<div
className="grid grid-cols-2 gap-4 lg:grid-cols-4"
aria-busy="true"
aria-label="Loading analytics"
    >
{Array.from({ length: CARD_COUNT }, (_, i) => (
<SkeletonCard key={i} />
      ))}
</div>
  );
}
