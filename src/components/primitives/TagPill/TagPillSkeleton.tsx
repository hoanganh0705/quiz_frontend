

import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/shared/utils/merge-class-names'

const OUTER =
'inline-flex h-5 w-24 items-center gap-1.5 rounded-full border px-2'
const SWATCH_SLOT = 'inline-block h-2 w-2 shrink-0 rounded-full'
const LABEL_SLOT = 'h-2.5 flex-1'

export type TagPillSkeletonProps = React.HTMLAttributes<HTMLSpanElement>

export function TagPillSkeleton({
className,
...rest
}: TagPillSkeletonProps) {
return (
<span
role='status'
aria-label='Loading tag'
data-testid='tag-pill-skeleton'
className={cn(OUTER, className)}
{...rest}
    >
<Skeleton className={SWATCH_SLOT} />
<Skeleton className={LABEL_SLOT} />
</span>
  )
}
