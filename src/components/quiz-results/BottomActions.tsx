import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RotateCcw, Zap } from 'lucide-react'

interface BottomActionsProps {
  quizId: string
  onPlayAgain: () => void
}

export default function BottomActions({
  quizId,
  onPlayAgain
}: BottomActionsProps) {
  return (
    <div className='flex flex-col sm:flex-row gap-4 justify-center'>
      <Button size='lg' asChild onClick={onPlayAgain}>
        <Link href={`/quizzes/${quizId}/start`}>
          <RotateCcw className='w-5 h-5 mr-2' />
          Play Again
        </Link>
      </Button>
      <Button size='lg' variant='outline' asChild>
        <Link href='/quizzes'>
          <Zap className='w-5 h-5 mr-2' />
          Explore More Quizzes
        </Link>
      </Button>
    </div>
  )
}
