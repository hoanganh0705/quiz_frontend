'use client'

/**
 * `<TagDetailPage>` — the `/tags/[slug]` route's main composition.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.D3.
 *
 * Wires:
 *   - `useTagBySlug(slug)` (B3) for the header data (including the 404 signal).
 *   - `<TagBreadcrumb />` (F2) above the header.
 *   - `<TagHeader />` (C5) below the breadcrumb.
 *   - `<TagAnalyticsPanel />` (C6) below the header.
 *   - `<TagQuizGrid />` (D1) below the analytics panel.
 *   - `<RelatedTagsStrip />` (C4) below the quiz grid.
 *
 * State contract:
 *
 * | Hook state                                | Render                                            |
 * | ----------------------------------------- | ------------------------------------------------- |
 * | `isLoading`                               | Header skeleton + analytics skeleton + 12-card grid skeleton. |
 * | `notFound: true` (404)                    | Inline 404 block (no header, no grid).            |
 * | `error.status >= 500`                     | Inline error message + retry button.              |
 * | resolved                                  | Header + Analytics + Grid + Related strip.        |
 *
 * ## 404 path
 *
 * The page renders an inline 404 block (matching the existing
 * `app/not-found.tsx` visual) instead of calling `next/navigation`'s
 * `notFound()`. The page is a client component (it consumes the SWR
 * hooks), so the file-based 404 mechanism (intended for server
 * components) is not appropriate here. The visual matches the app's
 * existing 404 surface so the user experience is consistent.
 *
 * ## Loading path
 *
 * The header skeleton mirrors the resolved header's height; the
 * analytics panel renders its own skeleton (counts + sparkline);
 * the grid skeleton uses 12 cards (the same count as
 * `<TagQuizGrid />`). CLS = 0 once items arrive.
 *
 * ## Analytics zero-state
 *
 * When `useTagAnalytics(id)` returns `analytics: null` (the 404 → no-data
 * path — Story 3.4 line 461), the `<TagAnalyticsPanel />` renders its
 * zero-state ("Analytics will populate after activity") — the rest of
 * the page is unaffected.
 */

import { mutate } from 'swr'
import Link from 'next/link'
import { Home, Search } from 'lucide-react'

import { TagBreadcrumb } from './TagBreadcrumb'
import { TagFollowButtonSlot } from './TagFollowButtonSlot'
import { TagHeader } from './TagHeader'
import { TagAnalyticsPanel } from './TagAnalyticsPanel'
import { TagQuizGrid } from './TagQuizGrid'
import { RelatedTagsStrip } from './RelatedTagsStrip'
import { useTagBySlug } from '@/features/tags/hooks/useTagBySlug'
import { Button } from '@/components/ui/Button'

const HEADER_SWR_KEY_FACTORY = (slug: string) => ['tag', slug] as const

const PAGE_LOADING_TESTID = 'tag-detail-page-loading'
const PAGE_NOT_FOUND_TESTID = 'tag-detail-page-not-found'
const PAGE_ERROR_TESTID = 'tag-detail-page-server-error'
const PAGE_RESOLVED_TESTID = 'tag-detail-page'

export interface TagDetailPageProps {
  slug: string
}

export function TagDetailPage({
  slug,
}: TagDetailPageProps): React.ReactElement {
  const { tag, isLoading, error, notFound } = useTagBySlug(slug)

  // 404 — inline 404 block (matches the app's not-found.tsx style).
  if (notFound) {
    return (
      <div
        className='min-h-screen bg-background flex items-center justify-center p-4'
        data-testid={PAGE_NOT_FOUND_TESTID}
      >
        <div className='max-w-md w-full text-center'>
          <div className='mb-8'>
            <h1 className='text-8xl font-bold text-default mb-2'>404</h1>
            <div className='w-16 h-1 bg-default mx-auto rounded-full' />
          </div>
          <h2 className='text-2xl font-bold text-foreground mb-2'>
            Tag Not Found
          </h2>
          <p className='text-foreground/70 mb-8'>
            The tag you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <div className='flex flex-col sm:flex-row gap-3 justify-center'>
            <Button
              asChild
              className='bg-default hover:bg-default-hover text-white'
            >
              <Link href='/'>
                <Home className='w-4 h-4 mr-2' />
                Go Home
              </Link>
            </Button>
            <Button
              asChild
              variant='outline'
              className='border-border text-primary'
            >
              <Link href='/tags'>
                <Search className='w-4 h-4 mr-2' />
                Browse Tags
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 5xx — generic error message + retry button.
  if (error && error.status >= 500) {
    return (
      <div
        className='min-h-screen bg-background flex items-center justify-center p-4'
        data-testid={PAGE_ERROR_TESTID}
      >
        <div className='max-w-md w-full text-center'>
          <h2 className='text-2xl font-bold text-foreground mb-2'>
            Something went wrong
          </h2>
          <p className='text-foreground/70 mb-6'>
            We couldn&apos;t load this tag. Please try again.
          </p>
          <Button
            variant='outline'
            onClick={() => void mutate(HEADER_SWR_KEY_FACTORY(slug))}
            data-testid='tag-detail-page-retry'
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Loading — header skeleton + analytics skeleton + grid skeleton.
  // CLS = 0 once items arrive.
  if (isLoading || !tag) {
    return (
      <div
        className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
        data-testid={PAGE_LOADING_TESTID}
      >
        <div
          className='mb-8'
          aria-label='Loading tag header'
          aria-busy='true'
          data-testid='tag-detail-page-header-skeleton'
        >
          <div className='h-7 w-48 animate-pulse rounded bg-accent' />
          <div className='mt-2 h-4 w-32 animate-pulse rounded bg-accent' />
        </div>
        <div
          className='mb-8 h-32 animate-pulse rounded bg-accent'
          aria-label='Loading tag analytics'
          aria-busy='true'
          data-testid='tag-detail-page-analytics-skeleton'
        />
        <div
          className='h-96 animate-pulse rounded bg-accent'
          aria-label='Loading tag quizzes'
          aria-busy='true'
          data-testid='tag-detail-page-grid-skeleton'
        />
      </div>
    )
  }

  // Resolved — breadcrumb + header + analytics + grid + related strip.
  return (
    <div
      className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
      data-testid={PAGE_RESOLVED_TESTID}
    >
      <TagBreadcrumb tag={tag} />
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <TagHeader tag={tag} />
        {/*
         * Story 3.9 / TKT-3.9.C2 — the follow slot lives beside the
         * header. The slot receives the resolved `tag.tagId` (NOT
         * the route `slug` — A1 §7 records the drift). When the tag
         * is loading, `tagId` is `null` and the slot renders `null`
         * (no CLS during the hydration window).
         */}
        <TagFollowButtonSlot tagId={tag.tagId} />
      </div>
      <TagAnalyticsPanel id={tag.tagId} className='mb-8' />
      <TagQuizGrid slug={slug} />
      <RelatedTagsStrip slug={slug} />
    </div>
  )
}
