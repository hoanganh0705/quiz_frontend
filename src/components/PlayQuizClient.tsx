'use client'

import { Quiz } from '@/types/quiz'
import { QuizResult, QuizProgress } from '@/types/quizResults'
import { getStorageKey, getResultsKey } from '@/lib/quizResultsUtils'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from './ui/card'
import { ArrowLeft, RotateCcw, Maximize, Minimize } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import {
  useLocalStorage,
  useCountdownTimer,
  useIsMobile,
  useSwipeGesture,
  useFullscreen
} from '@/hooks'
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut'
import { MobileQuizTimer } from './quiz-page/MobileQuizTimer'
import { SwipeIndicator } from './quiz-page/SwipeIndicator'
import { cn } from '@/lib/utils'

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

  // Use localStorage hook for quiz results (replaces direct localStorage.setItem)
  const [, setResults] = useLocalStorage<QuizResult | null>(
    getResultsKey(quiz.id),
    null
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

  // Store initial progress values in refs for initialization effect
  const initialProgressRef = useRef(progress)

  // Use custom countdown timer hook
  const handleSubmitRef = useRef<() => void>(() => {})
  const {
    timeLeft,
    isRunning: timerStarted,
    start: startTimer,
    setTime: setTimeLeft
  } = useCountdownTimer({
    initialTime: progress.timeLeft,
    onComplete: () => {
      if (!isSubmittedRef.current) {
        handleSubmitRef.current()
      }
    },
    autoStart: false
  })

  const [startedAt, setStartedAt] = useState<number | null>(progress.startedAt)

  // Initialize from stored progress (runs once on mount)
  useEffect(() => {
    const prog = initialProgressRef.current
    if (prog.timerStarted && prog.startedAt) {
      // Calculate elapsed time if timer was running
      const elapsedSeconds = Math.floor((Date.now() - prog.startedAt) / 1000)
      const adjustedTimeLeft = Math.max(0, prog.timeLeft - elapsedSeconds)

      setTimeLeft(adjustedTimeLeft)

      // Resume timer if there's time left
      if (adjustedTimeLeft > 0) {
        startTimer()
      }
    }
    setIsLoaded(true)
  }, [setTimeLeft, startTimer])

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

      // Save results using localStorage hook
      const result: QuizResult = {
        answers,
        timeTaken: totalTimeTaken,
        completedAt: Date.now(),
        score: Math.round((correctCount / quiz.questions.length) * 100),
        correctCount,
        incorrectCount: quiz.questions.length - correctCount,
        timePerQuestion: finalTimePerQuestion
      }

      setResults(result)
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
    setResults,
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

  // --- Keyboard shortcuts for quiz navigation ---

  // Arrow keys to select answers (1-4 map to A-D)
  const currentQ =
    quiz.questions[Math.min(currentQuestion, quiz.questions.length - 1)]
  const isLastQuestion = currentQuestion === quiz.questions.length - 1

  // Use refs for keyboard shortcut callbacks to avoid re-registering listeners
  const handleNextRef = useRef(handleNextQuestion)
  const handlePrevRef = useRef(handlePreviousQuestion)
  const handleAnswerRef = useRef(handleAnswer)
  const handleSubmitRef2 = useRef(handleSubmit)
  const currentQRef = useRef(currentQ)
  const answersRef = useRef(answers)
  const currentQuestionRef = useRef(currentQuestion)
  const isLastQuestionRef = useRef(isLastQuestion)

  useEffect(() => {
    handleNextRef.current = handleNextQuestion
    handlePrevRef.current = handlePreviousQuestion
    handleAnswerRef.current = handleAnswer
    handleSubmitRef2.current = handleSubmit
    currentQRef.current = currentQ
    answersRef.current = answers
    currentQuestionRef.current = currentQuestion
    isLastQuestionRef.current = isLastQuestion
  })

  // Keep handleSubmitRef in sync for timer onComplete callback
  handleSubmitRef.current = handleSubmit

  // Navigate to next question with ArrowRight
  useKeyboardShortcut(
    'arrowright',
    useCallback(() => {
      handleNextRef.current()
    }, []),
    { meta: false, preventDefault: true }
  )

  // Navigate to previous question with ArrowLeft
  useKeyboardShortcut(
    'arrowleft',
    useCallback(() => {
      handlePrevRef.current()
    }, []),
    { meta: false, preventDefault: true }
  )

  // Select answers with number keys 1-4
  useKeyboardShortcut(
    '1',
    useCallback(() => {
      if (currentQRef.current.answers[0])
        handleAnswerRef.current(currentQRef.current.answers[0].value)
    }, []),
    { meta: false, preventDefault: true }
  )

  useKeyboardShortcut(
    '2',
    useCallback(() => {
      if (currentQRef.current.answers[1])
        handleAnswerRef.current(currentQRef.current.answers[1].value)
    }, []),
    { meta: false, preventDefault: true }
  )

  useKeyboardShortcut(
    '3',
    useCallback(() => {
      if (currentQRef.current.answers[2])
        handleAnswerRef.current(currentQRef.current.answers[2].value)
    }, []),
    { meta: false, preventDefault: true }
  )

  useKeyboardShortcut(
    '4',
    useCallback(() => {
      if (currentQRef.current.answers[3])
        handleAnswerRef.current(currentQRef.current.answers[3].value)
    }, []),
    { meta: false, preventDefault: true }
  )

  // Submit answer / go to next with Enter
  useKeyboardShortcut(
    'enter',
    useCallback(() => {
      if (answersRef.current[currentQuestionRef.current]) {
        if (isLastQuestionRef.current) {
          handleSubmitRef2.current()
        } else {
          handleNextRef.current()
        }
      }
    }, []),
    { meta: false, preventDefault: true }
  )

  // --- Mobile experience hooks ---
  const isMobile = useIsMobile()
  const quizContainerRef = useRef<HTMLDivElement>(null)
  const { isFullscreen, toggleFullscreen } = useFullscreen()

  // Swipe gestures for mobile quiz navigation
  useSwipeGesture(
    {
      onSwipeLeft: handleNextQuestion,
      onSwipeRight: handlePreviousQuestion
    },
    { threshold: 50, enabled: isMobile === true },
    quizContainerRef
  )

  // formatTime is now imported from @/lib/quizResultsUtils

  // Loading state: use ellipsis per typography guidelines
  if (!isLoaded) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-foreground' role='status' aria-live='polite'>
          Loading quiz\u2026
        </div>
      </div>
    )
  }

  return (
    <main
      ref={quizContainerRef}
      className={cn(
        'min-h-screen bg-background text-foreground p-4',
        isFullscreen && 'p-2 md:p-4'
      )}
    >
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between gap-3 mb-4 md:mb-8'>
          <Button
            size='sm'
            className='text-foreground/70 dark:text-foreground/70 bg-transparent p-0 hover:bg-transparent hover:text-foreground dark:hover:text-foreground shadow-none'
            asChild
          >
            <Link href='/quizzes' aria-label='Back to explore quizzes'>
              <ArrowLeft className='w-5 h-5 mr-2' aria-hidden='true' />
              <span className='hidden sm:inline'>Back to Explore</span>
              <span className='sm:hidden'>Back</span>
            </Link>
          </Button>
          <div className='flex items-center gap-2'>
            {/* Fullscreen toggle */}
            <Button
              size='sm'
              variant='outline'
              onClick={() => toggleFullscreen(quizContainerRef.current)}
              className='border-border text-foreground'
              aria-label={
                isFullscreen ? 'Exit full screen' : 'Enter full screen'
              }
            >
              {isFullscreen ? (
                <Minimize className='w-4 h-4' aria-hidden='true' />
              ) : (
                <Maximize className='w-4 h-4' aria-hidden='true' />
              )}
              <span className='hidden sm:inline ml-2'>
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </span>
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={handleRestart}
              className='border-border text-foreground'
              aria-label='Restart this quiz'
            >
              <RotateCcw className='w-4 h-4 md:mr-2' aria-hidden='true' />
              <span className='hidden md:inline'>Restart Quiz</span>
            </Button>
          </div>
        </div>

        {/* Title and Tags */}
        <div className='mb-4 md:mb-8'>
          <h1 className='text-2xl md:text-4xl font-bold mb-2 md:mb-4'>
            {quiz.title}
          </h1>
          <div className='flex flex-wrap gap-2'>
            {quiz.tags.map((tag) => (
              <Badge
                key={tag}
                className='bg-background text-foreground border border-border text-xs md:text-sm'
              >
                {tag}
              </Badge>
            ))}
            <Badge className='bg-yellow-500 text-foreground font-medium border border-border text-xs md:text-sm'>
              {quiz.difficulty}
            </Badge>
          </div>
        </div>

        {/* Progress and Timer */}
        <div className='flex justify-between items-center mb-4 md:mb-8'>
          <div
            className='text-foreground font-semibold text-xs md:text-sm'
            aria-live='polite'
          >
            Question {currentQuestion + 1} of {quiz.questions.length}
          </div>
          {/* Mobile-optimized timer with circular progress */}
          <MobileQuizTimer timeLeft={timeLeft} totalTime={quiz.duration} />
        </div>

        {/* Progress Bar */}
        <div className='mb-4 md:mb-8'>
          <Progress
            value={
              quiz.questions.length > 0
                ? ((currentQuestion + 1) / quiz.questions.length) * 100
                : 0
            }
            className='h-1.5 md:h-2'
          />
        </div>

        {/* Mobile swipe indicator */}
        <SwipeIndicator
          currentQuestion={currentQuestion}
          totalQuestions={quiz.questions.length}
        />

        {/* Question Card */}
        <Card className='bg-background border border-border text-foreground'>
          <CardContent className='p-4 md:p-8'>
            <div className='grid md:grid-cols-2 gap-4 md:gap-8 items-center'>
              {/* Image */}
              <div className='order-2 md:order-1'>
                <Image
                  src={currentQ.image || '/placeholder.jpg'}
                  alt={`Illustration for: ${currentQ.question}`}
                  width={400}
                  height={300}
                  className='rounded-lg object-cover w-full'
                />
              </div>

              {/* Question and Answers */}
              <div className='order-1 md:order-2 space-y-4 md:space-y-6'>
                <h2 className='text-lg md:text-2xl font-semibold text-foreground leading-tight'>
                  {currentQ.question}
                </h2>

                <div
                  className='space-y-2 md:space-y-3'
                  role='radiogroup'
                  aria-label='Answer options'
                >
                  {currentQ.answers.map((answer) => {
                    const isSelected = answers[currentQuestion] === answer.value
                    return (
                      <Button
                        key={answer.label}
                        variant={isSelected ? 'default' : 'outline'}
                        role='radio'
                        aria-checked={isSelected}
                        className={cn(
                          'w-full justify-start text-left h-auto transition-all duration-150',
                          // Touch-friendly: larger tap targets on mobile
                          'p-3 md:p-4 min-h-12 md:min-h-0',
                          // Active press feedback for touch
                          'active:scale-[0.98] active:brightness-95',
                          isSelected
                            ? 'bg-default dark:bg-white text-white dark:text-black border-primary ring-2 ring-primary/20'
                            : 'border-border dark:hover:bg-slate-600 hover:bg-gray-200 text-foreground'
                        )}
                        onClick={() => handleAnswer(answer.value)}
                      >
                        <span
                          className={cn(
                            'rounded-full flex items-center justify-center font-medium mr-3 md:mr-4 shrink-0',
                            // Larger touch target badge on mobile
                            'w-8 h-8 text-sm',
                            isSelected
                              ? 'dark:bg-gray-600 bg-gray-200 text-primary'
                              : 'bg-muted text-foreground'
                          )}
                        >
                          {answer.label}
                        </span>
                        <span className='text-sm md:text-base'>
                          {answer.value}
                        </span>
                      </Button>
                    )
                  })}
                  <div className='flex justify-between pt-2'>
                    <Button
                      onClick={handlePreviousQuestion}
                      className={cn(
                        'text-white',
                        // Touch-friendly nav buttons
                        'min-h-11 px-4 md:px-6 active:scale-[0.97]'
                      )}
                      disabled={currentQuestion === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={
                        isLastQuestion ? handleSubmit : handleNextQuestion
                      }
                      className={cn(
                        'text-white',
                        // Touch-friendly nav buttons
                        'min-h-11 px-4 md:px-6 active:scale-[0.97]',
                        isLastQuestion &&
                          'bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700'
                      )}
                    >
                      {isLastQuestion ? 'Submit' : 'Next'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile swipe hint - shown once */}
        {isMobile && currentQuestion === 0 && !answers[0] && (
          <p className='text-center text-xs text-muted-foreground mt-3 animate-pulse'>
            Swipe left or right to navigate questions
          </p>
        )}
      </div>
    </main>
  )
}
