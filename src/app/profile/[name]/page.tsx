'use client'

import { useState, memo, useMemo, useCallback } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ActivityItem from '@/components/profile/ActivityItem'
import CategoryRow from '@/components/profile/CategoryRow'
import { players } from '@/constants/players'
import { challengeData } from '@/constants/challengeHistoryData'
// Bundle optimization: Using barrel imports with Next.js optimizePackageImports
// Next.js automatically transforms these to direct imports (bundle-barrel-imports)
import {
  CheckCircle2,
  Trophy,
  Zap,
  MessageCircle,
  Users,
  MapPin,
  Calendar,
  BadgeCheck,
  Star,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

// Rendering optimization: Hoist static JSX elements (rendering-hoist-jsx)
const achievementIcon = (
  <CheckCircle2 className='w-6 h-6 text-green-500' aria-hidden='true' />
)
const winIcon = <Trophy className='w-6 h-6 text-amber-500' aria-hidden='true' />
const participationIcon = (
  <Zap className='w-6 h-6 text-default' aria-hidden='true' />
)

const getActivityIcon = (type: string | undefined) => {
  switch (type) {
    case 'achievement':
      return achievementIcon
    case 'win':
      return winIcon
    case 'participation':
      return participationIcon
    default:
      return participationIcon
  }
}

// Re-render optimization: Extract to memoized components (rerender-memo)
const ProfileHeader = memo(function ProfileHeader({
  player
}: {
  player: (typeof players)[0]
}) {
  return (
    <header
      className='border-b border-border bg-main rounded-2xl mt-10'
      aria-label='User profile header'
    >
      <div className='max-w-7xl mx-auto px-2 py-4'>
        <div className='flex flex-col md:flex-row items-start justify-between gap-6 px-8'>
          <div className='flex flex-col sm:flex-row items-start gap-6 flex-1'>
            <Avatar className='h-22 w-22 border-4 border-default self-center'>
              <AvatarImage
                src={player.avatarUrl}
                alt={`${player.name}'s profile picture`}
              />
              <AvatarFallback className='text-2xl'>
                {player.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>

            <div className='flex-1 pt-2'>
              <div className='flex flex-wrap items-center gap-3 mb-2'>
                <h1 className='text-2xl font-bold text-foreground'>
                  {player.name}
                </h1>
                <Badge className='bg-default/20 text-default border-default/30 gap-1'>
                  <BadgeCheck className='w-3 h-3' aria-hidden='true' />
                  Verified
                </Badge>
                <Badge
                  variant='outline'
                  className='border-amber-500/30 bg-amber-500/10 text-amber-500 gap-1'
                  aria-label={`Level ${player.level}`}
                >
                  <Star className='w-3 h-3 fill-current' aria-hidden='true' />
                  Level {player.level}
                </Badge>
              </div>

              <div className='flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-3'>
                <span>@{player.name.toLowerCase().replace(' ', '')}</span>
                <span className='flex items-center gap-1'>
                  <MapPin className='w-3 h-3' aria-hidden='true' />
                  {player.country}
                </span>
                <span className='flex items-center gap-1'>
                  <Calendar className='w-3 h-3' aria-hidden='true' />
                  Joined March 15, 2022
                </span>
              </div>

              <p className='text-muted-foreground mb-4 text-sm'>{player.bio}</p>

              <div
                className='flex flex-wrap gap-6 text-sm'
                role='list'
                aria-label='User statistics'
              >
                <div role='listitem'>
                  <span className='text-foreground font-bold text-sm'>
                    {player.quizzes}
                  </span>
                  <span className='text-muted-foreground ml-2'>
                    Quizzes Taken
                  </span>
                </div>
                <div role='listitem'>
                  <span className='text-foreground font-bold text-sm'>
                    {player.quizzesCreated}
                  </span>
                  <span className='text-muted-foreground ml-2'>
                    Quizzes Created
                  </span>
                </div>
                <div role='listitem'>
                  <span className='text-foreground font-bold text-sm'>
                    {player.followers}
                  </span>
                  <span className='text-muted-foreground ml-2'>Followers</span>
                </div>
                <div role='listitem'>
                  <span className='text-foreground font-bold text-sm'>
                    {player.following}
                  </span>
                  <span className='text-muted-foreground ml-2'>Following</span>
                </div>
              </div>
            </div>
          </div>

          <nav className='flex gap-3 self-center' aria-label='Profile actions'>
            <Button className='gap-2' aria-label={`Follow ${player.name}`}>
              <Users className='w-4 h-4' aria-hidden='true' />
              Follow
            </Button>
            <Button
              variant='outline'
              className='gap-2 text-primary'
              aria-label={`Send message to ${player.name}`}
            >
              <MessageCircle className='w-4 h-4' aria-hidden='true' />
              Message
            </Button>
          </nav>
        </div>
      </div>
    </header>
  )
})

// Re-render optimization: Extract to memoized components
const StatsPanel = memo(function StatsPanel({
  averageScore,
  winRate,
  player
}: {
  averageScore: number
  winRate: number
  player: (typeof players)[0]
}) {
  return (
    <Card className='bg-main sticky top-8'>
      <CardContent className='p-4'>
        <h2
          id='stats-heading'
          className='text-base font-bold text-foreground mb-6'
        >
          Stats & Performance
        </h2>

        <div className='space-y-6'>
          {/* Average Score */}
          <div className='flex justify-between items-center'>
            <div>
              <p className='text-muted-foreground text-sm'>Average Score</p>
              <p className='text-base font-bold text-foreground'>
                {averageScore.toFixed(1)}%
              </p>
            </div>
            <div className='text-right'>
              <p className='text-muted-foreground text-sm'>Win Rate</p>
              <p className='text-base font-bold text-foreground'>{winRate}%</p>
            </div>
          </div>

          {/* Streaks */}
          <div className='flex justify-between items-center pt-4 border-t border-border'>
            <div>
              <p className='text-muted-foreground text-sm'>Current Streak</p>
              <p className='text-base font-bold text-foreground'>
                {player.streak} quizzes
              </p>
            </div>
            <div className='text-right'>
              <p className='text-muted-foreground text-sm'>Highest Streak</p>
              <p className='text-base font-bold text-foreground'>12 quizzes</p>
            </div>
          </div>

          {/* Time */}
          <div className='flex justify-between items-center pt-4 border-t border-border'>
            <div>
              <p className='text-muted-foreground text-sm'>Total Quizzes</p>
              <p className='text-base font-bold text-foreground'>
                {player.quizzes}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-muted-foreground text-sm'>Completion Rate</p>
              <p className='text-base font-bold text-foreground'>94%</p>
            </div>
          </div>

          {/* Categories */}
          <div className='pt-4 border-t border-border space-y-3'>
            <CategoryRow
              label='Best Category'
              value={challengeData[0]?.category || 'History'}
            />
            <CategoryRow
              label='Most Played'
              value={challengeData[1]?.category || 'Science'}
            />
            <CategoryRow label='Rank' value={`#${player.rank}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

const ProfilePage = () => {
  const [activeTab, setActiveTab] = useState('activity')

  // Get the first player as example (you can later make this dynamic based on route params)
  const currentPlayer = players[0]

  // Re-render optimization: Use useCallback with stable dependencies (rerender-dependencies)
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
  }, [])

  // Re-render optimization: Lazy state initialization (rerender-lazy-state-init)
  // Calculate stats - memoized with primitive dependencies
  const averageScore = useMemo(() => {
    if (challengeData.length === 0) return 0
    return (
      challengeData.reduce((sum, c) => sum + c.score, 0) / challengeData.length
    )
  }, [])

  const winRate = useMemo(() => {
    if (challengeData.length === 0) return 0
    const topRanks = challengeData.filter((c) => c.rank <= 10).length
    return Math.round((topRanks / challengeData.length) * 100)
  }, [])

  // Sample activity data based on challenge history
  const recentActivities = useMemo(
    () =>
      challengeData.slice(0, 3).map((challenge) => ({
        id: challenge.id,
        icon: getActivityIcon(challenge.type),
        title: `Completed '${challenge.category}' with a score of ${challenge.score}%`,
        date: challenge.date
      })),
    []
  )

  return (
    <main className='min-h-screen flex items-start justify-center pt-10'>
      <div className='w-[80%]'>
        <Button
          size='sm'
          className='text-foreground/70 dark:text-foreground/70 bg-transparent p-0 hover:bg-transparent hover:text-foreground dark:hover:text-foreground   shadow-none'
          asChild
        >
          <Link href='/' aria-label='Navigate back to home page'>
            <ArrowLeft className='w-5 h-5 mr-2' aria-hidden='true' />
            Back to Home
          </Link>
        </Button>

        {/* Header Section - Extracted to memoized component */}
        <ProfileHeader player={currentPlayer} />

        {/* Main Content */}
        <div className='max-w-7xl mx-auto mt-10'>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {/* Activity Section */}
            <section
              className='lg:col-span-2'
              aria-labelledby='profile-tabs-heading'
            >
              <h2 id='profile-tabs-heading' className='sr-only'>
                {currentPlayer.name}&apos;s Profile Content
              </h2>
              <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                className='w-full text-sm'
              >
                <TabsList
                  className='bg-main border border-border w-full justify-start'
                  aria-label='Profile sections'
                >
                  <TabsTrigger
                    value='activity'
                    className='data-[state=active]:text-white text-sm'
                  >
                    Activity
                  </TabsTrigger>
                  <TabsTrigger
                    value='quizzes'
                    className='data-[state=active]:text-white text-sm'
                  >
                    Quizzes Taken
                  </TabsTrigger>
                  <TabsTrigger
                    value='created'
                    className='data-[state=active]:text-white text-sm'
                  >
                    Created Quizzes
                  </TabsTrigger>
                  <TabsTrigger
                    value='followers'
                    className='data-[state=active]:text-white text-sm'
                  >
                    Followers
                  </TabsTrigger>
                  <TabsTrigger
                    value='following'
                    className='data-[state=active]:text-white text-sm'
                  >
                    Following
                  </TabsTrigger>
                </TabsList>

                <TabsContent value='activity' className='space-y-4 mt-6'>
                  <div role='list' aria-label='Recent activities'>
                    {recentActivities.map((activity) => (
                      <ActivityItem
                        key={activity.id}
                        icon={activity.icon}
                        title={activity.title}
                        date={activity.date}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value='quizzes'>
                  <Card className='bg-main'>
                    <CardContent
                      className='p-4 text-center text-muted-foreground'
                      role='status'
                    >
                      No quizzes data to display
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='created'>
                  <Card className='bg-main'>
                    <CardContent
                      className='p-4 text-center text-muted-foreground'
                      role='status'
                    >
                      No created quizzes to display
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='followers'>
                  <Card className='bg-main'>
                    <CardContent
                      className='p-4 text-center text-muted-foreground'
                      role='status'
                    >
                      No followers data to display
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='following'>
                  <Card className='bg-main'>
                    <CardContent
                      className='p-4 text-center text-muted-foreground'
                      role='status'
                    >
                      No following data to display
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </section>

            {/* Stats Section - Extracted to memoized component */}
            <aside className='lg:col-span-1' aria-labelledby='stats-heading'>
              <StatsPanel
                averageScore={averageScore}
                winRate={winRate}
                player={currentPlayer}
              />
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}

export default memo(ProfilePage)
