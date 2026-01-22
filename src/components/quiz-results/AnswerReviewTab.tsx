import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { AnswerReviewTabProps } from '@/types/quizResults'

export default function AnswerReviewTab({
  questionReviews,
  expandedQuestions,
  onToggleQuestion,
  onExpandAll,
  onCollapseAll
}: AnswerReviewTabProps) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>Question by Question Review</CardTitle>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={onExpandAll}>
            Expand All
          </Button>
          <Button variant='outline' size='sm' onClick={onCollapseAll}>
            Collapse All
          </Button>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {questionReviews.map((review, index) => (
          <QuestionReviewItem
            key={index}
            review={review}
            index={index}
            isExpanded={expandedQuestions.has(index)}
            onToggle={() => onToggleQuestion(index)}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface QuestionReviewItemProps {
  review: {
    question: string
    image: string
    userAnswer: string | null
    correctAnswer: string
    isCorrect: boolean
    timeTaken: number
    answers: { label: string; value: string }[]
  }
  index: number
  isExpanded: boolean
  onToggle: () => void
}

function QuestionReviewItem({
  review,
  index,
  isExpanded,
  onToggle
}: QuestionReviewItemProps) {
  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        review.isCorrect
          ? 'border-green-500/30 bg-green-500/5'
          : 'border-red-500/30 bg-red-500/5'
      }`}
    >
      {/* Question Header */}
      <button
        className='w-full p-4 flex items-center justify-between hover:bg-foreground/5 transition-colors'
        onClick={onToggle}
      >
        <div className='flex items-center gap-4'>
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              review.isCorrect ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {review.isCorrect ? (
              <CheckCircle2 className='w-5 h-5 text-white' />
            ) : (
              <XCircle className='w-5 h-5 text-white' />
            )}
          </div>
          <div className='text-left'>
            <div className='font-medium'>Question {index + 1}</div>
            <div className='text-sm text-foreground/70 line-clamp-1'>
              {review.question}
            </div>
          </div>
        </div>
        <div className='flex items-center gap-4'>
          <div className='text-sm text-foreground/70'>
            <Clock className='w-4 h-4 inline mr-1' />
            {review.timeTaken}s
          </div>
          {isExpanded ? (
            <ChevronUp className='w-5 h-5' />
          ) : (
            <ChevronDown className='w-5 h-5' />
          )}
        </div>
      </button>

      {/* Question Details */}
      {isExpanded && (
        <div className='p-4 border-t border-foreground/10'>
          <div className='grid md:grid-cols-2 gap-6'>
            {/* Question Image */}
            {review.image && (
              <div>
                <Image
                  src={review.image}
                  alt={review.question}
                  width={300}
                  height={200}
                  className='rounded-lg object-cover w-full'
                />
              </div>
            )}

            {/* Answers */}
            <div className='space-y-3'>
              <h4 className='font-semibold mb-3'>{review.question}</h4>
              {review.answers.map((answer) => (
                <AnswerOption
                  key={answer.label}
                  answer={answer}
                  userAnswer={review.userAnswer}
                  correctAnswer={review.correctAnswer}
                  isCorrect={review.isCorrect}
                />
              ))}
              {!review.userAnswer && (
                <p className='text-sm text-foreground/50 italic'>
                  You didn&apos;t answer this question
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface AnswerOptionProps {
  answer: { label: string; value: string }
  userAnswer: string | null
  correctAnswer: string
  isCorrect: boolean
}

function AnswerOption({
  answer,
  userAnswer,
  correctAnswer,
  isCorrect
}: AnswerOptionProps) {
  const isUserAnswer = userAnswer === answer.value
  const isCorrectAnswer = correctAnswer === answer.value

  let answerStyle = 'border-foreground/20 bg-background'
  if (isCorrectAnswer) {
    answerStyle =
      'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
  } else if (isUserAnswer && !isCorrect) {
    answerStyle = 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
  }

  return (
    <div
      className={`p-3 rounded-lg border flex items-center gap-3 ${answerStyle}`}
    >
      <span className='w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium'>
        {answer.label}
      </span>
      <span className='flex-1'>{answer.value}</span>
      {isCorrectAnswer && <CheckCircle2 className='w-5 h-5 text-green-500' />}
      {isUserAnswer && !isCorrect && (
        <XCircle className='w-5 h-5 text-red-500' />
      )}
    </div>
  )
}
