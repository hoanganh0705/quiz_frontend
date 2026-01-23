import Link from 'next/link'
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
  return (
    <Card className='bg-linear-to-br from-default/20 to-default/5 border-default/30 mb-8 overflow-hidden'>
      <CardContent className='p-8'>
        <div className='flex flex-col lg:flex-row items-center gap-8'>
          {/* Score Circle */}
          <div className='relative'>
            <div className='w-48 h-48 rounded-full bg-background border-8 border-default/30 flex items-center justify-center'>
              <div className='text-center'>
                <span
                  className={`text-3xl font-bold ${getScoreColor(result.score)}`}
                >
                  {result.score}%
                </span>
                <div className='text-xl font-semibold text-foreground/70'>
                  Grade: {getScoreGrade(result.score)}
                </div>
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
                className='px-3 py-1 text-sm border-default/50'
              >
                <Target className='w-4 h-4 mr-1' />
                {result.correctCount}/{quiz.questions.length} Correct
              </Badge>
              <Badge
                variant='outline'
                className='px-3 py-1 text-sm border-default/50'
              >
                <Clock className='w-4 h-4 mr-1' />
                {formatTime(result.timeTaken)} Total Time
              </Badge>
              <Badge
                variant='outline'
                className='px-3 py-1 text-sm border-default/50'
              >
                <Users className='w-4 h-4 mr-1' />
                Top {100 - percentile}%
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className='flex flex-wrap gap-3 justify-center lg:justify-start'>
              <Button asChild onClick={onPlayAgain} className='text-white'>
                <Link href={`/quizzes/${quiz.id}/start`}>
                  <RotateCcw className='w-4 h-4 mr-2' />
                  Play Again
                </Link>
              </Button>
              <Button variant='outline' asChild>
                <Link href={`/quizzes`}>
                  <Zap className='w-4 h-4 mr-2' />
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
