import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Bell,
  Bookmark,
  Clock,
  HelpCircle,
  Share2,
  Star,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import type { QuizResponseDto, QuizVersionResponseDto } from '@/lib/api/generated/schemas'
import { difficultyColors } from '@/features/quizzes/constants/difficulty-color'
import QuizOverviewPanel from '@/features/quizzes/components/QuizDetail/QuizOverviewPanel'
import Leaderboard from '@/features/quizzes/components/QuizDetail/Leaderboard'
import Reviews from '@/features/quizzes/components/QuizDetail/Reviews'
import { Card, CardContent } from '@/components/ui/Card'
import { ShareModal } from '@/shared/ui'

interface QuizDetailProps {
  quiz: QuizResponseDto
  version?: QuizVersionResponseDto
}

export default function QuizDetail({ quiz, version }: QuizDetailProps) {
  const difficulty = version?.difficulty ?? 'medium'
  const duration = version?.durationMs ?? 0
  const questionCount = version?.questions?.length ?? 0
  const questions = version?.questions ?? []
  const rating = 0
  const reviewCount = 0
  const currentPlayers = 0
  const maxPlayers = 100
  const spotsLeft = maxPlayers - currentPlayers
  const progressPercentage = maxPlayers > 0 ? (currentPlayers / maxPlayers) * 100 : 0

  const formatDurationMs = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes} min`
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="p-4">
        <Link href="/quizzes">
          <Button
            className="text-white hover:bg-brand bg-transparent"
            aria-label="Back to explore quizzes"
          >
            <ArrowLeft className="w-4 h-4 mr-2" aria-hidden="true" />
            Back to Explore
          </Button>
        </Link>
      </div>

      <div className="relative mx-4 mb-8 rounded-lg h-72 overflow-hidden">
        <Image
          src={quiz.imageUrl ?? '/placeholder.webp'}
          alt={`${quiz.title} quiz cover`}
          width={1200}
          height={800}
          quality={100}
          priority
          className="w-full h-full object-cover"
        />

        <div className="absolute bottom-0 left-0 p-6 text-white">
          <div className="flex gap-2 mb-4">
            <Badge
              className={`${
                difficultyColors[difficulty]?.bg || 'bg-gray-600'
              } ${
                difficultyColors[difficulty]?.hover || 'hover:bg-gray-500'
              } text-white-primary cursor-pointer`}
            >
              {difficulty}
            </Badge>
            {quiz.isFeatured && (
              <Badge className="cursor-pointer bg-purple-500/80 hover:bg-purple-600 text-white-primary">
                Featured
              </Badge>
            )}
          </div>

          <h1 className="text-4xl font-bold mb-4">{quiz.title}</h1>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>{formatDurationMs(duration)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" aria-hidden="true" />
              <span>{currentPlayers} players</span>
            </div>
            <div className="flex items-center gap-1">
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
              <span>{questionCount} questions</span>
            </div>
            <div className="flex items-center gap-1">
              <Star
                className="w-4 h-4 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
              <span>
                {rating} ({reviewCount} reviews)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="gap-8 px-4 grid grid-cols-1 md:grid-cols-3">
        <div className="flex-1 col-span-2">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 dark:bg-[#1e293b80]">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-foreground/70"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="leaderboard"
                className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-foreground/70"
              >
                Leaderboard
              </TabsTrigger>
              <TabsTrigger
                value="reviews"
                className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-foreground/70"
              >
                Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <QuizOverviewPanel
                description={quiz.description ?? ''}
                requirements={quiz.requirements ?? ''}
                duration={duration}
                tags={[]}
                previewQuestions={questions.slice(0, 3)}
                questionCount={questionCount}
              />
            </TabsContent>

            <TabsContent value="leaderboard" className="mt-6 bg-background">
              <Leaderboard />
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <Reviews quizId={quiz.quizId} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="col-span-1">
          <div className="space-y-6 text-foreground border border-border rounded-lg p-4 bg-background">
            <div className="bg-background rounded-lg p-4 pb-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-foreground">Registered Spots</span>
                <span className="font-bold text-foreground text-sm">
                  {currentPlayers}/{maxPlayers}
                </span>
              </div>
              <Progress value={progressPercentage} className="mb-3" />
              <p
                className={`text-sm font-medium ${
                  spotsLeft <= 0.1 * maxPlayers
                    ? 'text-red-400'
                    : 'text-green-400'
                }`}
                aria-live="polite"
              >
                {spotsLeft <= 0.1 * maxPlayers
                  ? `Almost full! Only ${spotsLeft} spots left`
                  : `${spotsLeft} spots left`}
              </p>
            </div>

            <div className="bg-background p-4 rounded-lg mb-3">
              <div className="grid grid-cols-2 gap-4 mb-5 grid-rows-[auto] items-stretch">
                <Card className="bg-background border border-border h-full">
                  <CardContent className="rounded-lg border p-3 h-full">
                    <div className="text-xs text-muted-foreground mb-1">
                      Questions
                    </div>
                    <div className="font-medium">{questionCount}</div>
                  </CardContent>
                </Card>

                <Card className="bg-background border border-border h-full">
                  <CardContent className="rounded-lg border p-3 h-full">
                    <div className="text-xs text-muted-foreground mb-1">
                      Time Limit
                    </div>
                    <div className="font-medium">{formatDurationMs(duration)}</div>
                  </CardContent>
                </Card>

                <Card className="bg-background border border-border h-full">
                  <CardContent className="rounded-lg border p-3 h-full">
                    <div className="text-xs text-muted-foreground mb-1">
                      Difficulty
                    </div>
                    <div className="font-medium capitalize">{difficulty}</div>
                  </CardContent>
                </Card>

                <Card className="bg-background border border-border h-full">
                  <CardContent className="rounded-lg border p-3 h-full">
                    <div className="text-xs text-muted-foreground mb-1">
                      Passing Score
                    </div>
                    <div className="font-medium">{version?.passingScorePercent ?? 70}%</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <Link href={`/quizzes/${quiz.slug}/start`} className="block">
                  <Button
                    className="w-[98%] mx-auto flex justify-center items-center bg-brand hover:bg-brand text-white font-semibold py-4 text-base rounded-xl"
                    size="lg"
                  >
                    Play now
                  </Button>
                </Link>
                <Link href="#preview-questions" className="block">
                  <Button
                    variant="outline"
                    className="w-[98%] mx-auto flex justify-center items-center text-foreground font-semibold py-4 text-base rounded-xl border-border"
                    size="lg"
                  >
                    Preview questions
                  </Button>
                </Link>
              </div>

              <div className="flex justify-center gap-6 pt-2 mt-3">
                <Button
                  size="icon"
                  className="text-foreground rounded-xl border border-border bg-transparent"
                  aria-label="Bookmark this quiz"
                >
                  <Bookmark className="h-6 w-6" />
                </Button>

                <ShareModal
                  title={quiz.title}
                  description={quiz.description ?? ''}
                  url={`/quizzes/${quiz.slug}`}
                >
                  <Button
                    size="icon"
                    className="text-foreground rounded-xl border border-border bg-transparent"
                    aria-label="Share this quiz"
                  >
                    <Share2 className="h-6 w-6" />
                  </Button>
                </ShareModal>

                <Button
                  size="icon"
                  className="text-foreground rounded-xl border border-border bg-transparent"
                  aria-label="Get notifications for this quiz"
                >
                  <Bell className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
