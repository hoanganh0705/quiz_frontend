'use client'

import { Trophy } from 'lucide-react'

import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/shared/utils/merge-class-names'

const LEADERBOARD_EMPTY_COPY =
'No leaderboard data yet — play some quizzes to populate the ranks.'

export interface LeaderboardEmptyStateProps {

onRetry?: () => void

className?: string
}

export function LeaderboardEmptyState({
onRetry,
className,
}: LeaderboardEmptyStateProps) {
return (
<div
data-testid='leaderboard-empty-state'
className={cn(
'bg-card border border-border rounded-lg overflow-hidden',
className,
      )}
    >
<EmptyState
icon={Trophy}
title='Leaderboard is empty'
description={LEADERBOARD_EMPTY_COPY}
actions={
onRetry
? [
{
label: 'Retry',
variant: 'outline',
onClick: onRetry,
                },
              ]
: undefined
        }
      />
</div>
  )
}
