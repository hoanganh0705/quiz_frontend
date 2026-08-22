'use client'

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
              className='flex items-center gap-1 bg-background text-foreground-secondary hover:text-foreground hover:bg-transparent transition-colors shadow-none'
            >
              <span className='text-xs'>
                {isLoadingMore ? 'Loading…' : `Load ${remaining} more`}
              </span>
              <ChevronRight className='w-4 h-4' aria-hidden='true' />
            </Button>
          ) : showAll && items.length > 3 && onLoadMore ? (
            <Button
              variant='ghost'
              onClick={onLoadMore}
              aria-label='Show fewer past challenges'
              className='flex items-center gap-1 bg-background text-foreground-secondary hover:text-foreground hover:bg-transparent transition-colors shadow-none'
            >
              <span className='text-xs'>Show fewer</span>
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
                    <div className='text-muted-foreground mb-3'>
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
                          variant='difficulty-hard'
                          className='py-0.5 px-2 rounded-3xl'
                          data-testid='daily-challenge-history-item-top-ten'
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
                    <div className='text-muted-foreground text-sm'>
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
