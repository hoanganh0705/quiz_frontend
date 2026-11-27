import { Skeleton } from "@/components/ui/Skeleton";

import { cn } from "@/shared/utils/merge-class-names";

const OUTER =
  "inline-flex min-h-8 sm:min-h-[34px] w-28 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1";
const SWATCH_SLOT = "inline-block h-2 w-2 shrink-0 rounded-full";
const LABEL_SLOT = "h-3 flex-1 rounded-full";

export type TagPillSkeletonProps = React.HTMLAttributes<HTMLSpanElement>;

export function TagPillSkeleton({ className, ...rest }: TagPillSkeletonProps) {
  const hasExplicitLabel = Boolean(rest["aria-label"]);

  return (
    <span
      role={hasExplicitLabel ? "status" : undefined}
      aria-hidden={hasExplicitLabel ? undefined : (rest["aria-hidden"] ?? true)}
      data-testid="tag-pill-skeleton"
      className={cn(OUTER, className)}
      {...rest}
    >
      <Skeleton className={SWATCH_SLOT} />
      <Skeleton className={LABEL_SLOT} />
    </span>
  );
}
