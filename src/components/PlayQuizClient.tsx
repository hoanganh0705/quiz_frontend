'use client'

import { Quiz } from '@/types/quiz'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from './ui/card'
import { ArrowLeft, Clock } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { toast } from 'react-toastify'
import { Progress } from './ui/progress'

export default function PlayQuizClient({ quiz }: { quiz: Quiz }) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [timeLeft, setTimeLeft] = useState(quiz.duration)
  const [timerStarted, setTimerStarted] = useState(false)

  const handleSubmit = useCallback(() => {
    toast.success(`Quiz submitted! Your answers: ${JSON.stringify(answers)}`)
  }, [answers])

  // Timer effect
  useEffect(() => {
    if (timerStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    } else if (timeLeft <= 0) {
      // Handle time out
      handleSubmit()
    }
  }, [timerStarted, timeLeft, handleSubmit])

  const handleAnswer = (answer: string) => {
    if (!timerStarted) {
      setTimerStarted(true)
    }

    setAnswers({ ...answers, [currentQuestion]: answer })
  }

  const handleNextQuestion = () => {
    if (currentQuestion === quiz.questions.length - 1) return
    setCurrentQuestion((prev) => prev + 1)
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion === 0) return
    setCurrentQuestion((prev) => prev - 1)
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

  const currentQ =
    quiz.questions[Math.min(currentQuestion, quiz.questions.length - 1)]
  const isLastQuestion = currentQuestion === quiz.questions.length - 1

  return (
    <div className='min-h-screen bg-background text-foreground p-4'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='flex items-center gap-3 mb-8'>
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
            <span className='text-foreground font-mono text-sm'>
              {timerStarted ? formatTime(timeLeft) : formatTime(quiz.duration)}
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
                  {currentQ.answers.map((answer) => (
                    <Button
                      key={answer.label}
                      variant={
                        answers[currentQuestion] === answer.value
                          ? 'default'
                          : 'outline'
                      }
                      className='w-full justify-start text-left h-auto p-4 bg-background border border-gray-300 dark:border-slate-700 dark:hover:bg-slate-600 hover:bg-gray-200 text-foreground'
                      onClick={() => handleAnswer(answer.value)}
                    >
                      <span className='bg-background text-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium mr-4 shrink-0'>
                        {answer.label}
                      </span>
                      <span>{answer.value}</span>
                    </Button>
                  ))}
                  <div className='flex justify-between'>
                    <Button onClick={handlePreviousQuestion}>Previous</Button>
                    <Button
                      onClick={
                        isLastQuestion ? handleSubmit : handleNextQuestion
                      }
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
