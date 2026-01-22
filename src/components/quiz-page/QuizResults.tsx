'use client'

import { Quiz } from '@/types/quiz'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Trophy,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Share2,
  ChevronDown,
  ChevronUp,
  Zap,
  Medal,
  BarChart3,
  Users,
  Twitter,
  Facebook,
  Linkedin,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'react-toastify'

// Storage key generator - same as PlayQuizClient
const getStorageKey = (quizId: string) => `quiz_progress_${quizId}`
const getResultsKey = (quizId: string) => `quiz_results_${quizId}`

interface QuizResult {
  answers: Record<number, string>
  timeTaken: number
  completedAt: number
  score: number
  correctCount: number
  incorrectCount: number
  timePerQuestion: Record<number, number>
}

interface QuestionReview {
  questionIndex: number
  question: string
  image: string
  userAnswer: string | null
  correctAnswer: string
  isCorrect: boolean
  timeTaken: number
  answers: { label: string; value: string }[]
}

export default function QuizResults({ quiz }: { quiz: Quiz }) {
  const [result, setResult] = useState<QuizResult | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<number>>(
    new Set()
  )
  const [copied, setCopied] = useState(false)

  // Load results from localStorage
  useEffect(() => {
    const resultsKey = getResultsKey(quiz.id)
    const savedResults = localStorage.getItem(resultsKey)

    if (savedResults) {
      try {
        const parsedResults: QuizResult = JSON.parse(savedResults)
        setResult(parsedResults)
      } catch {
        // Generate mock results for demo if no real results
        generateMockResults()
      }
    } else {
      // Generate mock results for demo
      generateMockResults()
    }

    setIsLoaded(true)
  }, [quiz.id])

  const generateMockResults = () => {
    // Mock results for demonstration
    const mockAnswers: Record<number, string> = {}
    const mockTimePerQuestion: Record<number, number> = {}
    let correctCount = 0

    quiz.questions.forEach((q, index) => {
      // Randomly answer some questions correctly
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
  }

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

  const toggleQuestion = (index: number) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedQuestions(newExpanded)
  }

  const expandAll = () => {
    setExpandedQuestions(new Set(quiz.questions.map((_, i) => i)))
  }

  const collapseAll = () => {
    setExpandedQuestions(new Set())
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  const getScoreMessage = (score: number) => {
    if (score === 100) return '🎉 Perfect Score! Outstanding!'
    if (score >= 80) return '🌟 Excellent work! You nailed it!'
    if (score >= 60) return '👍 Good job! Keep practicing!'
    if (score >= 40) return '💪 Not bad! Room for improvement.'
    return '📚 Keep studying! You can do better!'
  }

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B'
    if (score >= 60) return 'C'
    if (score >= 50) return 'D'
    return 'F'
  }

  const handlePlayAgain = () => {
    // Clear previous progress
    localStorage.removeItem(getStorageKey(quiz.id))
    localStorage.removeItem(getResultsKey(quiz.id))
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/quizzes/${quiz.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: string) => {
    const url = `${window.location.origin}/quizzes/${quiz.id}`
    const text = `I scored ${result?.score}% on "${quiz.title}"! Can you beat my score?`

    const shareUrls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    }

    window.open(shareUrls[platform], '_blank', 'width=600,height=400')
  }

  // Calculate average time per question
  const avgTimePerQuestion = useMemo(() => {
    if (!result) return 0
    const times = Object.values(result.timePerQuestion)
    return times.length > 0
      ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      : 0
  }, [result])

  // Calculate percentile (mock data)
  const percentile = useMemo(() => {
    if (!result) return 0
    // Mock percentile calculation
    return Math.min(99, Math.max(1, Math.round(result.score * 0.95 + 5)))
  }, [result])

  if (!isLoaded) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <div className='text-foreground'>Loading results...</div>
      </div>
    )
  }

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
        <Card className='bg-linear-to-br from-default/20 to-default/5 border-default/30 mb-8 overflow-hidden'>
          <CardContent className='p-8'>
            <div className='flex flex-col lg:flex-row items-center gap-8'>
              {/* Score Circle */}
              <div className='relative'>
                <div className='w-48 h-48 rounded-full bg-background border-8 border-default/30 flex items-center justify-center'>
                  <div className='text-center'>
                    <span
                      className={`text-6xl font-bold ${getScoreColor(result.score)}`}
                    >
                      {result.score}%
                    </span>
                    <div className='text-2xl font-semibold text-foreground/70'>
                      Grade: {getScoreGrade(result.score)}
                    </div>
                  </div>
                </div>
                <div className='absolute -top-2 -right-2'>
                  <div className='bg-default text-white rounded-full p-3'>
                    <Trophy className='w-6 h-6' />
                  </div>
                </div>
              </div>

              {/* Score Info */}
              <div className='flex-1 text-center lg:text-left'>
                <h1 className='text-3xl md:text-4xl font-bold mb-2'>
                  {quiz.title}
                </h1>
                <p className='text-xl text-foreground/70 mb-4'>
                  {getScoreMessage(result.score)}
                </p>

                <div className='flex flex-wrap gap-2 justify-center lg:justify-start mb-6'>
                  <Badge
                    variant='outline'
                    className='px-3 py-1 text-sm border-default/50'
                  >
                    <Target className='w-4 h-4 mr-1' />
                    {result.correctCount}/{quiz.questions.length} Correct
                  </Badge>
                  <Badge
                    variant='outline'
                    className='px-3 py-1 text-sm border-default/50'
                  >
                    <Clock className='w-4 h-4 mr-1' />
                    {formatTime(result.timeTaken)} Total Time
                  </Badge>
                  <Badge
                    variant='outline'
                    className='px-3 py-1 text-sm border-default/50'
                  >
                    <Users className='w-4 h-4 mr-1' />
                    Top {100 - percentile}%
                  </Badge>
                </div>

                {/* Action Buttons */}
                <div className='flex flex-wrap gap-3 justify-center lg:justify-start'>
                  <Button asChild onClick={handlePlayAgain}>
                    <Link href={`/quizzes/${quiz.id}/start`}>
                      <RotateCcw className='w-4 h-4 mr-2' />
                      Play Again
                    </Link>
                  </Button>
                  <Button variant='outline' asChild>
                    <Link href={`/quizzes`}>
                      <Zap className='w-4 h-4 mr-2' />
                      Try Similar Quiz
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'>
          <Card className='bg-green-500/10 border-green-500/30'>
            <CardContent className='p-4 text-center'>
              <CheckCircle2 className='w-8 h-8 text-green-500 mx-auto mb-2' />
              <div className='text-2xl font-bold text-green-500'>
                {result.correctCount}
              </div>
              <div className='text-sm text-foreground/70'>Correct</div>
            </CardContent>
          </Card>
          <Card className='bg-red-500/10 border-red-500/30'>
            <CardContent className='p-4 text-center'>
              <XCircle className='w-8 h-8 text-red-500 mx-auto mb-2' />
              <div className='text-2xl font-bold text-red-500'>
                {result.incorrectCount}
              </div>
              <div className='text-sm text-foreground/70'>Incorrect</div>
            </CardContent>
          </Card>
          <Card className='bg-blue-500/10 border-blue-500/30'>
            <CardContent className='p-4 text-center'>
              <Clock className='w-8 h-8 text-blue-500 mx-auto mb-2' />
              <div className='text-2xl font-bold text-blue-500'>
                {avgTimePerQuestion}s
              </div>
              <div className='text-sm text-foreground/70'>
                Avg. per Question
              </div>
            </CardContent>
          </Card>
          <Card className='bg-purple-500/10 border-purple-500/30'>
            <CardContent className='p-4 text-center'>
              <Medal className='w-8 h-8 text-purple-500 mx-auto mb-2' />
              <div className='text-2xl font-bold text-purple-500'>
                #{Math.floor(Math.random() * 50) + 1}
              </div>
              <div className='text-sm text-foreground/70'>Your Rank</div>
            </CardContent>
          </Card>
        </div>

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

          {/* Answer Review Tab */}
          <TabsContent value='review'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between'>
                <CardTitle>Question by Question Review</CardTitle>
                <div className='flex gap-2'>
                  <Button variant='outline' size='sm' onClick={expandAll}>
                    Expand All
                  </Button>
                  <Button variant='outline' size='sm' onClick={collapseAll}>
                    Collapse All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='space-y-4'>
                {questionReviews.map((review, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg overflow-hidden ${
                      review.isCorrect
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    {/* Question Header */}
                    <button
                      className='w-full p-4 flex items-center justify-between hover:bg-foreground/5 transition-colors'
                      onClick={() => toggleQuestion(index)}
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
                          <div className='font-medium'>
                            Question {index + 1}
                          </div>
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
                        {expandedQuestions.has(index) ? (
                          <ChevronUp className='w-5 h-5' />
                        ) : (
                          <ChevronDown className='w-5 h-5' />
                        )}
                      </div>
                    </button>

                    {/* Question Details */}
                    {expandedQuestions.has(index) && (
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
                            <h4 className='font-semibold mb-3'>
                              {review.question}
                            </h4>
                            {review.answers.map((answer) => {
                              const isUserAnswer =
                                review.userAnswer === answer.value
                              const isCorrectAnswer =
                                review.correctAnswer === answer.value

                              let answerStyle =
                                'border-foreground/20 bg-background'
                              if (isCorrectAnswer) {
                                answerStyle =
                                  'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400'
                              } else if (isUserAnswer && !review.isCorrect) {
                                answerStyle =
                                  'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400'
                              }

                              return (
                                <div
                                  key={answer.label}
                                  className={`p-3 rounded-lg border flex items-center gap-3 ${answerStyle}`}
                                >
                                  <span className='w-8 h-8 rounded-full border flex items-center justify-center text-sm font-medium'>
                                    {answer.label}
                                  </span>
                                  <span className='flex-1'>{answer.value}</span>
                                  {isCorrectAnswer && (
                                    <CheckCircle2 className='w-5 h-5 text-green-500' />
                                  )}
                                  {isUserAnswer && !review.isCorrect && (
                                    <XCircle className='w-5 h-5 text-red-500' />
                                  )}
                                </div>
                              )
                            })}
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
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value='leaderboard'>
            <Card>
              <CardHeader>
                <CardTitle>Quiz Leaderboard</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {quiz.leaderBoard.slice(0, 10).map((player, index) => (
                    <div
                      key={player.userId}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        index < 3
                          ? 'bg-linear-to-r from-default/10 to-transparent'
                          : 'bg-foreground/5'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0
                            ? 'bg-yellow-500 text-yellow-900'
                            : index === 1
                              ? 'bg-gray-300 text-gray-700'
                              : index === 2
                                ? 'bg-amber-600 text-amber-100'
                                : 'bg-foreground/10 text-foreground'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <Avatar>
                        <AvatarImage
                          src={player.avatar || '/avatarPlaceholder.webp'}
                        />
                        <AvatarFallback>
                          {player.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className='flex-1'>
                        <div className='font-medium'>{player.username}</div>
                        <div className='text-sm text-foreground/70'>
                          Completed {player.completedAt}
                        </div>
                      </div>
                      <div className='text-right'>
                        <div className='font-bold text-default'>
                          {player.score}
                        </div>
                        <div className='text-sm text-foreground/70'>
                          {player.time}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Your Position */}
                <div className='mt-6 p-4 bg-default/10 rounded-lg border border-default/30'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-4'>
                      <div className='w-8 h-8 rounded-full bg-default flex items-center justify-center font-bold text-white'>
                        #{Math.floor(Math.random() * 50) + 1}
                      </div>
                      <div>
                        <div className='font-medium'>Your Position</div>
                        <div className='text-sm text-foreground/70'>
                          Completed just now
                        </div>
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='font-bold text-default'>
                        {result.score}%
                      </div>
                      <div className='text-sm text-foreground/70'>
                        {formatTime(result.timeTaken)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Share Tab */}
          <TabsContent value='share'>
            <Card>
              <CardHeader>
                <CardTitle>Share Your Results</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Share Preview */}
                <div className='bg-linear-to-br from-default to-default/80 rounded-xl p-6 text-white mb-6'>
                  <div className='text-center'>
                    <Trophy className='w-12 h-12 mx-auto mb-3' />
                    <h3 className='text-2xl font-bold mb-2'>
                      I scored {result.score}%!
                    </h3>
                    <p className='text-white/80 mb-4'>
                      on &quot;{quiz.title}&quot;
                    </p>
                    <div className='flex justify-center gap-4 text-sm'>
                      <span>
                        ✅ {result.correctCount}/{quiz.questions.length} Correct
                      </span>
                      <span>⏱️ {formatTime(result.timeTaken)}</span>
                    </div>
                  </div>
                </div>

                {/* Share Buttons */}
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <Button
                    variant='outline'
                    className='flex items-center gap-2'
                    onClick={() => handleShare('twitter')}
                  >
                    <Twitter className='w-5 h-5 text-[#1DA1F2]' />
                    Twitter
                  </Button>
                  <Button
                    variant='outline'
                    className='flex items-center gap-2'
                    onClick={() => handleShare('facebook')}
                  >
                    <Facebook className='w-5 h-5 text-[#4267B2]' />
                    Facebook
                  </Button>
                  <Button
                    variant='outline'
                    className='flex items-center gap-2'
                    onClick={() => handleShare('linkedin')}
                  >
                    <Linkedin className='w-5 h-5 text-[#0077B5]' />
                    LinkedIn
                  </Button>
                  <Button
                    variant='outline'
                    className='flex items-center gap-2'
                    onClick={handleCopyLink}
                  >
                    {copied ? (
                      <Check className='w-5 h-5 text-green-500' />
                    ) : (
                      <Copy className='w-5 h-5' />
                    )}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </Button>
                </div>

                {/* Challenge Friends */}
                <div className='mt-6 p-4 bg-foreground/5 rounded-lg'>
                  <h4 className='font-semibold mb-2'>
                    Challenge Your Friends!
                  </h4>
                  <p className='text-sm text-foreground/70 mb-4'>
                    Share the quiz link and see who can beat your score.
                  </p>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/quizzes/${quiz.id}`}
                      className='flex-1 px-3 py-2 rounded-lg bg-background border border-foreground/20 text-sm'
                    />
                    <Button onClick={handleCopyLink}>
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Time Analysis */}
        <Card className='mb-8'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Clock className='w-5 h-5' />
              Time Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {questionReviews.map((review, index) => (
                <div key={index} className='flex items-center gap-4'>
                  <span className='w-8 text-sm text-foreground/70'>
                    Q{index + 1}
                  </span>
                  <div className='flex-1'>
                    <Progress
                      value={(review.timeTaken / 60) * 100}
                      className={`h-3 ${review.isCorrect ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`}
                    />
                  </div>
                  <span className='w-12 text-sm text-right'>
                    {review.timeTaken}s
                  </span>
                  {review.isCorrect ? (
                    <CheckCircle2 className='w-5 h-5 text-green-500' />
                  ) : (
                    <XCircle className='w-5 h-5 text-red-500' />
                  )}
                </div>
              ))}
            </div>
            <div className='mt-6 pt-4 border-t border-foreground/10 flex justify-between text-sm'>
              <span className='text-foreground/70'>
                Average time per question:
              </span>
              <span className='font-medium'>{avgTimePerQuestion} seconds</span>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Actions */}
        <div className='flex flex-col sm:flex-row gap-4 justify-center'>
          <Button size='lg' asChild onClick={handlePlayAgain}>
            <Link href={`/quizzes/${quiz.id}/start`}>
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
      </div>
    </div>
  )
}
