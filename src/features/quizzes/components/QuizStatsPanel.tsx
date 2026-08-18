'use client';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/shared/utils/merge-class-names';
import type { ApiError } from '@/lib/api';
import type { QuizStatsResponseDto } from '@/lib/api/generated/schemas/quizStatsResponseDto';

const NUMBER_FORMAT = new Intl.NumberFormat('en-US');
const ZERO_STATS: Omit<QuizStatsResponseDto, 'quizId'> = {
totalAttempts: 0,
uniquePlayers: 0,
averageScore: 0,
averageRating: 0,
bookmarkCount: 0,
completionRate: 0,
popularityScore: 0,
trendingScore: 0,
commentsCount: 0,
recentActivity: [],
};

const PANEL = 'rounded-xl border bg-card p-4 shadow-sm sm:p-6';
const METRIC_GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-4';
const METRIC = 'min-w-0 rounded-lg border bg-background p-3';
const METRIC_LABEL = 'text-xs font-medium text-muted-foreground';
const METRIC_VALUE = 'mt-1 block text-xl font-semibold tabular-nums text-foreground';
const TREND_PLACEHOLDER =
'mt-4 flex h-20 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 text-center text-xs text-muted-foreground';

interface MetricDefinition {
label: string;
value: (stats: Omit<QuizStatsResponseDto, 'quizId'>) => number;
format: (value: number) => string;
}

const METRICS: readonly MetricDefinition[] = [
{
label: 'Total attempts',
value: (stats) => stats.totalAttempts,
format: (value) => NUMBER_FORMAT.format(value),
  },
{
label: 'Unique players',
value: (stats) => stats.uniquePlayers,
format: (value) => NUMBER_FORMAT.format(value),
  },
{
label: 'Average score',
value: (stats) => stats.averageScore,
format: (value) => `${value.toFixed(1)}%`,
  },
{
label: 'Average rating',
value: (stats) => stats.averageRating,
format: (value) => `${value.toFixed(1)} / 5`,
  },
{
label: 'Bookmarks',
value: (stats) => stats.bookmarkCount,
format: (value) => NUMBER_FORMAT.format(value),
  },
{
label: 'Completion rate',
value: (stats) => stats.completionRate,
format: (value) => `${value.toFixed(1)}%`,
  },
{
label: 'Popularity score',
value: (stats) => stats.popularityScore,
format: (value) => value.toFixed(1),
  },
{
label: 'Trending score',
value: (stats) => stats.trendingScore,
format: (value) => value.toFixed(1),
  },
];

export interface QuizStatsPanelProps {
stats: QuizStatsResponseDto | null;
isLoading?: boolean;
noStats?: boolean;
error?: ApiError | null;
onRetry?: () => void | Promise<void>;
isRetrying?: boolean;
className?: string;
}

export interface QuizStatsPanelSkeletonProps {
className?: string;
}

export function QuizStatsPanelSkeleton({
className,
}: QuizStatsPanelSkeletonProps) {
return (
<section
className={cn(PANEL, className)}
aria-label='Loading quiz statistics'
aria-busy='true'
data-testid='quiz-stats-panel-skeleton'
    >
<Skeleton className='mb-4 h-7 w-36' />
<div className={METRIC_GRID} data-testid='quiz-stats-metric-skeletons'>
{METRICS.map((metric) => (
<div key={metric.label} className={METRIC}>
<Skeleton className='h-3 w-20 max-w-full' />
<Skeleton className='mt-2 h-7 w-16 max-w-full' />
</div>
        ))}
</div>
<Skeleton className='mt-4 h-20 w-full' data-testid='quiz-stats-sparkline-skeleton' />
</section>
  );
}

export function QuizStatsPanel({
stats,
isLoading = false,
noStats = false,
error = null,
onRetry,
isRetrying = false,
className,
}: QuizStatsPanelProps) {
if (isLoading) {
return <QuizStatsPanelSkeleton className={className} />;
  }

if (error) {
return (
<section
className={cn(PANEL, className)}
aria-labelledby='quiz-stats-heading'
data-testid='quiz-stats-panel'
data-state='error'
      >
<h2 id='quiz-stats-heading' className='text-xl font-semibold text-foreground'>
Quiz statistics
        </h2>
<div className='mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4' role='alert'>
<p className='font-medium text-foreground'>Statistics are temporarily unavailable</p>
<p className='mt-1 text-sm text-muted-foreground'>The rest of this quiz is still available.</p>
<Button
type='button'
variant='outline'
className='mt-3 min-w-24'
onClick={() => void onRetry?.()}
disabled={isRetrying}
data-testid='quiz-stats-retry'
          >
{isRetrying ? 'Retrying…' : 'Retry'}
</Button>
</div>
</section>
    );
  }

const showZeroState = noStats || stats === null || stats.totalAttempts === 0;
const displayStats: Omit<QuizStatsResponseDto, 'quizId'> =
showZeroState || stats === null ? ZERO_STATS : stats;

return (
<section
className={cn(PANEL, className)}
aria-labelledby='quiz-stats-heading'
data-testid='quiz-stats-panel'
data-state={showZeroState ? 'empty' : 'resolved'}
    >
<h2 id='quiz-stats-heading' className='text-xl font-semibold text-foreground'>
Quiz statistics
      </h2>

<dl className={cn(METRIC_GRID, 'mt-4')}>
{METRICS.map((metric) => {
const value = metric.value(displayStats);
return (
<div key={metric.label} className={METRIC} data-testid='quiz-stats-metric'>
<dt className={METRIC_LABEL}>{metric.label}</dt>
<dd className={METRIC_VALUE}>{metric.format(value)}</dd>
</div>
          );
        })}
</dl>

{showZeroState ? (
<p className='mt-4 text-sm text-muted-foreground' data-testid='quiz-stats-empty-caption'>
Data will populate as people play
        </p>
      ) : null}

<div
className={TREND_PLACEHOLDER}
data-testid='quiz-stats-trend-placeholder'
aria-label='Historical activity is not available'
      >
Historical activity is not available yet
      </div>
</section>
  );
}
