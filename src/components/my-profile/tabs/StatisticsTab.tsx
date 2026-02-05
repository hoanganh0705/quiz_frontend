import { memo } from 'react'
// Fix barrel imports (bundle-barrel-imports)
import { Card } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'
import { CardHeader } from '@/components/ui/card'
import { CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BarChart3, TrendingUp } from 'lucide-react'
import { Player } from '@/constants/players'

interface QuizEntry {
  id: string
  category: string
  score: number
}

interface StatisticsTabProps {
  user: Player
  averageScore: number
  winRate: number
  quizHistory: QuizEntry[]
}

export const StatisticsTab = memo(function StatisticsTab({
  user,
  averageScore,
  winRate,
  quizHistory
}: StatisticsTabProps) {
  return (
    <div className='mt-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Card className='p-4'>
          <CardHeader>
            <CardTitle className='text-base flex items-center gap-2'>
              <BarChart3 className='w-4 h-4 text-default' aria-hidden='true' />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>
                Average Score
              </span>
              <span className='text-sm font-bold text-foreground'>
                {averageScore.toFixed(1)}%
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Win Rate</span>
              <span className='text-sm font-bold text-foreground'>
                {winRate}%
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>
                Completion Rate
              </span>
              <span className='text-sm font-bold text-foreground'>94%</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Total Score</span>
              <span className='text-sm font-bold text-foreground'>
                {user.score?.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className='p-4'>
          <CardHeader>
            <CardTitle className='text-base flex items-center gap-2'>
              <TrendingUp
                className='w-4 h-4 text-green-500'
                aria-hidden='true'
              />
              Streaks & Records
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>
                Current Streak
              </span>
              <span className='text-sm font-bold text-foreground'>
                {user.streak} days
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>
                Longest Streak
              </span>
              <span className='text-sm font-bold text-foreground'>14 days</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Best Score</span>
              <span className='text-sm font-bold text-foreground'>98%</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-sm text-muted-foreground'>Best Rank</span>
              <span className='text-sm font-bold text-foreground'>#1</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      <Card className='mt-4 p-4'>
        <CardHeader>
          <CardTitle className='text-base'>Category Performance</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          {quizHistory.slice(0, 4).map((quiz) => (
            <div key={quiz.id} className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-foreground'>{quiz.category}</span>
                <span className='text-muted-foreground'>{quiz.score}%</span>
              </div>
              <Progress
                value={quiz.score}
                className='h-2'
                aria-label={`${quiz.category} performance: ${quiz.score}%`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
})
