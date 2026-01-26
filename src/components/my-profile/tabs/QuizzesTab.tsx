import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Edit, Trophy } from 'lucide-react'

interface QuizEntry {
  id: string
  date: string
  category: string
  score: number
  rank: number
  isTopTen?: boolean
}

interface QuizzesTabProps {
  totalQuizzes: number
  quizzesCreated: number
  quizHistory: QuizEntry[]
}

export function QuizzesTab({
  totalQuizzes,
  quizzesCreated,
  quizHistory
}: QuizzesTabProps) {
  return (
    <div className='mt-6'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center gap-4'>
              <div className='p-3 rounded-lg bg-default/10'>
                <BookOpen className='w-6 h-6 text-default' />
              </div>
              <div>
                <p className='text-xl font-bold text-foreground'>
                  {totalQuizzes}
                </p>
                <p className='text-sm text-muted-foreground'>
                  Quizzes Completed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center gap-4'>
              <div className='p-3 rounded-lg bg-green-500/10'>
                <Edit className='w-6 h-6 text-green-500' />
              </div>
              <div>
                <p className='text-xl font-bold text-foreground'>
                  {quizzesCreated}
                </p>
                <p className='text-sm text-muted-foreground'>Quizzes Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className='p-4 mt-4'>
        <CardHeader>
          <CardTitle className='text-base'>Quiz History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            {quizHistory.map((quiz) => (
              <div
                key={quiz.id}
                className='flex items-center justify-between rounded-lg hover:bg-default/10 transition-colors border p-3 border-default/20'
              >
                <div className='flex items-center gap-3 '>
                  <div className={`p-2 rounded-lg`}>
                    {quiz.isTopTen ? (
                      <Trophy className='w-4 h-4 text-amber-500' />
                    ) : (
                      <BookOpen className='w-4 h-4 text-muted-foreground' />
                    )}
                  </div>
                  <div>
                    <p className='text-sm font-medium text-foreground'>
                      {quiz.category}
                    </p>
                    <p className='text-xs text-muted-foreground'>{quiz.date}</p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-sm font-bold text-foreground'>
                    {quiz.score}%
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Rank #{quiz.rank}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
