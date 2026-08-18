'use client'

import { Fragment } from 'react'

import { QuizCardSkeleton } from '@/components/primitives/QuizCard/QuizCardSkeleton'
import { QuizCardGrid } from '@/components/primitives/QuizCard/QuizCardGrid'
import { cn } from '@/shared/utils/merge-class-names'

import type { QuizRailLayout } from './QuizRail'

export interface QuizRailSkeletonProps {

layout?: QuizRailLayout

count?: number
className?: string
}

const DEFAULT_COUNT = 5

const SCROLLER_OUTER =
'flex flex-row gap-4 overflow-x-auto snap-x snap-mandatory scroll-mt-16 pb-2'
const SCROLLER_CELL = 'snap-start shrink-0 basis-[260px] sm:basis-[280px]'

export function QuizRailSkeleton({
layout = 'scroller',
count = DEFAULT_COUNT,
className,
}: QuizRailSkeletonProps): React.ReactElement {
const skeletonCount = Math.max(0, count)

if (layout === 'grid') {
return (
<QuizCardGrid
skeletonCount={skeletonCount}
className={className}
      />
    )
  }

return (
<div
className={cn(SCROLLER_OUTER, className)}
data-testid='quiz-rail-skeleton'
data-layout={layout}
data-count={skeletonCount}
aria-busy='true'
aria-label='Loading quiz rail'
    >
{Array.from({ length: skeletonCount }).map((_, index) => (
<Fragment key={index}>
<div className={SCROLLER_CELL}>
<QuizCardSkeleton />
</div>
</Fragment>
      ))}
</div>
  )
}
