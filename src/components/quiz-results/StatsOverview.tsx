import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, Clock, Medal } from 'lucide-react'
import { StatsOverviewProps } from '@/types/quizResults'

export default function StatsOverview({
  result,
  avgTimePerQuestion
}: StatsOverviewProps) {
  const totalQuestions = result.correctCount + result.incorrectCount
  const correctPercentage = (result.correctCount / totalQuestions) * 100
  const incorrectPercentage = (result.incorrectCount / totalQuestions) * 100

  return (
    <Card className='bg-background border border-gray-300 dark:border-slate-700 mb-8'>
      <CardContent className='p-6 space-y-6'>
        {/* Correct Answers */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <CheckCircle2 className='w-5 h-5 text-green-500' />
              <span className='text-sm font-medium text-foreground'>
                Correct Answers
              </span>
            </div>
            <span className='text-sm font-bold text-green-500'>
              {result.correctCount}/{totalQuestions} (
              {correctPercentage.toFixed(0)}%)
            </span>
          </div>
          <Progress
            value={correctPercentage}
            className='h-2 [&>div]:bg-green-500'
          />
        </div>

        {/* Incorrect Answers */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <XCircle className='w-5 h-5 text-red-500' />
              <span className='text-sm font-medium text-foreground'>
                Incorrect Answers
              </span>
            </div>
            <span className='text-sm font-bold text-red-500'>
              {result.incorrectCount}/{totalQuestions} (
              {incorrectPercentage.toFixed(0)}%)
            </span>
          </div>
          <Progress
            value={incorrectPercentage}
            className='h-2 [&>div]:bg-red-500'
          />
        </div>

        {/* Average Time */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Clock className='w-5 h-5 text-blue-500' />
              <span className='text-sm font-medium text-foreground'>
                Avg. Time per Question
              </span>
            </div>
            <span className='text-sm font-bold text-blue-500'>
              {avgTimePerQuestion}s
            </span>
          </div>
          <Progress
            value={(avgTimePerQuestion / 60) * 100}
            className='h-2 [&>div]:bg-blue-500'
          />
        </div>
      </CardContent>
    </Card>
  )
}
