'use client'

import { memo, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle,
  XCircle,
  LogOut,
  Clock,
  Trophy,
  Flame,
  Star
} from 'lucide-react'
import type { QuizHistoryEntry } from '@/types/quizHistory'

interface HistoryTimelineProps {
  entries: QuizHistoryEntry[]
}

// ── Helper: group entries by date label ────────────────────────────────────

function groupByDate(entries: QuizHistoryEntry[]) {
  const groups: { label: string; entries: QuizHistoryEntry[] }[] = []
  const map = new Map<string, QuizHistoryEntry[]>()

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const entry of entries) {
    const d = new Date(entry.completedAt)
    let label: string

    if (d.toDateString() === today.toDateString()) {
      label = 'Today'
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday'
    } else {
      label = d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    }

    if (!map.has(label)) {
      map.set(label, [])
    }
    map.get(label)!.push(entry)
  }

  for (const [label, entries] of map) {
    groups.push({ label, entries })
  }

  return groups
}

// ── Status helpers ─────────────────────────────────────────────────────────

const statusConfig = {
  passed: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Passed'
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    label: 'Failed'
  },
  abandoned: {
    icon: LogOut,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    label: 'Abandoned'
  }
}

const difficultyColor = {
  Easy: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  Medium:
    'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
  Hard: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ── Timeline Entry Card ────────────────────────────────────────────────────

const TimelineEntry = memo(function TimelineEntry({
  entry
}: {
  entry: QuizHistoryEntry
}) {
  const st = statusConfig[entry.status]
  const StatusIcon = st.icon
  const time = new Date(entry.completedAt).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <Card className='bg-background border border-gray-300 dark:border-slate-700 hover:shadow-md transition-shadow group'>
      <CardContent className='p-4'>
        <div className='flex items-start gap-4'>
          {/* Status indicator dot */}
          <div className={`mt-1 p-2 rounded-full ${st.bgColor} shrink-0`}>
            <StatusIcon className={`h-4 w-4 ${st.color}`} />
          </div>

          {/* Content */}
          <div className='flex-1 min-w-0 space-y-2'>
            <div className='flex flex-wrap items-start justify-between gap-2'>
              <div className='min-w-0'>
                <h4 className='font-semibold text-sm leading-tight truncate group-hover:text-purple-500 transition-colors'>
                  {entry.categoryIcon} {entry.quizTitle}
                </h4>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  {entry.category} · {time}
                </p>
              </div>

              <div className='flex items-center gap-2 shrink-0'>
                <Badge
                  variant='outline'
                  className={difficultyColor[entry.difficulty]}
                >
                  {entry.difficulty}
                </Badge>
                <Badge
                  variant='outline'
                  className={`${st.bgColor} ${st.color} border-transparent`}
                >
                  {st.label}
                </Badge>
              </div>
            </div>

            {/* Metrics row */}
            <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground'>
              {entry.status !== 'abandoned' && (
                <>
                  <span className='flex items-center gap-1'>
                    <Star className='h-3 w-3 text-yellow-500' />
                    <span className='font-medium text-foreground'>
                      {entry.score}%
                    </span>{' '}
                    score
                  </span>
                  <span className='flex items-center gap-1'>
                    <CheckCircle className='h-3 w-3 text-green-500' />
                    {entry.correctAnswers}/{entry.totalQuestions} correct
                  </span>
                </>
              )}
              <span className='flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                {formatTime(entry.timeTaken)}
              </span>
              {entry.xpEarned > 0 && (
                <span className='flex items-center gap-1'>
                  <Flame className='h-3 w-3 text-orange-500' />+{entry.xpEarned}{' '}
                  XP
                </span>
              )}
              {entry.rank && entry.totalParticipants && (
                <span className='flex items-center gap-1'>
                  <Trophy className='h-3 w-3 text-purple-500' />#{entry.rank} of{' '}
                  {entry.totalParticipants}
                </span>
              )}
            </div>

            {/* Tags */}
            {entry.tags.length > 0 && (
              <div className='flex flex-wrap gap-1'>
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className='px-2 py-0.5 text-[10px] bg-muted rounded-full text-muted-foreground'
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

// ── Main Timeline ──────────────────────────────────────────────────────────

export const HistoryTimeline = memo(function HistoryTimeline({
  entries
}: HistoryTimelineProps) {
  const grouped = useMemo(() => groupByDate(entries), [entries])

  if (entries.length === 0) {
    return (
      <div className='text-center py-16 text-muted-foreground'>
        <Clock className='h-12 w-12 mx-auto mb-4 opacity-50' />
        <h3 className='text-lg font-semibold'>No quiz activity found</h3>
        <p className='text-sm mt-1'>
          Try adjusting your filters or take a quiz to get started!
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      {grouped.map((group) => (
        <div key={group.label}>
          {/* Date header */}
          <div className='flex items-center gap-3 mb-4'>
            <h3 className='text-sm font-semibold text-muted-foreground whitespace-nowrap'>
              {group.label}
            </h3>
            <div className='h-px flex-1 bg-border' />
            <span className='text-xs text-muted-foreground'>
              {group.entries.length} quiz{group.entries.length > 1 ? 'zes' : ''}
            </span>
          </div>

          {/* Entry cards */}
          <div className='space-y-3 relative'>
            {/* Timeline connector */}
            <div className='absolute left-[27px] top-6 bottom-6 w-px bg-border hidden md:block' />

            {group.entries.map((entry) => (
              <TimelineEntry key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})
