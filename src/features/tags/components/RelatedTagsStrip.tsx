'use client'

/**
 * `<RelatedTagsStrip>` — horizontal scroll of `<TagPill />` items
 * for the `/tags/[slug]` detail page.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.C4.
 *
 * Consumes `useTagRelated(slug, { limit: 10 })`. The strip is
 * supplementary — an empty related list does NOT block the quiz
 * grid above the strip; the strip renders nothing in the empty
 * case.
 *
 * ## Drift note (TKT-3.4.A1 §2)
 *
 * The planning doc listed `/tags/:id/related`; the SDK uses
 * `slug` as the parameter. The hook (B5) accepts a `slug`
 * and the detail page (D3) passes the same slug it uses for
 * the rest of the page.
 *
 * ## State contract
 *
 * | State                          | Render                                                      |
 * | ------------------------------ | ----------------------------------------------------------- |
 * | `isLoading`                    | 5 skeleton pills, identical outer dimensions (no CLS).      |
 * | `tags.length === 0` (resolved) | Nothing (the strip is hidden).                              |
 * | `error`                        | Inline retry button; the rest of the detail page is unaffected. |
 * | resolved                       | Up to 10 `<TagPill variant="clickable" />` items in a row.  |
 *
 * The strip is a client component because it consumes the SWR hook.
 */

import { mutate } from 'swr'

import { TagPill } from '@/components/primitives/TagPill/TagPill'
import { TagPillSkeleton } from '@/components/primitives'
import { Button } from '@/components/ui/Button'
import { useTagRelated } from '@/features/tags/hooks/useTagRelated'

const SWR_KEY_FACTORY = (slug: string, params: { limit: number }) =>
  ['tag', slug, 'related', params] as const

const STRIP_CONTAINER = 'flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory'
const STRIP_HEADER =
  'mb-3 flex items-center justify-between gap-2 text-sm text-muted-foreground'

export interface RelatedTagsStripProps {
  slug: string
}

export function RelatedTagsStrip({
  slug,
}: RelatedTagsStripProps): React.ReactElement | null {
  const { tags, isLoading, error } = useTagRelated(slug, { limit: 10 })
  const swrKey = SWR_KEY_FACTORY(slug, { limit: 10 })

  if (isLoading) {
    return (
      <section
        className='mt-12'
        aria-label='Related tags'
        aria-busy='true'
        data-testid='related-tags-strip-loading'
      >
        <div className={STRIP_HEADER}>
          <span>Related tags</span>
        </div>
        <div className={STRIP_CONTAINER}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className='shrink-0 snap-start'
              data-testid='related-tags-strip-skeleton'
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
        className='mt-12'
        aria-label='Related tags'
        data-testid='related-tags-strip-error'
      >
        <div className={STRIP_HEADER}>
          <span>Related tags</span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void mutate(swrKey)}
            data-testid='related-tags-strip-retry'
          >
            Retry
          </Button>
        </div>
        <p className='text-sm text-muted-foreground' role='status'>
          Couldn&apos;t load related tags.
        </p>
      </section>
    )
  }

  if (tags.length === 0) {
    return null
  }

  return (
    <section
      className='mt-12'
      aria-label='Related tags'
      data-testid='related-tags-strip'
    >
      <div className={STRIP_HEADER}>
        <span>Related tags</span>
      </div>
      <div className={STRIP_CONTAINER}>
        {tags.map((tag) => (
          <div
            key={tag.tagId}
            className='shrink-0 snap-start'
          >
            <TagPill tag={tag} variant='clickable' />
          </div>
        ))}
      </div>
    </section>
  )
}
