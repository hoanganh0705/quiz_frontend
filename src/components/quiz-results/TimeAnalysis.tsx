import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import { TimeAnalysisProps } from '@/types/quizResults'

export default function TimeAnalysis({
  questionReviews,
  avgTimePerQuestion
}: TimeAnalysisProps) {
  return (
    <Card className='mb-8'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Clock className='w-5 h-5' />
          Time Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {questionReviews.map((review, index) => (
            <TimeAnalysisItem key={index} review={review} index={index} />
          ))}
        </div>
        <div className='mt-6 pt-4 border-t border-foreground/10 flex justify-between text-sm'>
          <span className='text-foreground/70'>Average time per question:</span>
          <span className='font-medium'>{avgTimePerQuestion} seconds</span>
        </div>
      </CardContent>
    </Card>
  )
}

interface TimeAnalysisItemProps {
  review: {
    timeTaken: number
    isCorrect: boolean
  }
  index: number
}

function TimeAnalysisItem({ review, index }: TimeAnalysisItemProps) {
  return (
    <div className='flex items-center gap-4'>
      <span className='w-8 text-sm text-foreground/70'>Q{index + 1}</span>
      <div className='flex-1'>
        <Progress
          value={(review.timeTaken / 60) * 100}
          className={`h-3 ${review.isCorrect ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
        />
      </div>
      <span className='w-12 text-sm text-right'>{review.timeTaken}s</span>
      {review.isCorrect ? (
        <CheckCircle2 className='w-5 h-5 text-green-500' />
      ) : (
        <XCircle className='w-5 h-5 text-red-500' />
      )}
    </div>
  )
}
