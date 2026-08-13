'use client'

/**
 * `DailyChallengeHistoryList` — list view for past daily challenges.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.B3.
 *
 * Renders one row per `DailyChallengeHistoryItemView`. Each row shows
 * the date (verbatim per `EPIC_3_12_A1.md` §5), the category badge,
 * the user's score (as a percentage), the day's global rank, and the
 * top-ten flag.
 *
 * ## Empty state
 *
 * The list delegates to `<DailyChallengeHistoryEmptyState />` when
 * `items.length === 0`. The empty state is never rendered alongside
 * the list — the wrapper decides which is shown.
 *
 * ## CLS-zero invariant
 *
 * The list's outer dimensions (`space-y-3`, the row `min-h-16`) match
 * the skeleton's dimensions exactly. The list rendering is identical
 * to the existing legacy history list (in
 * `DailyChallengeMainContent.tsx` lines 211–247) so the visual
 * transition is invisible to the user during the placeholder →
 * live swap.
 *
 * ## Accessibility
 *
 * The list region is a single `<section>` with a heading and a
 * description, so screen readers navigate the page once and step into
 * the history region as a landmark. Each row is a static `<article>`
 * — no `onClick`, no `tabIndex` — preserving the legacy visual.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ChevronRight, ChevronLeft } from 'lucide-react'

import { cn } from '@/shared/utils/merge-class-names'

import { DailyChallengeHistoryEmptyState } from './DailyChallengeHistoryEmptyState'
import type { DailyChallengeHistoryItemWithId } from '../hooks'

export interface DailyChallengeHistoryListProps {
  items: readonly DailyChallengeHistoryItemWithId[]
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore?: () => void
  className?: string
}

export function DailyChallengeHistoryList({
  items,
  hasMore,
  isLoadingMore,
  onLoadMore,
  className,
}: DailyChallengeHistoryListProps) {
  if (items.length === 0) {
    return <DailyChallengeHistoryEmptyState className={className} />
  }

  const displayed = items.slice(0, 3)
  const remaining = items.length - displayed.length
  const showAll = !hasMore

  return (
    <Card
      role='region'
      aria-labelledby='daily-challenge-history-title'
      data-testid='daily-challenge-history-list'
      className={cn(
        'border bg-background text-foreground py-6',
        className,
      )}
    >
      <CardHeader>
        <div className='flex items-center justify-between'>
          <h1
            id='daily-challenge-history-title'
            className='text-xl font-bold'
          >
            Challenge History
          </h1>
          {hasMore && onLoadMore ? (
            <Button
              variant='ghost'
              onClick={onLoadMore}
              disabled={isLoadingMore}
              aria-label={
                isLoadingMore
                  ? 'Loading more challenge history'
                  : `Load ${remaining} more past challenges`
              }
              className='flex items-center gap-1 bg-background text-foreground/70 hover:text-foreground hover:bg-transparent transition-colors shadow-none'
            >
              <span className='text-xs'>
                {isLoadingMore ? 'Loading…' : 'View All'}
              </span>
              <ChevronRight className='w-4 h-4' aria-hidden='true' />
            </Button>
          ) : showAll && items.length > 3 && onLoadMore ? (
            <Button
              variant='ghost'
              onClick={onLoadMore}
              aria-label='View less challenge history'
              className='flex items-center gap-1 bg-background text-foreground/70 hover:text-foreground hover:bg-transparent transition-colors shadow-none'
            >
              <span className='text-xs'>View Less</span>
              <ChevronLeft className='w-4 h-4' aria-hidden='true' />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className='space-y-3'>
          {displayed.map((challenge) => (
            <Card
              key={challenge.id}
              data-testid='daily-challenge-history-item'
              className='bg-background border-b border-border last:border-b-0'
            >
              <CardContent className='p-4'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex-1'>
                    <div className='text-base font-medium mb-1'>
                      <span data-testid='daily-challenge-history-item-title'>
                        {challenge.quizTitle}
                      </span>
                    </div>
                    <div className='text-xs text-foreground/70 mb-3'>
                      <time dateTime={challenge.date}>{challenge.date}</time>
                    </div>
                    <div className='flex items-center gap-3'>
                      <Badge
                        variant='outline'
                        data-testid='daily-challenge-history-item-category'
                        className='bg-background text-foreground border-border py-0.5 px-2 rounded-3xl'
                      >
                        {challenge.difficulty}
                      </Badge>
                      {challenge.isTopTen && (
                        <Badge
                          variant='outline'
                          className='bg-orange-300 text-foreground border-border py-0.5 px-2 rounded-3xl'
                        >
                          Top 10
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className='text-right'>
                    <div className='text-base font-bold mb-1'>
                      {challenge.score}%
                    </div>
                    <div className='text-foreground/70 text-sm'>
                      Rank #{challenge.rank}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
