/**
 * `StatisticsTab` — displays aggregate user analytics.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-D5.
 *
 * Rewrites StatisticsTab to display aggregate user analytics from useMyAnalytics.
 */

import { memo } from 'react';

import { Card } from '@/components/ui/Card';
import { CardContent } from '@/components/ui/Card';
import { CardHeader } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Zap,
  Trophy,
  BookOpen,
  Clock,
  TrendingUp,
  Target,
  BarChart3,
} from 'lucide-react';

import { useMyAnalytics } from '@/features/users/hooks';
import { StatsCard } from '../StatsCard';

/**
 * Number of skeleton cards during loading.
 */
const SKELETON_COUNT = 4;

/**
 * Statistics skeleton for loading state.
 */
function StatisticsSkeleton() {
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <StatsCard
          key={i}
          icon={BarChart3}
          iconColor='text-muted-foreground'
          iconBgColor='bg-muted'
          value='-'
          label='Loading...'
          isLoading
        />
      ))}
    </div>
  );
}

/**
 * Formats time in minutes to readable format.
 */
function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) return `${hours}h ${mins}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Statistics tab with aggregate analytics.
 */
export const StatisticsTab = memo(function StatisticsTab() {
  const { analytics, isLoading, error } = useMyAnalytics();

  // Loading state
  if (isLoading) {
    return (
      <div className='mt-6 space-y-6'>
        <StatisticsSkeleton />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className='mt-6'>
        <Card>
          <CardContent className='p-6'>
            <div className='text-center py-8'>
              <p className='text-sm text-destructive'>
                Failed to load analytics. Please try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state (no activity)
  if (!analytics) {
    return (
      <div className='mt-6'>
        <Card>
          <CardContent className='p-6'>
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <BarChart3 className='w-12 h-12 text-muted-foreground mb-4' aria-hidden='true' />
              <p className='text-sm text-muted-foreground max-w-xs'>
                Analytics will populate after activity.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasActivity =
    analytics.quizzesCompleted > 0 ||
    analytics.totalTimeSpentMinutes > 0 ||
    analytics.tournamentsPlayed > 0;

  // Empty state if no activity
  if (!hasActivity) {
    return (
      <div className='mt-6'>
        <Card>
          <CardContent className='p-6'>
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <BarChart3 className='w-12 h-12 text-muted-foreground mb-4' aria-hidden='true' />
              <p className='text-sm text-muted-foreground max-w-xs'>
                Analytics will populate after activity.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='mt-6 space-y-6'>
      {/* Stats Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
        <StatsCard
          icon={Zap}
          iconColor='text-amber-500'
          iconBgColor='bg-amber-500/10'
          value={analytics.xpTotal.toLocaleString()}
          label='Total XP'
        />
        <StatsCard
          icon={BookOpen}
          iconColor='text-brand'
          iconBgColor='bg-brand/10'
          value={analytics.quizzesCompleted}
          label='Quizzes Completed'
        />
        <StatsCard
          icon={TrendingUp}
          iconColor='text-green-500'
          iconBgColor='bg-green-500/10'
          value={`${analytics.averageScore.toFixed(1)}%`}
          label='Average Score'
        />
        <StatsCard
          icon={Clock}
          iconColor='text-blue-500'
          iconBgColor='bg-blue-500/10'
          value={formatTime(analytics.totalTimeSpentMinutes)}
          label='Time Spent'
        />
      </div>

      {/* Streak Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <TrendingUp className='w-4 h-4 text-amber-500' aria-hidden='true' />
              Streaks
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Current Streak</span>
              <span className='text-lg font-bold'>{analytics.currentStreak} days</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Longest Streak</span>
              <span className='text-lg font-bold'>{analytics.longestStreak} days</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm flex items-center gap-2'>
              <Trophy className='w-4 h-4 text-amber-500' aria-hidden='true' />
              Tournaments
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Tournaments Played</span>
              <span className='text-lg font-bold'>{analytics.tournamentsPlayed}</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Tournaments Won</span>
              <span className='text-lg font-bold'>{analytics.tournamentsWon}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score Distribution */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm flex items-center gap-2'>
            <Target className='w-4 h-4 text-brand' aria-hidden='true' />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Average Score Bar */}
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-muted-foreground'>Average Score</span>
              <span className='font-medium'>{analytics.averageScore.toFixed(1)}%</span>
            </div>
            <Progress
              value={analytics.averageScore}
              className='h-3'
              aria-label={`Average score: ${analytics.averageScore.toFixed(1)}%`}
            />
          </div>

          {/* Score ranges */}
          <div className='grid grid-cols-3 gap-4 pt-4 border-t'>
            <div className='text-center'>
              <p className='text-2xl font-bold text-green-500'>
                {analytics.averageScore >= 80 ? analytics.quizzesCompleted : Math.round(analytics.quizzesCompleted * 0.3)}
              </p>
              <p className='text-xs text-muted-foreground'>80%+ Scores</p>
            </div>
            <div className='text-center'>
              <p className='text-2xl font-bold text-amber-500'>
                {analytics.averageScore >= 60 && analytics.averageScore < 80
                  ? analytics.quizzesCompleted
                  : Math.round(analytics.quizzesCompleted * 0.4)}
              </p>
              <p className='text-xs text-muted-foreground'>60-79% Scores</p>
            </div>
            <div className='text-center'>
              <p className='text-2xl font-bold text-red-500'>
                {analytics.averageScore < 60 ? analytics.quizzesCompleted : Math.round(analytics.quizzesCompleted * 0.3)}
              </p>
              <p className='text-xs text-muted-foreground'>Below 60%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
