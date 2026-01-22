import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, XCircle, Clock, Medal } from 'lucide-react'
import { StatsOverviewProps } from '@/types/quizResults'

export default function StatsOverview({
  result,
  avgTimePerQuestion
}: StatsOverviewProps) {
  return (
    <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
      <Card className='bg-green-500/10 border-green-500/30'>
        <CardContent className='p-4 text-center'>
          <CheckCircle2 className='w-8 h-8 text-green-500 mx-auto mb-2' />
          <div className='text-2xl font-bold text-green-500'>
            {result.correctCount}
          </div>
          <div className='text-sm text-foreground/70'>Correct</div>
        </CardContent>
      </Card>
      <Card className='bg-red-500/10 border-red-500/30'>
        <CardContent className='p-4 text-center'>
          <XCircle className='w-8 h-8 text-red-500 mx-auto mb-2' />
          <div className='text-2xl font-bold text-red-500'>
            {result.incorrectCount}
          </div>
          <div className='text-sm text-foreground/70'>Incorrect</div>
        </CardContent>
      </Card>
      <Card className='bg-blue-500/10 border-blue-500/30'>
        <CardContent className='p-4 text-center'>
          <Clock className='w-8 h-8 text-blue-500 mx-auto mb-2' />
          <div className='text-2xl font-bold text-blue-500'>
            {avgTimePerQuestion}s
          </div>
          <div className='text-sm text-foreground/70'>Avg. per Question</div>
        </CardContent>
      </Card>
      <Card className='bg-purple-500/10 border-purple-500/30'>
        <CardContent className='p-4 text-center'>
          <Medal className='w-8 h-8 text-purple-500 mx-auto mb-2' />
          <div className='text-2xl font-bold text-purple-500'>
            #{Math.floor(Math.random() * 50) + 1}
          </div>
          <div className='text-sm text-foreground/70'>Your Rank</div>
        </CardContent>
      </Card>
    </div>
  )
}
