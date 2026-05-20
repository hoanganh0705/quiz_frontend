import { Button } from '@/components/ui/Button'
import { format-duration } from '@/features/quizzes/lib/format-duration'
import { quizzes } from '@/features/quizzes/constants/mock-quizzes'
import Image from 'next/image'
import { Badge } from '@/components/ui/Badge'
import { difficulty-colors } from '@/features/quizzes/constants/difficulty-color'
import type { QuizQuestion } from '@/features/quizzes/types'

const QuizOverviewPanel = ({
  description,
  requirements,
  duration,
  tags,
  previewQuestions,
  questionCount
}: {
  description: string
  requirements: string
  duration: number
  tags: string[]
  previewQuestions: QuizQuestion[]
  questionCount: number
}) => {
  return (
    <div className='space-y-6 text-foreground'>
      <div id='preview-questions'>
        <h2 className='text-xl font-bold mb-4'>Description</h2>
        <p className='text-foreground/80 leading-relaxed text-[0.9rem]'>
          {description}
        </p>
      </div>

      <div>
        <h2 className='text-xl font-bold mb-4'>Requirements</h2>
        <p className='text-foreground/80 leading-relaxed text-[0.9rem]'>
          {requirements}
        </p>
        <p className='text-foreground/80 leading-relaxed text-[0.9rem]'>
          Completion time:{' '}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {format-duration(duration)}
          </span>
        </p>
      </div>

      <div>
        <h2 className='text-xl font-bold mb-4'>Preview Questions</h2>
        <div className='space-y-3'>
          {previewQuestions.map((question, index) => {
            const isLocked = index >= 2
            return (
              <div
                key={question.id}
                className={`rounded-lg border border-border bg-background p-4 ${
                  isLocked ? 'relative overflow-hidden' : ''
                }`}
              >
                <div
                  className={`text-sm font-semibold text-foreground ${
                    isLocked ? 'blur-[3px]' : ''
                  }`}
                >
                  {question.question}
                </div>
                <div
                  className={`mt-2 text-xs text-muted-foreground ${
                    isLocked ? 'blur-[3px]' : ''
                  }`}
                >
                  {question.answers.length} options
                </div>
                {isLocked && (
                  <div className='absolute inset-0 flex items-center justify-center bg-background/60'>
                    <span className='text-xs font-semibold text-foreground'>
                      Sign in to unlock all {questionCount} questions
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className='max-w-6xl mx-auto'>
        {/* Tags Section */}
        <div className='mb-8'>
          <h2 className='text-2xl font-bold mb-4'>Tags</h2>
          <div className='flex flex-wrap gap-3'>
            {tags?.map((tag) => (
              <Button
                key={tag}
                variant='outline'
                className='border-border text-foreground hover:bg-accent bg-transparent px-2 py-1 h-auto leading-none'
              >
                <span className='text-xs'>{tag}</span>
              </Button>
            ))}
          </div>

          {/* Related Quizzes Section ( do it later)*/}
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className='relative group cursor-pointer rounded-lg overflow-hidden transition-transform hover:scale-105'
          >
            {/* Background Image */}
            <div className='relative h-32 w-full'>
              <Image
                src={quiz.image || '/placeholder.svg'}
                alt={`${quiz.title} quiz cover`}
                fill
                loading='lazy'
                className='object-cover'
              />
              {/* Overlay */}
              <div className='absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors' />
            </div>

            {/* Content */}
            <div className='absolute inset-0 flex flex-col justify-between p-4'>
              {/* Difficulty Badge */}
              <div className='flex justify-start'>
                <Badge
                  className={`${
                    difficulty-colors[quiz.difficulty].bg
                  } text-white text-xs px-2 py-1 font-medium`}
                >
                  {quiz.difficulty}
                </Badge>
              </div>

              {/* Title */}
              <div className='flex-1 flex items-end'>
                <h3 className='text-white font-semibold text-sm leading-tight'>
                  {quiz.title}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default QuizOverviewPanel
