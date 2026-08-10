import { Button } from '@/components/ui/Button'
import type { QuizQuestionAuthorDto } from '@/lib/api/generated/schemas'

interface QuizOverviewPanelProps {
  description: string
  requirements: string
  duration: number
  tags: string[]
  previewQuestions: QuizQuestionAuthorDto[]
  questionCount: number
}

// Format duration from milliseconds to readable format
const formatDurationMs = (ms: number) => {
  const minutes = Math.floor(ms / 60000)
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }
  return `${minutes} min`
}

export default function QuizOverviewPanel({
  description,
  requirements,
  duration,
  tags,
  previewQuestions,
  questionCount
}: QuizOverviewPanelProps) {
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
          {requirements || 'No special requirements'}
        </p>
        <p className='text-foreground/80 leading-relaxed text-[0.9rem]'>
          Completion time:{' '}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatDurationMs(duration)}
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
                key={question.questionId ?? index}
                className={`rounded-lg border border-border bg-background p-4 ${
                  isLocked ? 'relative overflow-hidden' : ''
                }`}
              >
                <div
                  className={`text-sm font-semibold text-foreground ${
                    isLocked ? 'blur-[3px]' : ''
                  }`}
                >
                  {question.questionText}
                </div>
                <div
                  className={`mt-2 text-xs text-muted-foreground ${
                    isLocked ? 'blur-[3px]' : ''
                  }`}
                >
                  {question.answerOptions?.length ?? 0} options
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
        {tags && tags.length > 0 && (
          <div className='mb-8'>
            <h2 className='text-2xl font-bold mb-4'>Tags</h2>
            <div className='flex flex-wrap gap-3'>
              {tags.map((tag) => (
                <Button
                  key={tag}
                  variant='outline'
                  className='border-border text-foreground hover:bg-accent bg-transparent px-2 py-1 h-auto leading-none'
                >
                  <span className='text-xs'>{tag}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Quizzes Section - TODO: Implement with API */}
    </div>
  )
}
