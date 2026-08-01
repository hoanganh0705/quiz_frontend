/**
 * `<TagPillSkeleton />` — loading-state placeholder for `<TagPill />`.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.4 (vendor primitive).
 * Source ticket: TKT-3.4.C2.
 *
 * Renders an inert pill-shaped skeleton block with identical outer
 * dimensions to `<TagPill />`. Consumers swap one for the other
 * during SWR loading states without inducing CLS.
 *
 * The skeleton's dimensions mirror the `TagPill` outer chrome:
 *   - `inline-flex items-center` row with the same height
 *   - the swatch dot replaced by a small block
 *   - the label slot reserved at the same width as a typical tag name
 */
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
