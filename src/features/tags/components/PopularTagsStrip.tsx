'use client'

/**
 * `<PopularTagsStrip>` — horizontal scroll of `<TagPill />` items
 * for the `/tags` directory page.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.C2.
 *
 * Consumes `useTagsPopular({ limit: 10 })`. The strip is
 * supplementary — an empty popular list does NOT block the
 * trending strip + directory grid below it.
 *
 * ## State contract
 *
 * | State                          | Render                                                      |
 * | ------------------------------ | ----------------------------------------------------------- |
 * | `isLoading`                    | 5 skeleton pills, identical outer dimensions (no CLS).      |
 * | `tags.length === 0` (resolved) | Nothing (the strip is hidden).                              |
 * | `error`                        | Inline retry button; the directory grid below is unaffected. |
 * | resolved                       | Up to 10 `<TagPill variant="clickable" />` items in a row.  |
 *
 * The retry button calls the global `mutate` on the SWR key. The
 * strip ships as a client component because it consumes the SWR hook.
 */

import { mutate } from 'swr'

import { TagPill } from '@/components/primitives/TagPill/TagPill'
import { TagPillSkeleton } from '@/components/primitives'
import { Button } from '@/components/ui/Button'
import { useTagsPopular } from '@/features/tags/hooks/useTagsPopular'

const SWR_KEY = ['tags', 'popular', { limit: 10 }] as const

const STRIP_CONTAINER = 'flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory'
const STRIP_HEADER =
  'mb-3 flex items-center justify-between gap-2 text-sm text-muted-foreground'

export function PopularTagsStrip(): React.ReactElement | null {
  const { tags, isLoading, error } = useTagsPopular({ limit: 10 })

  if (isLoading) {
    return (
      <section
        className='mb-8'
        aria-label='Popular tags'
        aria-busy='true'
        data-testid='popular-tags-strip-loading'
      >
        <div className={STRIP_HEADER}>
          <span>Popular now</span>
        </div>
        <div className={STRIP_CONTAINER}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='shrink-0 snap-start'
              data-testid='popular-tags-strip-skeleton'
            >
              <TagPillSkeleton />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section
        className='mb-8'
        aria-label='Popular tags'
        data-testid='popular-tags-strip-error'
      >
        <div className={STRIP_HEADER}>
          <span>Popular now</span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void mutate(SWR_KEY)}
            data-testid='popular-tags-strip-retry'
          >
            Retry
          </Button>
        </div>
        <p className='text-sm text-muted-foreground' role='status'>
          Couldn&apos;t load popular tags.
        </p>
      </section>
    )
  }

  if (tags.length === 0) {
    return null
  }

  return (
    <section
      className='mb-8'
      aria-label='Popular tags'
      data-testid='popular-tags-strip'
    >
      <div className={STRIP_HEADER}>
        <span>Popular now</span>
      </div>
      <div className={STRIP_CONTAINER}>
        {tags.map((tag) => (
          <div
            key={tag.tagId}
            className='shrink-0 snap-start'
          >
            <TagPill
              tag={{
                tagId: tag.tagId,
                name: tag.name,
                slug: tag.slug,
                createdAt: '',
                updatedAt: '',
              }}
              variant='clickable'
            />
          </div>
        ))}
      </div>
    </section>
  )
}
