'use client'

/**
 * `<ChallengeChart />` — Performance + Categories tabs for the
 * Daily Challenge page.
 *
 * Source epic:   Phase 1 (F-2 in the remaining-gaps plan) — replace
 *                hardcoded `performanceData` with real
 *                `/daily-challenge/history` aggregates.
 * Source ticket: F-2.
 *
 * Renders the **Performance** tab from the rollup produced by
 * `useDailyChallengePerformance()` (7 entries, Mon→Sun). "Average
 * Score" is the mean of every history attempt on that weekday (not
 * a global average).
 *
 * Loading / error / empty states:
 * - **Loading** → bar-chart skeleton (matches the desktop layout).
 * - **Empty** (`totalAttempts === 0`) → "Take today's challenge to
 *   start your streak" copy, no bars.
 * - **Error** → typed alert with retry.
 *
 * The component is currently exported but not yet mounted on
 * `<DailyChallengePage />`. It is ready to drop in whenever the
 * product decides to surface the chart. Until then it serves as a
 * data-driven placeholder so the historic hardcoded `performanceData`
 * constant can be retired without leaving any caller with a broken
 * import.
 */

import { AlertCircle, RefreshCw } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/Chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  useDailyChallengePerformance,
  type DailyChallengePerformanceDay,
} from '@/features/daily-challenge/hooks/useDailyChallengePerformance'

import ChallengePieChart from './ChallengePieChart'

const chartConfig = {
  yourScore: {
    label: 'Your Score',
  },
  avgScore: {
    label: 'Average Score',
  },
} satisfies ChartConfig

interface ChallengeChartProps {
  /**
   * Optional className forwarded to the outermost `<section>`. Mirrors
   * the convention used by sibling components in this feature.
   */
  className?: string
}

function isTransient5xx(
  error: import('@/lib/api').ApiError | null,
): boolean {
  return error !== null && error.status >= 500
}

function PerformanceEmptyState() {
  return (
    <div
      data-testid='challenge-chart-empty-state'
      role='status'
      className='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-4 py-10 text-center text-sm text-foreground-secondary'
    >
      <p className='font-medium text-foreground'>No challenge history yet.</p>
      <p>Take today&apos;s challenge to start your streak.</p>
    </div>
  )
}

function PerformanceErrorState({
  error,
  onRetry,
}: {
  error: import('@/lib/api').ApiError
  onRetry: () => void
}) {
  const transient = isTransient5xx(error)
  return (
    <div
      data-testid='challenge-chart-error-state'
      role='alert'
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
        transient
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-border bg-muted/50 text-foreground/80'
      }`}
    >
      <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
      <div className='flex-1 space-y-2'>
        <p>
          {transient
            ? "We're having trouble loading your challenge history. Please try again in a moment."
            : 'Your challenge history is unavailable right now. The rest of the page is unaffected.'}
        </p>
        <button
          type='button'
          onClick={onRetry}
          className='inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'
          aria-label='Retry loading challenge history'
        >
          <RefreshCw className='h-3 w-3' aria-hidden='true' />
          Retry
        </button>
      </div>
    </div>
  )
}

function PerformanceBars({
  days,
}: {
  days: readonly DailyChallengePerformanceDay[]
}) {
  return (
    <ChartContainer
      config={chartConfig}
      className='min-h-20 [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-main-hover'
    >
      <BarChart
        accessibilityLayer
        data={days as DailyChallengePerformanceDay[]}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        barCategoryGap='20%'
      >
        <CartesianGrid
          strokeDasharray='3 3'
          stroke='#374151'
          horizontal={true}
          vertical={true}
        />
        <XAxis
          dataKey='day'
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9CA3AF', fontSize: 14 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#9CA3AF', fontSize: 14 }}
          domain={[0, 100]}
        />
        <ChartLegend
          content={<ChartLegendContent className='text-sm' />}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--main)' }}
          content={<ChartTooltipContent />}
        />
        <Bar
          dataKey='yourScore'
          fill='rgb(168 85 247)'
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey='avgScore'
          fill='rgb(34 197 94)'
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}

function PerformancePanel() {
  const { days, totalAttempts, isLoading, error, refresh } =
    useDailyChallengePerformance()

  if (isLoading) {
    return (
      <div
        data-testid='challenge-chart-loading'
        role='status'
        aria-busy={true}
        aria-label='Loading challenge performance'
        className='h-64 w-full animate-pulse rounded-md bg-muted/40'
      />
    )
  }

  if (error !== null) {
    return (
      <PerformanceErrorState
        error={error}
        onRetry={() => {
          void refresh()
        }}
      />
    )
  }

  if (totalAttempts === 0) {
    return <PerformanceEmptyState />
  }

  return (
    <div data-testid='challenge-chart-bars'>
      <PerformanceBars days={days} />
      <p className='mt-3 text-center text-sm text-muted-foreground'>
        Your daily challenge performance compared to the average
      </p>
    </div>
  )
}

export function ChallengeChart({ className }: ChallengeChartProps = {}) {
  return (
    <section
      data-testid='challenge-chart'
      className={`bg-background text-foreground rounded-lg ${className ?? ''}`.trim()}
    >
      <Card className='bg-background border border-border lg:col-span-2 lg:row-span-2 py-6'>
        <CardHeader>
          <CardTitle>Your Challenge Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='performance' className='w-full'>
            <TabsList className='grid w-full grid-cols-2 bg-main'>
              <TabsTrigger
                value='performance'
                className='data-[state=active]:bg-brand data-[state=active]:text-white'
              >
                Performance
              </TabsTrigger>
              <TabsTrigger
                value='categories'
                className='data-[state=active]:bg-brand data-[state=active]:text-white'
              >
                Categories
              </TabsTrigger>
            </TabsList>

            <TabsContent value='performance' className='mt-6 space-y-6'>
              <PerformancePanel />
            </TabsContent>

            <TabsContent value='categories'>
              <ChallengePieChart />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  )
}

export default ChallengeChart
