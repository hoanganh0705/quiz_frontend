'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts'
import {
  Trophy,
  Target,
  Clock,
  Flame,
  Zap,
  TrendingUp,
  BookOpen,
  CheckCircle
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { QuizHistoryStats } from '@/types/quizHistory'

interface HistoryStatsDashboardProps {
  stats: QuizHistoryStats
}

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <Card className='bg-background border border-gray-300 dark:border-slate-700'>
      <CardContent className='p-4 flex items-center gap-4'>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className='h-5 w-5 text-white' />
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-sm text-muted-foreground truncate'>{label}</p>
          <p className='text-2xl font-bold'>{value}</p>
          {sub && <p className='text-xs text-muted-foreground mt-0.5'>{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Chart configs ──────────────────────────────────────────────────────────

const weeklyChartConfig = {
  quizzes: { label: 'Quizzes' },
  avgScore: { label: 'Avg Score' }
} satisfies ChartConfig

const trendChartConfig = {
  avgScore: { label: 'Average Score' },
  quizCount: { label: 'Quiz Count' }
} satisfies ChartConfig

// ── Main Component ─────────────────────────────────────────────────────────

export const HistoryStatsDashboard = memo(function HistoryStatsDashboard({
  stats
}: HistoryStatsDashboardProps) {
  const formatPlaytime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`
  }

  const accuracy =
    stats.totalQuestions > 0
      ? Math.round((stats.totalCorrectAnswers / stats.totalQuestions) * 100)
      : 0

  return (
    <div className='space-y-6'>
      {/* KPI Stat Cards */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <StatCard
          icon={BookOpen}
          label='Total Quizzes'
          value={stats.totalQuizzes}
          sub={`${stats.quizzesThisWeek} this week`}
          color='bg-purple-500'
        />
        <StatCard
          icon={Target}
          label='Average Score'
          value={`${stats.averageScore}%`}
          sub={`Best: ${stats.bestScore}%`}
          color='bg-blue-500'
        />
        <StatCard
          icon={Flame}
          label='Current Streak'
          value={`${stats.currentStreak} days`}
          sub={`Longest: ${stats.longestStreak} days`}
          color='bg-orange-500'
        />
        <StatCard
          icon={Zap}
          label='Total XP'
          value={stats.totalXpEarned.toLocaleString()}
          sub={formatPlaytime(stats.totalTimePlayed) + ' played'}
          color='bg-emerald-500'
        />
      </div>

      {/* Accuracy & Difficulty */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Accuracy overview */}
        <Card className='bg-background border border-gray-300 dark:border-slate-700'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base flex items-center gap-2'>
              <CheckCircle className='h-4 w-4 text-green-500' />
              Accuracy Overview
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='text-center'>
              <span className='text-4xl font-bold'>{accuracy}%</span>
              <p className='text-sm text-muted-foreground mt-1'>
                {stats.totalCorrectAnswers} / {stats.totalQuestions} correct
              </p>
            </div>
            <Progress value={accuracy} className='h-3' />
          </CardContent>
        </Card>

        {/* Difficulty breakdown */}
        <Card className='bg-background border border-gray-300 dark:border-slate-700'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-base flex items-center gap-2'>
              <TrendingUp className='h-4 w-4 text-purple-500' />
              By Difficulty
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {(
              [
                { key: 'easy' as const, label: 'Easy', color: 'bg-green-500' },
                {
                  key: 'medium' as const,
                  label: 'Medium',
                  color: 'bg-yellow-500'
                },
                { key: 'hard' as const, label: 'Hard', color: 'bg-red-500' }
              ] as const
            ).map(({ key, label, color }) => {
              const d = stats.difficultyBreakdown[key]
              return (
                <div key={key} className='flex items-center gap-3'>
                  <span className={`w-2 h-2 rounded-full ${color} shrink-0`} />
                  <span className='text-sm w-16'>{label}</span>
                  <Progress value={d.avgScore} className='flex-1 h-2' />
                  <span className='text-sm font-medium w-16 text-right'>
                    {d.avgScore}% ({d.count})
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card className='bg-background border border-gray-300 dark:border-slate-700 py-6'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Trophy className='h-5 w-5 text-yellow-500' />
            Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='weekly' className='w-full'>
            <TabsList className='grid w-full grid-cols-3 bg-main'>
              <TabsTrigger
                value='weekly'
                className='data-[state=active]:bg-default data-[state=active]:text-white'
              >
                Weekly
              </TabsTrigger>
              <TabsTrigger
                value='trend'
                className='data-[state=active]:bg-default data-[state=active]:text-white'
              >
                Score Trend
              </TabsTrigger>
              <TabsTrigger
                value='categories'
                className='data-[state=active]:bg-default data-[state=active]:text-white'
              >
                Categories
              </TabsTrigger>
            </TabsList>

            {/* Weekly activity */}
            <TabsContent value='weekly' className='mt-6'>
              <ChartContainer
                config={weeklyChartConfig}
                className='min-h-20 [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-main-hover'
              >
                <BarChart
                  accessibilityLayer
                  data={stats.weeklyActivity}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  barCategoryGap='20%'
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='#374151'
                    horizontal
                    vertical
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
                  />
                  <ChartLegend
                    content={<ChartLegendContent className='text-sm' />}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey='quizzes'
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
            </TabsContent>

            {/* Monthly score trend */}
            <TabsContent value='trend' className='mt-6'>
              <ChartContainer config={trendChartConfig} className='min-h-20'>
                <LineChart
                  accessibilityLayer
                  data={stats.monthlyScoreTrend}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    stroke='#374151'
                    horizontal
                    vertical
                  />
                  <XAxis
                    dataKey='month'
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
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type='monotone'
                    dataKey='avgScore'
                    stroke='rgb(168 85 247)'
                    strokeWidth={3}
                    dot={{ fill: 'rgb(168 85 247)', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type='monotone'
                    dataKey='quizCount'
                    stroke='rgb(34 197 94)'
                    strokeWidth={2}
                    dot={{ fill: 'rgb(34 197 94)', r: 4 }}
                    strokeDasharray='5 5'
                  />
                </LineChart>
              </ChartContainer>
            </TabsContent>

            {/* Category pie chart */}
            <TabsContent value='categories' className='mt-6'>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={stats.categoryBreakdown}
                      dataKey='count'
                      nameKey='category'
                      cx='50%'
                      cy='50%'
                      outerRadius={100}
                      label={({ category, count }) => `${category}: ${count}`}
                    >
                      {stats.categoryBreakdown.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className='space-y-2'>
                  {stats.categoryBreakdown.map((cat) => (
                    <div
                      key={cat.category}
                      className='flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors'
                    >
                      <span className='text-lg'>{cat.icon}</span>
                      <div className='flex-1 min-w-0'>
                        <p className='text-sm font-medium truncate'>
                          {cat.category}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {cat.count} quizzes · Avg {cat.averageScore}%
                        </p>
                      </div>
                      <div
                        className='w-3 h-3 rounded-full shrink-0'
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
})
