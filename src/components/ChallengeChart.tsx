'use client'
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { performanceData } from '@/constants/performanceData'
import ChallengePieChart from './ChallengePieChart'

const chartConfig = {
  yourScore: {
    label: 'Your Score'
  },
  avgScore: {
    label: 'Average Score'
  }
} satisfies ChartConfig

const ChallengeChart = () => {
  return (
    <section className=' bg-background text-foreground rounded-lg'>
      {/* Performance Chart */}
      <Card className='bg-background border border-gray-300 dark:border-slate-700 lg:col-span-2 lg:row-span-2 py-6'>
        <CardHeader>
          <CardTitle>Your Challenge Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue='performance' className='w-full'>
            <TabsList className='grid w-full grid-cols-2 bg-main'>
              <TabsTrigger
                value='performance'
                className='data-[state=active]:bg-default data-[state=active]:text-white'
              >
                Performance
              </TabsTrigger>
              <TabsTrigger
                value='categories'
                className='data-[state=active]:bg-default data-[state=active]:text-white'
              >
                Categories
              </TabsTrigger>
            </TabsList>

            <TabsContent value='performance' className='space-y-6 mt-6'>
              <ChartContainer
                config={chartConfig}
                className='min-h-20 [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-main-hover'
              >
                <BarChart
                  accessibilityLayer
                  data={performanceData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5
                  }}
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

              <p className='text-center text-slate-400 text-sm'>
                Your daily challenge performance compared to the average
              </p>
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
