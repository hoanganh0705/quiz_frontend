'use client'

import { Quiz } from '@/features/quizzes/types'
import Link from 'next/link'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { ArrowLeft, Trophy, Share2, BarChart3 } from 'lucide-react'
import { useQuizResults } from '@/features/quizzes/hooks'
import { useClipboard, useLocalStorage } from '@/shared/hooks'
import { useAuthState } from '@/features/auth/hooks'
import { AuthNudgeDialog } from '@/features/auth/components/AuthNudgeDialog'

import {
  ScoreHero,
  StatsOverview,
  AnswerReviewTab,
  LeaderboardTab,
  ShareResultsTab,
  BottomActions
} from '@/features/quizzes/components/QuizResults'
import type { QuizResult, QuestionReview } from '@/features/quizzes/types'
import { getStorageKey, calculatePercentile, calculateAvgTime } from '@/features/quizzes/lib/quiz-results-utils'

export default function QuizResults({ quiz }: { quiz: Quiz }) {
  // Use specialized hook for quiz results with localStorage persistence
  const { results, setResults, clearResults } = useQuizResults<QuizResult>(
    quiz.id,
    null
  )
  const { isAuthenticated } = useAuthState()
  const [dismissedNudges, setDismissedNudges] = useLocalStorage<string[]>(
    'auth_nudge_dismissed_v1',
    []
  )
  const [authNudgeOpen, setAuthNudgeOpen] = useState(false)
  const authNudgeKey = `results-${quiz.id}`
  const hasDismissedNudge = dismissedNudges.includes(authNudgeKey)

  // Use custom hook for clipboard with copy state
  const { copied, copy } = useClipboard()

  const [isLoaded, setIsLoaded] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set()
  )

  // Generate mock results for demo
  const generateMockResults = useCallback(() => {
    const mockAnswers: Record<number, string> = {}
    const mockTimePerQuestion: Record<number, number> = {}
    let correctCount = 0

    quiz.questions.forEach((q, index) => {
      const isCorrect = Math.random() > 0.3
      mockAnswers[index] = isCorrect
        ? q.correctAnswer
        : q.answers[Math.floor(Math.random() * q.answers.length)].value
      mockTimePerQuestion[index] = Math.floor(Math.random() * 30) + 5
      if (mockAnswers[index] === q.correctAnswer) correctCount++
    })

    const mockResult: QuizResult = {
      answers: mockAnswers,
      timeTaken: Object.values(mockTimePerQuestion).reduce((a, b) => a + b, 0),
      completedAt: Date.now(),
      score: Math.round((correctCount / quiz.questions.length) * 100),
      correctCount,
      incorrectCount: quiz.questions.length - correctCount,
      timePerQuestion: mockTimePerQuestion
    }

    setResults(mockResult)
  }, [quiz.questions, setResults])

  // Load results - useQuizResults automatically handles persistence
  useEffect(() => {
    if (!results) {
      generateMockResults()
    }
    setIsLoaded(true)
  }, [results, generateMockResults])

  // Computed values
  const questionReviews: QuestionReview[] = useMemo(() => {
    if (!results) return []

    return quiz.questions.map((q, index) => ({
      questionIndex: index,
      question: q.question,
      image: q.image,
      userAnswer: results.answers[index] || null,
      correctAnswer: q.correctAnswer,
      isCorrect: results.answers[index] === q.correctAnswer,
      timeTaken: results.timePerQuestion[index] || 0,
      answers: q.answers
    }))
  }, [quiz.questions, results])

  const avgTimePerQuestion = useMemo(() => {
    if (!results) return 0
    return calculateAvgTime(results.timePerQuestion)
  }, [results])

  const percentile = useMemo(() => {
    if (!results) return 0
    return calculatePercentile(results.score)
  }, [results])

  // Event handlers
  const toggleQuestion = useCallback((index: number) => {
    setExpandedQuestions((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(index)) {
        newExpanded.delete(index)
      } else {
        newExpanded.add(index)
      }
      return newExpanded
    })
  }, [])

  const expandAll = useCallback(() => {
    setExpandedQuestions(new Set(quiz.questions.map((_, i) => i)))
  }, [quiz.questions])

  const collapseAll = useCallback(() => {
    setExpandedQuestions(new Set())
  }, [])

  const handlePlayAgain = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getStorageKey(quiz.id))
    }
    clearResults()
  }, [quiz.id, clearResults])

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/quizzes/${quiz.id}`
    copy(url)
  }, [quiz.id, copy])

  const handleShare = useCallback(
    (platform: string) => {
      const url = `${window.location.origin}/quizzes/${quiz.id}`
      const text = `I scored ${results?.score}% on "${quiz.title}"! Can you beat my score?`

      const shareUrls: Record<string, string> = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
      }

      window.open(shareUrls[platform], '_blank', 'width=600,height=400')
    },
    [quiz.id, quiz.title, results?.score]
  )

  // Loading state
  if (!isLoaded) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-foreground' role='status' aria-live='polite'>
          Loading results\u2026
        </div>
      </div>
    )
  }

  // No results state
  if (!results) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-foreground mb-4'>
            No Results Found
          </h1>
          <p className='text-foreground/70 mb-6'>
            You haven&apos;t completed this quiz yet.
          </p>
          <Button asChild>
            <Link href={`/quizzes/${quiz.id}/start`}>Take Quiz</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <main className='min-h-screen bg-background text-foreground p-4 md:p-8'>
      <div className='max-w-6xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between gap-3 mb-8'>
          <Button
            size='sm'
            className='text-foreground/70 bg-transparent p-0 hover:bg-transparent hover:text-foreground shadow-none'
            asChild
          >
            <Link href='/quizzes' aria-label='Back to quizzes list'>
              <ArrowLeft className='w-5 h-5 mr-2' aria-hidden='true' />
              Back to Quizzes
            </Link>
          </Button>
        </div>

        {/* Score Hero Section */}
        <ScoreHero
          quiz={quiz}
          result={results}
          percentile={percentile}
          onPlayAgain={handlePlayAgain}
        />

        {!isAuthenticated && !hasDismissedNudge && (
          <div className='mt-6 rounded-lg border border-border bg-muted/40 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <div className='text-sm font-semibold'>Save your results</div>
              <div className='text-xs text-muted-foreground'>
                Keep your score history, streaks, and leaderboard rank.
              </div>
            </div>
            <div className='flex flex-col sm:flex-row gap-2'>
              <Button size='sm' onClick={() => setAuthNudgeOpen(true)}>
                Save results
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setDismissedNudges((prev) =>
                    prev.includes(authNudgeKey)
                      ? prev
                      : [...prev, authNudgeKey]
                  )
                }}
              >
                Continue without saving
              </Button>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <StatsOverview
          result={results}
          avgTimePerQuestion={avgTimePerQuestion}
        />

        {/* Tabs Section */}
        <Tabs defaultValue='review' className='mb-8'>
          <TabsList className='grid w-full grid-cols-3 mb-6'>
            <TabsTrigger
              value='review'
              className=' text-sm font-semibold dark:data-[state=active]:bg-default dark:dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
            >
              <BarChart3 className='w-4 h-4 mr-2' aria-hidden='true' />
              Answer Review
            </TabsTrigger>
            <TabsTrigger
              value='leaderboard'
              className=' text-sm font-semibold dark:data-[state=active]:bg-default dark:dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
            >
              <Trophy className='w-4 h-4 mr-2' aria-hidden='true' />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger
              value='share'
              className=' text-sm font-semibold dark:data-[state=active]:bg-default dark:dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
            >
              <Share2 className='w-4 h-4 mr-2' aria-hidden='true' />
              Share Results
            </TabsTrigger>
          </TabsList>

          <TabsContent value='review'>
            <AnswerReviewTab
              questionReviews={questionReviews}
              expandedQuestions={expandedQuestions}
              onToggleQuestion={toggleQuestion}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              avgTimePerQuestion={avgTimePerQuestion}
            />
          </TabsContent>

          <TabsContent value='leaderboard'>
            <LeaderboardTab quiz={quiz} result={results} />
          </TabsContent>

          <TabsContent value='share'>
            <ShareResultsTab
              quiz={quiz}
              result={results}
              copied={copied}
              onCopyLink={handleCopyLink}
              onShare={handleShare}
            />
          </TabsContent>
        </Tabs>

        {/* Bottom Actions */}
        <BottomActions quizId={quiz.id} onPlayAgain={handlePlayAgain} />
      </div>

      <AuthNudgeDialog
        open={authNudgeOpen}
        onOpenChange={setAuthNudgeOpen}
        title='Save this score to your profile?'
        description='Create a free account to keep your results and unlock leaderboards.'
        primaryLabel='Save and sign in'
        primaryHref='/login'
        secondaryLabel='Continue as guest'
        onSecondary={() => {
          setDismissedNudges((prev) =>
            prev.includes(authNudgeKey) ? prev : [...prev, authNudgeKey]
          )
        }}
      />
    </main>
  )
}
