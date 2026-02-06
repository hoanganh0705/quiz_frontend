import Link from 'next/link'
import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Clock, Target, Users, RotateCcw, Zap } from 'lucide-react'
import { ScoreHeroProps } from '@/types/quizResults'
import {
  getScoreColor,
  getScoreGrade,
  getScoreMessage,
  formatTime
} from '@/lib/quizResultsUtils'

export default function ScoreHero({
  quiz,
  result,
  percentile,
  onPlayAgain
}: ScoreHeroProps) {
  const scorePercentage = result.score / 100
  const strokeColor = useMemo(() => {
    if (result.score >= 80) return 'rgb(34, 197, 94)' // Green
    if (result.score >= 60) return 'rgb(234, 179, 8)' // Yellow
    if (result.score >= 40) return 'rgb(249, 115, 22)' // Orange
    return 'rgb(239, 68, 68)' // Red
  }, [result.score])

  // Easy to modify: Change these values to adjust size
  const unoccupiedColor = 'rgb(230, 230, 230)'
  const radius = 10 // Circle radius in viewBox units
  const strokeWidth = 1 // Stroke thickness in viewBox units
  const circumference = 2 * Math.PI * radius

  return (
    <Card className=' mb-8 overflow-hidden'>
      <CardContent className='p-8'>
        <div className='flex flex-col lg:flex-row items-center gap-8'>
          {/* Score Circle - Change w-48 h-48 to adjust overall size */}
          <div className='relative w-48 h-48 flex items-center justify-center'>
            <svg className='absolute w-full h-full' viewBox='0 0 24 24'>
              {/* Background circle */}
              <circle
                cx='12'
                cy='12'
                r={radius}
                strokeWidth={strokeWidth}
                fill='none'
                stroke={unoccupiedColor}
              />
              {/* Progress arc */}
              <circle
                cx='12'
                cy='12'
                r={radius}
                strokeWidth={strokeWidth}
                fill='none'
                stroke={strokeColor}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - scorePercentage)}
                strokeLinecap='round'
                transform='rotate(-90 12 12)'
              />
            </svg>
            {/* Center content */}
            <div className='text-center z-10'>
              <span
                className={`text-3xl font-bold ${getScoreColor(result.score)}`}
              >
                {result.score}%
              </span>
              <div className='text-base font-semibold text-foreground/70'>
                Grade: {getScoreGrade(result.score)}
              </div>
            </div>
          </div>

          {/* Score Info */}
          <div className='flex-1 text-center lg:text-left'>
            <h1 className='text-2xl md:text-3xl font-bold mb-2'>
              {quiz.title}
            </h1>
            <p className='text-base text-foreground/70 mb-4'>
              {getScoreMessage(result.score)}
            </p>

            <div className='flex flex-wrap gap-2 justify-center lg:justify-start mb-6'>
              <Badge
                variant='outline'
                className='px-3 py-1 text-sm border border-gray-300 dark:border-slate-700'
              >
                <Target className='w-4 h-4 mr-1' aria-hidden='true' />
                {result.correctCount}/{quiz.questions.length} Correct
              </Badge>
              <Badge
                variant='outline'
                className='px-3 py-1 text-sm border border-gray-300 dark:border-slate-700'
              >
                <Clock className='w-4 h-4 mr-1' aria-hidden='true' />
                {formatTime(result.timeTaken)} Total Time
              </Badge>
              <Badge
                variant='outline'
                className='px-3 py-1 text-sm border border-gray-300 dark:border-slate-700'
              >
                <Users className='w-4 h-4 mr-1' aria-hidden='true' />
                Top {100 - percentile}%
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className='flex flex-wrap gap-3 justify-center lg:justify-start'>
              <Button
                asChild
                onClick={onPlayAgain}
                variant={'outline'}
                className='dark:bg-default dark:text-white dark:hover:bg-default-hover'
              >
                <Link href={`/quizzes/${quiz.id}/start`}>
                  <RotateCcw className='w-4 h-4 mr-2' aria-hidden='true' />
                  Play Again
                </Link>
              </Button>
              <Button
                variant='outline'
                asChild
                className='dark:bg-default dark:text-white dark:hover:bg-default-hover'
              >
                <Link href={`/quizzes`}>
                  <Zap className='w-4 h-4 mr-2' aria-hidden='true' />
                  Try Similar Quiz
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
