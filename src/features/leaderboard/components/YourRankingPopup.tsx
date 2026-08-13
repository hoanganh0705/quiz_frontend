'use client'

/**
 * `YourRankingPopup` — live modal showing the viewer's ranking
 * profile.
 *
 * Source epic:   Phase 6 — leaderboard mock-data cleanup.
 * Source ticket: W-04 / cleanup of `YourRankingPopup`.
 *
 * The previous version embedded `mockUserRanking` (a hardcoded
 * `UserRankingData` with rank=42, points=3250, etc.) and rendered
 * achievements + recent activity purely from synthetic data.
 *
 * All of the mock fields have been removed. The popup now reads:
 *   - `rank`, `xp`, `denseRank`, `percentile`, `xpToNextRank`,
 *     `nextRankXp`, `trend`, `trendAmount` from
 *     `useMyRanking().global.weekly`.
 *   - `peakRanks` from `useMyRanking().peakRanks`.
 *   - `badges` from `useMyRanking().badges`.
 *   - `lastActivityAt` from `useMyRanking().lastActivityAt`.
 *
 * The achievements + recent-activity tabs are rendered as
 * "no data yet" placeholders since the ranking API does not
 * expose those surfaces (they belong to the achievements service
 * which is out of scope). When the achievements API ships,
 * `useAchievements` should be wired here.
 *
 * Anonymous viewers see a "Sign in to see your ranking" message.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import {
  Trophy,
  Star,
  TrendingUp,
  Calendar,
  Target,
  Zap,
  Crown,
} from 'lucide-react'

import { useAuthState } from '@/features/auth/hooks/use-auth-state'
import {
  useMyRanking,
  getWeeklyPosition,
  getMonthlyPosition,
  getAllTimePosition,
  getPeakRanks,
  getBadges,
} from '@/features/leaderboard/hooks/useMyRanking'
import { getRankColor } from '@/features/leaderboard/lib/leaderboard-presentation'

interface YourRankingPopupProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'overview' | 'achievements' | 'activity'

export function YourRankingPopup({ isOpen, onClose }: YourRankingPopupProps) {
  const [selectedTab, setSelectedTab] = useState<Tab>('overview')
  const { isAuthenticated } = useAuthState()
  const { data, isLoading } = useMyRanking()

  const weekly = getWeeklyPosition(data)
  const monthly = getMonthlyPosition(data)
  const allTime = getAllTimePosition(data)
  const peakRanks = getPeakRanks(data)
  const badges = getBadges(data)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='bg-background border-border text-foreground max-w-4xl max-h-[90vh] overflow-hidden'>
        <DialogHeader>
          <DialogTitle className='text-xl font-bold flex items-center gap-2'>
            <Crown className='w-5 h-5 text-yellow-400' />
            Your Ranking Profile
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          {/* Anonymous viewer — graceful empty state */}
          {!isAuthenticated ? (
            <div className='p-6 bg-muted rounded-lg text-center space-y-2'>
              <p className='text-foreground font-medium'>
                Sign in to see your ranking profile
              </p>
              <p className='text-sm text-foreground/70'>
                Your weekly, monthly, and all-time rankings are available
                after you sign in.
              </p>
            </div>
          ) : (
            <>
              {/* User Header */}
              <div className='flex items-center gap-4 p-4 bg-muted rounded-lg'>
                <div className='relative'>
                  <div className='w-16 h-16 rounded-full bg-gradient-to-br from-brand to-indigo-700 flex items-center justify-center'>
                    <span className='text-2xl font-bold text-white'>
                      {weekly?.rank ? `#${weekly.rank}` : '—'}
                    </span>
                  </div>
                  <Badge className='absolute -bottom-1 -right-1 text-xs bg-brand text-white'>
                    {badges?.isRisingStar
                      ? 'Rising'
                      : badges?.isActive
                        ? 'Active'
                        : badges?.isNew
                          ? 'New'
                          : 'Player'}
                  </Badge>
                </div>

                <div className='flex-1'>
                  <h2 className='text-xl font-bold text-foreground'>
                    {weekly?.rank ? `Rank #${weekly.rank}` : 'Unranked'}
                  </h2>
                  <p className='text-muted-foreground'>
                    {weekly?.percentileLabel ?? '—'}
                  </p>
                  <div className='flex items-center gap-4 mt-2'>
                    <div className='flex items-center gap-1'>
                      <Trophy className='w-4 h-4 text-yellow-400' />
                      <span className='text-sm text-muted-foreground'>
                        Weekly #{(weekly?.rank ?? '—')}
                      </span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Star className='w-4 h-4 text-blue-400' />
                      <span className='text-sm text-muted-foreground'>
                        {(weekly?.xp ?? 0).toLocaleString()} XP
                      </span>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Zap className='w-4 h-4 text-orange-400' />
                      <span className='text-sm text-muted-foreground'>
                        Trend: {weekly?.trend ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className='flex gap-2 border-b border-border'>
                <Button
                  variant={selectedTab === 'overview' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setSelectedTab('overview')}
                  className={
                    selectedTab === 'overview'
                      ? 'bg-brand hover:bg-brand'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }
                >
                  Overview
                </Button>
                <Button
                  variant={selectedTab === 'achievements' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setSelectedTab('achievements')}
                  className={
                    selectedTab === 'achievements'
                      ? 'bg-brand hover:bg-brand'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }
                >
                  Achievements
                </Button>
                <Button
                  variant={selectedTab === 'activity' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setSelectedTab('activity')}
                  className={
                    selectedTab === 'activity'
                      ? 'bg-brand hover:bg-brand'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }
                >
                  Recent Activity
                </Button>
              </div>

              {/* Tab Content */}
              <div className='max-h-96 overflow-y-auto'>
                {selectedTab === 'overview' && (
                  <OverviewTab
                    weekly={weekly}
                    monthly={monthly}
                    allTime={allTime}
                    isLoading={isLoading}
                  />
                )}

                {selectedTab === 'achievements' && (
                  <AchievementsTab peakRanks={peakRanks} />
                )}

                {selectedTab === 'activity' && (
                  <ActivityTab
                    lastActivityAt={data?.lastActivityAt ?? null}
                    trend={weekly?.trend ?? null}
                    trendAmount={weekly?.trendAmount ?? null}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <div className='flex justify-end gap-2 pt-4 border-t border-border'>
          <Button
            variant='outline'
            onClick={onClose}
            className='border-border text-muted-foreground hover:bg-accent'
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────

interface OverviewTabProps {
  weekly: ReturnType<typeof getWeeklyPosition>
  monthly: ReturnType<typeof getMonthlyPosition>
  allTime: ReturnType<typeof getAllTimePosition>
  isLoading: boolean
}

interface OverviewTabProps {
  weekly: ReturnType<typeof getWeeklyPosition>
  monthly: ReturnType<typeof getMonthlyPosition>
  allTime: ReturnType<typeof getAllTimePosition>
  isLoading: boolean
}

function OverviewTab({ weekly, monthly, allTime }: OverviewTabProps) {
  const xp = weekly?.xp ?? 0
  const xpToNext = weekly?.xpToNextRank ?? null
  const nextXp = weekly?.nextRankXp ?? null
  const rank = weekly?.rank ?? null

  const progressPercent =
    xpToNext !== null && nextXp !== null && nextXp > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((xp / nextXp) * 100),
          ),
        )
      : 0

  return (
    <div className='space-y-6'>
      {/* Level progress */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <h3 className='font-semibold text-foreground'>Rank Progress</h3>
          <span className='text-sm text-muted-foreground'>
            {rank !== null ? `#${rank}` : '—'}
          </span>
        </div>
        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span className='text-muted-foreground'>Current XP</span>
            <span className='text-muted-foreground'>
              {nextXp !== null ? `${nextXp.toLocaleString()} XP` : 'Top XP'}
            </span>
          </div>
          <Progress value={progressPercent} className='h-2' />
          <p className='text-xs text-muted-foreground'>
            {xpToNext !== null
              ? `${xpToNext.toLocaleString()} XP to next rank`
              : 'No next rank — you are at the top.'}
          </p>
        </div>
      </div>

      {/* Period stats */}
      <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
        <PeriodCard
          label='Weekly'
          rank={weekly?.rank ?? null}
          xp={weekly?.xp ?? null}
          percentile={weekly?.percentileLabel ?? null}
        />
        <PeriodCard
          label='Monthly'
          rank={monthly?.rank ?? null}
          xp={monthly?.xp ?? null}
          percentile={monthly?.percentileLabel ?? null}
        />
        <PeriodCard
          label='All-Time'
          rank={allTime?.rank ?? null}
          xp={allTime?.xp ?? null}
          percentile={allTime?.percentileLabel ?? null}
        />
      </div>
    </div>
  )
}

interface PeriodCardProps {
  label: string
  rank: number | null
  xp: number | null
  percentile: string | null
}

function PeriodCard({ label, rank, xp, percentile }: PeriodCardProps) {
  return (
    <div className='bg-muted p-3 rounded-lg text-center'>
      <p className='text-xs text-foreground/70 mb-1'>{label}</p>
      <p className={`text-lg font-bold ${rank !== null ? getRankColor(rank) : 'text-foreground'}`}>
        {rank !== null ? `#${rank}` : '—'}
      </p>
      <p className='text-xs text-foreground/70'>
        {xp !== null ? `${xp.toLocaleString()} XP` : '—'}
      </p>
      <p className='text-xs text-foreground/60'>{percentile ?? '—'}</p>
    </div>
  )
}

// ─── Achievements tab ────────────────────────────────────────────────────

/**
 * The generated `PeakRankDtoAchievedAt` is orval's open-object
 * projection of a `@nullable` ISO timestamp (`{ [key: string]: unknown } | null`).
 * In practice the backend returns a plain `string | null`. This
 * helper unwraps the convention so the JSX can render a date.
 */
function extractTimestamp(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.iso === 'string') return obj.iso
    if (typeof obj.value === 'string') return obj.value
    if (typeof obj.date === 'string') return obj.date
  }
  return null
}

interface AchievementsTabProps {
  peakRanks: ReturnType<typeof getPeakRanks>
}

function AchievementsTab({ peakRanks }: AchievementsTabProps) {
  const entries: ReadonlyArray<{
    label: string
    rank: number | null
    achievedAt: string | null | undefined
  }> = [
    {
      label: 'Daily peak',
      rank: peakRanks?.daily?.rank ?? null,
      achievedAt: extractTimestamp(peakRanks?.daily?.achievedAt),
    },
    {
      label: 'Weekly peak',
      rank: peakRanks?.weekly?.rank ?? null,
      achievedAt: extractTimestamp(peakRanks?.weekly?.achievedAt),
    },
    {
      label: 'Monthly peak',
      rank: peakRanks?.monthly?.rank ?? null,
      achievedAt: extractTimestamp(peakRanks?.monthly?.achievedAt),
    },
    {
      label: 'All-time peak',
      rank: peakRanks?.allTime?.rank ?? null,
      achievedAt: extractTimestamp(peakRanks?.allTime?.achievedAt),
    },
  ]

  const hasAny = entries.some((e) => e.rank !== null)

  if (!hasAny) {
    return (
      <p className='text-sm text-foreground/70 text-center py-8'>
        No peak ranks yet — keep playing to set your first record.
      </p>
    )
  }

  return (
    <div className='space-y-3'>
      <h3 className='font-semibold text-foreground'>Peak Ranks</h3>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
        {entries.map((entry) => (
          <div
            key={entry.label}
            className='flex items-center gap-3 p-3 bg-muted rounded-lg'
          >
            <Target className='w-4 h-4 text-foreground/70' aria-hidden='true' />
            <div className='flex-1'>
              <p className='font-semibold text-foreground'>{entry.label}</p>
              <p className='text-xs text-foreground/70'>
                {entry.rank !== null ? `Best #${entry.rank}` : 'Not set yet'}
              </p>
            </div>
            {entry.achievedAt ? (
              <Badge className='bg-brand text-white text-xs'>
                {new Date(entry.achievedAt).toLocaleDateString()}
              </Badge>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Activity tab ────────────────────────────────────────────────────────

interface ActivityTabProps {
  lastActivityAt: unknown
  trend: string | null
  trendAmount: number | null | undefined
}

function ActivityTab({ lastActivityAt, trend, trendAmount }: ActivityTabProps) {
  const lastActivity = extractTimestamp(lastActivityAt)
  return (
    <div className='space-y-3'>
      <h3 className='font-semibold text-foreground'>Recent Activity</h3>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
        <ActivityItem
          icon={<Calendar className='w-4 h-4' aria-hidden='true' />}
          title='Last activity'
          description={
            lastActivity
              ? new Date(lastActivity).toLocaleString()
              : 'No recent activity'
          }
        />
        <ActivityItem
          icon={<TrendingUp className='w-4 h-4' aria-hidden='true' />}
          title='Rank trend'
          description={
            trendAmount !== null && trendAmount !== undefined
              ? `${trend}${trendAmount > 0 ? ` (${trendAmount} positions)` : ''}`
              : trend ?? '—'
          }
        />
      </div>
      <p className='text-xs text-foreground/60 pt-2 border-t border-border/40'>
        Detailed activity history is exposed by the
        <span className='mx-1 font-mono'>/leaderboard/me/history</span>
        endpoint and is rendered here once the surface is wired.
      </p>
    </div>
  )
}

interface ActivityItemProps {
  icon: React.ReactNode
  title: string
  description: string
}

function ActivityItem({ icon, title, description }: ActivityItemProps) {
  return (
    <div className='flex items-center gap-3 p-3 bg-muted rounded-lg'>
      <div className='w-8 h-8 rounded-full bg-accent flex items-center justify-center'>
        {icon}
      </div>
      <div className='flex-1'>
        <p className='font-semibold text-foreground'>{title}</p>
        <p className='text-sm text-foreground/70'>{description}</p>
      </div>
    </div>
  )
}
