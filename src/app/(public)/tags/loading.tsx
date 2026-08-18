

import { Skeleton } from '@/components/ui/Skeleton'
import { TagPillSkeleton } from '@/components/primitives'

const HEADER_HEIGHT = 'h-9 w-48'
const FILTER_HEIGHT = 'h-9 w-full max-w-md rounded-md'
const STRIP_CONTAINER = 'flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scroll-mt-16'
const GRID_LAYOUT = 'flex flex-wrap gap-3'

export default function TagsLoading() {
return (
<div
className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
aria-busy='true'
aria-label='Loading tags directory'
data-testid='tags-directory-loading'
    >
{/* Header skeleton — title + description */}
<header className='mb-6'>
<Skeleton className={`${HEADER_HEIGHT} mb-3`} />
<Skeleton className='h-5 w-96 mb-6' />
{/* Filter input skeleton */}
<div className='max-w-md'>
<Skeleton className={FILTER_HEIGHT} />
</div>
</header>

{/* Popular strip skeleton */}
<section className='mb-8' aria-label='Loading popular tags'>
<Skeleton className='mb-3 h-4 w-24' />
<div className={STRIP_CONTAINER}>
{Array.from({ length: 5 }).map((_, i) => (
<TagPillSkeleton key={`popular-${i}`} />
          ))}
</div>
</section>

{/* Trending strip skeleton */}
<section className='mb-8' aria-label='Loading trending tags'>
<Skeleton className='mb-3 h-4 w-24' />
<div className={STRIP_CONTAINER}>
{Array.from({ length: 5 }).map((_, i) => (
<TagPillSkeleton key={`trending-${i}`} />
          ))}
</div>
</section>

{/* Cursor-paginated directory skeleton — 30 items per page (Story 3.4 AC #6). */}
<section aria-label='Loading tags directory'>
<div className={GRID_LAYOUT}>
{Array.from({ length: 30 }).map((_, i) => (
<TagPillSkeleton key={`dir-${i}`} />
          ))}
</div>
</section>
</div>
  )
}
