'use client'

import { Quiz } from '@/types/quiz'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from './ui/card'
import { ArrowLeft, Clock, RotateCcw } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { useLocalStorage, useCountdownTimer } from '@/hooks'

// Storage key generator
const getStorageKey = (quizId: string) => `quiz_progress_${quizId}`
const getResultsKey = (quizId: string) => `quiz_results_${quizId}`

// Quiz progress interface
interface QuizProgress {
  currentQuestion: number
  answers: Record<number, string>
  timeLeft: number
  timerStarted: boolean
  startedAt: number | null
  timePerQuestion: Record<number, number>
  questionStartTime: number | null
}

// Quiz result interface
interface QuizResult {
  answers: Record<number, string>
  timeTaken: number
  completedAt: number
  score: number
  correctCount: number
  incorrectCount: number
  timePerQuestion: Record<number, number>
}

export default function PlayQuizClient({ quiz }: { quiz: Quiz }) {
  const router = useRouter()
  const isSubmittedRef = useRef(false)

  // Use custom hook for quiz progress with localStorage persistence
  const [progress, setProgress, removeProgress] = useLocalStorage<QuizProgress>(
    getStorageKey(quiz.id),
    {
      currentQuestion: 0,
      answers: {},
      timeLeft: quiz.duration,
      timerStarted: false,
      startedAt: null,
      timePerQuestion: {},
      questionStartTime: null
    }
  )

  // Local state for individual properties (derived from progress)
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(
    progress.currentQuestion
  )
  const [answers, setAnswers] = useState(progress.answers)
  const [timePerQuestion, setTimePerQuestion] = useState(
    progress.timePerQuestion
  )
  const [questionStartTime, setQuestionStartTime] = useState(
    progress.questionStartTime
  )

  // Use custom countdown timer hook
  const {
    timeLeft,
    isRunning: timerStarted,
    start: startTimer,
    setTime: setTimeLeft
  } = useCountdownTimer({
    initialTime: progress.timeLeft,
    onComplete: () => {
      if (!isSubmittedRef.current) {
        handleSubmit()
      }
    },
    autoStart: false
  })

  const [startedAt, setStartedAt] = useState<number | null>(progress.startedAt)

  // Initialize from stored progress
  useEffect(() => {
    if (progress.timerStarted && progress.startedAt) {
      // Calculate elapsed time if timer was running
      const elapsedSeconds = Math.floor(
        (Date.now() - progress.startedAt) / 1000
      )
      const adjustedTimeLeft = Math.max(0, progress.timeLeft - elapsedSeconds)

      setTimeLeft(adjustedTimeLeft)

      // Resume timer if there's time left
      if (adjustedTimeLeft > 0) {
        startTimer()
      }
    }
    setIsLoaded(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync state changes to localStorage
  useEffect(() => {
    if (!isLoaded || isSubmittedRef.current) return

    setProgress({
      currentQuestion,
      answers,
      timeLeft,
      timerStarted,
      startedAt,
      timePerQuestion,
      questionStartTime
    })
  }, [
    currentQuestion,
    answers,
    timeLeft,
    timerStarted,
    startedAt,
    timePerQuestion,
    questionStartTime,
    isLoaded,
    setProgress
  ])

  const clearProgress = useCallback(() => {
    removeProgress()
    isSubmittedRef.current = true
  }, [removeProgress])

  // Track time spent on current question
  const updateQuestionTime = useCallback(() => {
    if (questionStartTime !== null) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000)
      setTimePerQuestion((prev) => ({
        ...prev,
        [currentQuestion]: (prev[currentQuestion] || 0) + timeSpent
      }))
    }
    setQuestionStartTime(Date.now())
  }, [questionStartTime, currentQuestion])

  const handleSubmit = useCallback(() => {
    // Update time for the last question
    if (questionStartTime !== null) {
      const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000)
      const finalTimePerQuestion = {
        ...timePerQuestion,
        [currentQuestion]: (timePerQuestion[currentQuestion] || 0) + timeSpent
      }

      // Calculate score
      let correctCount = 0
      quiz.questions.forEach((q, index) => {
        if (answers[index] === q.correctAnswer) {
          correctCount++
        }
      })

      const totalTimeTaken = startedAt
        ? Math.floor((Date.now() - startedAt) / 1000)
        : 0

      // Save results
      const result: QuizResult = {
        answers,
        timeTaken: totalTimeTaken,
        completedAt: Date.now(),
        score: Math.round((correctCount / quiz.questions.length) * 100),
        correctCount,
        incorrectCount: quiz.questions.length - correctCount,
        timePerQuestion: finalTimePerQuestion
      }

      const resultsKey = getResultsKey(quiz.id)
      localStorage.setItem(resultsKey, JSON.stringify(result))
    }

    clearProgress()

    // Redirect to results page
    router.push(`/quizzes/${quiz.id}/results`)
  }, [
    answers,
    clearProgress,
    currentQuestion,
    questionStartTime,
    quiz.id,
    quiz.questions,
    router,
    startedAt,
    timePerQuestion
  ])

  // Timer is now managed by useCountdownTimer hook

  const handleAnswer = (answer: string) => {
    if (!timerStarted) {
      startTimer()
      setStartedAt(Date.now())
      setQuestionStartTime(Date.now())
    }

    setAnswers({ ...answers, [currentQuestion]: answer })
  }

  const handleNextQuestion = () => {
    if (currentQuestion === quiz.questions.length - 1) return
    updateQuestionTime()
    setCurrentQuestion((prev) => prev + 1)
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion === 0) return
    updateQuestionTime()
    setCurrentQuestion((prev) => prev - 1)
  }

  const handleRestart = () => {
    clearProgress()
    setCurrentQuestion(0)
    setAnswers({})
    setTimeLeft(quiz.duration)
    setStartedAt(null)
    setTimePerQuestion({})
    setQuestionStartTime(null)
    isSubmittedRef.current = false
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }

  // Show loading state while restoring progress
  if (!isLoaded) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-foreground'>Loading quiz...</div>
      </div>
    )
  }

  const currentQ =
    quiz.questions[Math.min(currentQuestion, quiz.questions.length - 1)]
  const isLastQuestion = currentQuestion === quiz.questions.length - 1

  return (
    <div className='min-h-screen bg-background text-foreground p-4'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between gap-3 mb-8'>
          <Button
            size='sm'
            className='text-foreground/70 dark:text-foreground/70 bg-transparent p-0 hover:bg-transparent hover:text-foreground dark:hover:text-foreground   shadow-none'
            asChild
          >
            <Link href='/quizzes'>
              <ArrowLeft className='w-5 h-5 mr-2' />
              Back to Explore
            </Link>
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={handleRestart}
            className='border-gray-300 dark:border-slate-700 text-foreground'
          >
            <RotateCcw className='w-4 h-4 mr-2' />
            Restart Quiz
          </Button>
        </div>

        {/* Title and Tags */}
        <div className='mb-8'>
          <h1 className='text-4xl font-bold mb-4'>{quiz.title}</h1>
          <div className='flex gap-2'>
            {quiz.tags.map((tag) => (
              <Badge
                key={tag}
                className='bg-background text-foreground border border-gray-300 dark:border-slate-700'
              >
                {tag}
              </Badge>
            ))}
            <Badge className='bg-yellow-500 text-foreground font-medium border border-gray-300 dark:border-slate-700'>
              {quiz.difficulty}
            </Badge>
          </div>
        </div>

        {/* Progress and Timer */}
        <div className='flex justify-between items-center mb-8'>
          <div className='text-foreground font-semibold text-sm'>
            Question {currentQuestion + 1} of {quiz.questions.length}
          </div>
          <div className='flex items-center gap-2 bg-background px-3 py-2 rounded-full border border-gray-300 dark:border-slate-700'>
            <Clock className='w-4 h-4 text-foreground' />
            <span className='text-foreground font-mono text-sm font-semibold'>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Progress Bar using shadcn Progress */}
        <div className='mb-8'>
          <Progress
            value={
              quiz.questions.length > 0
                ? ((currentQuestion + 1) / quiz.questions.length) * 100
                : 0
            }
            className='h-2'
          />
        </div>

        {/* Question Card */}
        <Card className='bg-background border border-gray-300 dark:border-slate-700 text-foreground'>
          <CardContent className='p-8'>
            <div className='grid md:grid-cols-2 gap-8 items-center'>
              {/* Image */}
              <div className='order-2 md:order-1'>
                <Image
                  src={currentQ.image || '/placeholder.jpg'}
                  alt={currentQ.question}
                  width={400}
                  height={300}
                  className='rounded-lg object-cover w-full'
                />
              </div>

              {/* Question and Answers */}
              <div className='order-1 md:order-2 space-y-6'>
                <h2 className='text-2xl font-semibold text-foreground leading-tight'>
                  {currentQ.question}
                </h2>

                <div className='space-y-3'>
                  {currentQ.answers.map((answer) => {
                    const isSelected = answers[currentQuestion] === answer.value
                    return (
                      <Button
                        key={answer.label}
                        variant={isSelected ? 'default' : 'outline'}
                        className={`w-full justify-start text-left h-auto p-4 ${
                          isSelected
                            ? 'bg-default dark:bg-white text-white dark:text-black border-primary'
                            : 'border-gray-300 dark:border-slate-700 dark:hover:bg-slate-600 hover:bg-gray-200 text-foreground'
                        }`}
                        onClick={() => handleAnswer(answer.value)}
                      >
                        <span
                          className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium mr-4 shrink-0 ${
                            isSelected
                              ? 'dark:bg-gray-600 bg-gray-200 text-primary'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          {answer.label}
                        </span>
                        <span>{answer.value}</span>
                      </Button>
                    )
                  })}
                  <div className='flex justify-between'>
                    <Button
                      onClick={handlePreviousQuestion}
                      className='text-white'
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={
                        isLastQuestion ? handleSubmit : handleNextQuestion
                      }
                      className='text-white'
                    >
                      {isLastQuestion ? 'Submit' : 'Next'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
