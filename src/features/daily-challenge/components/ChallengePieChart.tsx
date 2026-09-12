'use client'

/**
 * `<ChallengePieChart />` — Categories tab content for the Daily
 * Challenge page.
 *
 * Source epic:   Phase 4 (F-2 in the remaining-gaps plan) — replace
 *                the hardcoded `data` array with the real
 *                `/daily-challenge/history/categories` endpoint.
 * Source ticket: F-2.
 *
 * Renders a pie chart of the viewer's per-category performance
 * rollup. Each slice is one category from
 * `useDailyChallengeCategoryBreakdown()`; the slice's "value" is
 * the category's `attemptCount`. This is intentionally a COUNT
 * distribution, not a percentage — the user's relative experience
 * per category is what they came here to see.
 *
 * Loading / error / empty states:
 * - **Loading** → centred skeleton matching the pie chart's footprint.
 * - **Empty** (`items.length === 0`) → "Take today's challenge to
 *   start your breakdown" copy, no chart.
 * - **Error** → typed alert with retry.
 *
 * Colours are assigned deterministically by hashing the category
 * slug into a fixed palette of 8 hues so the chart stays stable
 * across renders (and so two charts on the same page use the same
 * colour for the same category).
 */

import { AlertCircle, RefreshCw } from 'lucide-react'
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  PieLabelRenderProps,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import { ApiError } from '@/lib/api'

import {
  useDailyChallengeCategoryBreakdown,
  type DailyChallengeCategoryBreakdownItemWithMeta,
} from '@/features/daily-challenge/hooks/useDailyChallengeCategoryBreakdown'

// 8-hue palette designed to be distinct in both light + dark themes
// (saturated mid-tones with reasonable luminance separation).
const PIE_PALETTE = [
  '#a855f7', // purple-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#ec4899', // pink-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
] as const

const RADIAN = Math.PI / 180

function colorForSlug(slug: string): string {
  // Cheap deterministic hash → palette index. djb2-ish; collision
  // rate is irrelevant here because we just need stable colours.
  let hash = 5381
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 33) ^ slug.charCodeAt(i)
  }
  const index = Math.abs(hash) % PIE_PALETTE.length
  return PIE_PALETTE[index]!
}

interface ChartDatum {
  id: string
  name: string
  value: number
  color: string
  averageScorePercent: number
}

function toChartData(
  items: readonly DailyChallengeCategoryBreakdownItemWithMeta[],
): readonly ChartDatum[] {
  return items.map((item) => ({
    id: item.id,
    name: item.categoryName || item.categorySlug || item.categoryId,
    value: item.attemptCount,
    color: colorForSlug(item.categorySlug || item.categoryId),
    averageScorePercent: item.averageScorePercent,
  }))
}

function isTransient5xx(error: ApiError | null): boolean {
  return error !== null && error.status >= 500
}

function PieEmptyState() {
  return (
    <div
      data-testid='challenge-pie-empty-state'
      role='status'
      className='flex h-96 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground'
    >
      <p className='font-medium text-foreground'>No category breakdown yet.</p>
      <p>Take today&apos;s challenge to start your per-category stats.</p>
    </div>
  )
}

function PieErrorState({
  error,
  onRetry,
}: {
  error: ApiError
  onRetry: () => void
}) {
  const transient = isTransient5xx(error)
  return (
    <div
      data-testid='challenge-pie-error-state'
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
            ? "We're having trouble loading your category breakdown. Please try again in a moment."
            : 'Your category breakdown is unavailable right now.'}
        </p>
        <button
          type='button'
          onClick={onRetry}
          className='inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'
          aria-label='Retry loading category breakdown'
        >
          <RefreshCw className='h-3 w-3' aria-hidden='true' />
          Retry
        </button>
      </div>
    </div>
  )
}

function PieLoadingSkeleton() {
  return (
    <div
      data-testid='challenge-pie-loading'
      role='status'
      aria-busy={true}
      aria-label='Loading category breakdown'
      className='h-96 w-full animate-pulse rounded-md bg-muted/40'
    />
  )
}

function renderCustomizedLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props
  if (
    typeof cx !== 'number' ||
    typeof cy !== 'number' ||
    typeof midAngle !== 'number' ||
    typeof innerRadius !== 'number' ||
    typeof outerRadius !== 'number' ||
    typeof percent !== 'number'
  ) {
    return null
  }
  // Hide labels for tiny slices (< 5%) — they crowd the chart and
  // the legend covers them anyway.
  if (percent < 0.05) return null

  const radius = innerRadius + (outerRadius - innerRadius) * 1.2
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill='currentColor'
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline='central'
      className='text-sm font-medium'
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function CategoryPie({
  data,
}: {
  data: readonly ChartDatum[]
}) {
  return (
    <div
      data-testid='challenge-pie-chart'
      className='h-96 w-full max-w-4xl mx-auto p-8 bg-background rounded-lg text-foreground'
    >
      <ResponsiveContainer width='100%' height='100%'>
        <PieChart>
          <Pie
            data={data as ChartDatum[]}
            cx='50%'
            cy='50%'
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={120}
            fill='#8884d8'
            dataKey='value'
            className='text-foreground'
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={entry.color}
                className='text-foreground'
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--main)',
              border: 'none',
              padding: '10px',
            }}
            itemStyle={{ color: 'var(--foreground)' }}
            // Recharts formatter signature: (value, name, props) => ReactNode
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: number, _name: string, item: any) => {
              const datum = item?.payload as ChartDatum | undefined
              return [
                `${value} attempt${value === 1 ? '' : 's'}${
                  datum ? ` · ${datum.averageScorePercent.toFixed(1)}% avg` : ''
                }`,
                datum?.name ?? '',
              ]
            }}
          />
          <Legend wrapperStyle={{ color: 'var(--foreground)' }} />
        </PieChart>
      </ResponsiveContainer>
      <p className='text-center text-muted-foreground text-sm mt-4'>
        Distribution of your completed daily challenges by category
      </p>
    </div>
  )
}

function CategoryPiePanel() {
  const { items, isLoading, error, refresh } =
    useDailyChallengeCategoryBreakdown()

  if (isLoading) {
    return <PieLoadingSkeleton />
  }

  if (error !== null) {
    return (
      <PieErrorState
        error={error}
        onRetry={() => {
          void refresh()
        }}
      />
    )
  }

  if (items.length === 0) {
    return <PieEmptyState />
  }

  const data = toChartData(items)
  return <CategoryPie data={data} />
}

export function ChallengeChart() {
  return <CategoryPiePanel />
}

export default ChallengeChart
