'use client'

import { Quiz } from '@/types/quiz'
import Link from 'next/link'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Trophy, Share2, BarChart3 } from 'lucide-react'

import {
  ScoreHero,
  StatsOverview,
  AnswerReviewTab,
  LeaderboardTab,
  ShareResultsTab,
  TimeAnalysis,
  BottomActions,
  QuizResult,
  QuestionReview,
  getStorageKey,
  getResultsKey,
  formatTime,
  calculatePercentile,
  calculateAvgTime
} from '@/components/quiz-results'

export default function QuizResults({ quiz }: { quiz: Quiz }) {
  const [result, setResult] = useState<QuizResult | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set()
  )
  const [copied, setCopied] = useState(false)

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

    setResult(mockResult)
  }, [quiz.questions])

  // Load results from localStorage
  useEffect(() => {
    const resultsKey = getResultsKey(quiz.id)
    const savedResults = localStorage.getItem(resultsKey)

    if (savedResults) {
      try {
        const parsedResults: QuizResult = JSON.parse(savedResults)
        setResult(parsedResults)
      } catch {
        generateMockResults()
      }
    } else {
      generateMockResults()
    }

    setIsLoaded(true)
  }, [quiz.id, generateMockResults])

  // Computed values
  const questionReviews: QuestionReview[] = useMemo(() => {
    if (!result) return []

    return quiz.questions.map((q, index) => ({
      questionIndex: index,
      question: q.question,
      image: q.image,
      userAnswer: result.answers[index] || null,
      correctAnswer: q.correctAnswer,
      isCorrect: result.answers[index] === q.correctAnswer,
      timeTaken: result.timePerQuestion[index] || 0,
      answers: q.answers
    }))
  }, [quiz.questions, result])

  const avgTimePerQuestion = useMemo(() => {
    if (!result) return 0
    return calculateAvgTime(result.timePerQuestion)
  }, [result])

  const percentile = useMemo(() => {
    if (!result) return 0
    return calculatePercentile(result.score)
  }, [result])

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
    localStorage.removeItem(getStorageKey(quiz.id))
    localStorage.removeItem(getResultsKey(quiz.id))
  }, [quiz.id])

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/quizzes/${quiz.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [quiz.id])

  const handleShare = useCallback(
    (platform: string) => {
      const url = `${window.location.origin}/quizzes/${quiz.id}`
      const text = `I scored ${result?.score}% on "${quiz.title}"! Can you beat my score?`

      const shareUrls: Record<string, string> = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
      }

      window.open(shareUrls[platform], '_blank', 'width=600,height=400')
    },
    [quiz.id, quiz.title, result?.score]
  )

  // Loading state
  if (!isLoaded) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-foreground'>Loading results...</div>
      </div>
    )
  }

  // No results state
  if (!result) {
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
    <div className='min-h-screen bg-background text-foreground p-4 md:p-8'>
      <div className='max-w-6xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between gap-3 mb-8'>
          <Button
            size='sm'
            className='text-foreground/70 bg-transparent p-0 hover:bg-transparent hover:text-foreground shadow-none'
            asChild
          >
            <Link href='/quizzes'>
              <ArrowLeft className='w-5 h-5 mr-2' />
              Back to Quizzes
            </Link>
          </Button>
        </div>

        {/* Score Hero Section */}
        <ScoreHero
          quiz={quiz}
          result={result}
          percentile={percentile}
          onPlayAgain={handlePlayAgain}
        />

        {/* Stats Overview */}
        <StatsOverview
          result={result}
          avgTimePerQuestion={avgTimePerQuestion}
        />

        {/* Tabs Section */}
        <Tabs defaultValue='review' className='mb-8'>
          <TabsList className='grid w-full grid-cols-3 mb-6'>
            <TabsTrigger value='review'>
              <BarChart3 className='w-4 h-4 mr-2' />
              Answer Review
            </TabsTrigger>
            <TabsTrigger value='leaderboard'>
              <Trophy className='w-4 h-4 mr-2' />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value='share'>
              <Share2 className='w-4 h-4 mr-2' />
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
            />
          </TabsContent>

          <TabsContent value='leaderboard'>
            <LeaderboardTab
              quiz={quiz}
              result={result}
              formatTime={formatTime}
            />
          </TabsContent>

          <TabsContent value='share'>
            <ShareResultsTab
              quiz={quiz}
              result={result}
              copied={copied}
              onCopyLink={handleCopyLink}
              onShare={handleShare}
              formatTime={formatTime}
            />
          </TabsContent>
        </Tabs>

        {/* Time Analysis */}
        <TimeAnalysis
          questionReviews={questionReviews}
          avgTimePerQuestion={avgTimePerQuestion}
        />

        {/* Bottom Actions */}
        <BottomActions quizId={quiz.id} onPlayAgain={handlePlayAgain} />
      </div>
    </div>
  )
}
