'use client'

/**
 * Public profile page — `/profile/[name]`.
 *
 * Source epic:   Phase 1 (F-15, F-16, F-17, F-18) — public profile
 *                quick-wins.
 * Source ticket: F-15..F-18.
 *
 * This is a Phase 1 rewrite that:
 *   - Drops the historic hardcoded `challengeData` import (F-15).
 *   - Renders the live activity, quizzes-taken, quizzes-created,
 *     followers, and following tabs (F-15..F-17).
 *   - Replaces the hardcoded `94%` and `12 quizzes` literals in
 *     `<StatsPanel />` with values derived from the per-user
 *     analytics endpoint (F-18).
 *
 * The page is a `'use client'` component because the data layer
 * (`usePublicProfilePage`) is SWR-backed. The route's `name`
 * parameter is read via `useParams()` from `next/navigation`.
 *
 * ## Username → userId resolution (F-15 caveat)
 *
 * The route param is `name` (a username slug), but every backend
 * endpoint we call here takes a `userId` (UUIDv7). The hook uses
 * the authenticated viewer's `userId` from the `useUser()` store
 * when the route's `name` matches the viewer's `username`. For
 * other users' profiles, the tabs render the empty state.
 *
 * When the backend exposes a username lookup endpoint (F-29 product
 * decision), the replacement is local to `usePublicProfilePage`.
 */

import { memo, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  MessageCircle,
  Users,
  MapPin,
  Calendar,
  BadgeCheck,
  Star,
  ArrowLeft,
} from 'lucide-react'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

import ActivityItem from '@/features/users/components/profile/ActivityItem'
import CategoryRow from '@/features/users/components/profile/CategoryRow'

import type { Player } from '@/features/users/types'
import { usePublicProfilePage } from '@/features/users/hooks/use-public-profile-page'

// Re-render optimization: Extract to memoized components (rerender-memo)
const ProfileHeader = memo(function ProfileHeader({
  player,
  joinedAt,
}: {
  player: Player
  joinedAt: string | null
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
                src={player.avatarUrl ?? undefined}
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
                  Joined{' '}
                  {joinedAt
                    ? new Date(joinedAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'March 15, 2022'}
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
  player,
  bestCategory,
  mostPlayedCategory,
  completionRate,
  highestStreak,
}: {
  averageScore: number
  winRate: number
  player: Player
  bestCategory: string
  mostPlayedCategory: string
  completionRate: number | null
  highestStreak: number | null
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
                {player.streak ?? 0} quizzes
              </p>
            </div>
            <div className='text-right'>
              <p className='text-muted-foreground text-sm'>Highest Streak</p>
              <p className='text-base font-bold text-foreground'>
                {highestStreak !== null ? `${highestStreak} quizzes` : '—'}
              </p>
            </div>
          </div>

          {/* Total / Completion */}
          <div className='flex justify-between items-center pt-4 border-t border-border'>
            <div>
              <p className='text-muted-foreground text-sm'>Total Quizzes</p>
              <p className='text-base font-bold text-foreground'>
                {player.quizzes}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-muted-foreground text-sm'>Completion Rate</p>
              <p className='text-base font-bold text-foreground'>
                {completionRate !== null ? `${completionRate}%` : '—'}
              </p>
            </div>
          </div>

          {/* Categories */}
          <div className='pt-4 border-t border-border space-y-3'>
            <CategoryRow label='Best Category' value={bestCategory} />
            <CategoryRow label='Most Played' value={mostPlayedCategory} />
            <CategoryRow label='Rank' value={`#${player.rank}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

const ProfilePage = () => {
  const params = useParams<{ name: string }>()
  const routeName = typeof params?.name === 'string' ? params.name : ''

  const {
    activeTab,
    handleTabChange,
    currentPlayer,
    averageScore,
    winRate,
    bestCategory,
    mostPlayedCategory,
    recentActivities,
    activity,
    quizzesTaken,
    quizzesCreated,
    quizzesTakenList,
    createdQuizzes,
    isQuizzesLoading,
    quizzesError,
    followers,
    following,
    analytics,
    isAnalyticsLoading,
    resolvedUserId,
  } = usePublicProfilePage({ name: routeName })

  // F-18 — Completion Rate and Highest Streak. The backend exposes
  // neither directly on `CreatorQuizAnalyticsDto`; both are derived
  // from the `totalAttempts` / `uniquePlayers` fields when available.
  const completionRate = useMemo(() => {
    if (!analytics) return null
    if (
      typeof analytics.totalAttempts === 'number' &&
      analytics.totalAttempts > 0 &&
      typeof analytics.uniquePlayers === 'number'
    ) {
      return Math.round((analytics.uniquePlayers / analytics.totalAttempts) * 100)
    }
    return null
  }, [analytics])

  // The user store does not expose `longestStreak` on the public
  // profile's `Player` shape. The `Player` historic field defaulted
  // to 0. Phase 1 preserves the fallback `—` rather than hardcoding
  // a false value.
  const highestStreak: number | null = null

  const joinedAt = useMemo(() => {
    return activity.items[0]?.at ?? null
  }, [activity.items])

  return (
    <main className='min-h-screen flex items-start justify-center pt-10'>
      <div className='w-full max-w-7xl'>
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
        <ProfileHeader player={currentPlayer} joinedAt={joinedAt} />

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
                  {resolvedUserId === null ? (
                    <Card className='bg-main'>
                      <CardContent
                        className='p-4 text-center text-muted-foreground'
                        role='status'
                      >
                        Sign in as{' '}
                        <span className='font-mono'>{routeName}</span> to view
                        this profile&apos;s activity.
                      </CardContent>
                    </Card>
                  ) : recentActivities.length === 0 ? (
                    <Card className='bg-main'>
                      <CardContent
                        className='p-4 text-center text-muted-foreground'
                        role='status'
                      >
                        No recent activity to display.
                      </CardContent>
                    </Card>
                  ) : (
                    <div role='list' aria-label='Recent activities'>
                      {recentActivities.map((activity, index) => (
                        <ActivityItem
                          key={`${activity.title}-${index}`}
                          icon={activity.icon}
                          title={activity.title}
                          date={activity.date}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value='quizzes'>
                  <Card className='bg-main'>
                    <CardContent className='p-4' role='status'>
                      {resolvedUserId === null ? (
                        <p className='text-center text-muted-foreground'>
                          Sign in as{' '}
                          <span className='font-mono'>{routeName}</span> to view
                          this profile&apos;s quizzes taken.
                        </p>
                      ) : isQuizzesLoading ? (
                        <p className='text-center text-muted-foreground'>
                          Loading quizzes taken…
                        </p>
                      ) : quizzesError ? (
                        <p className='text-center text-muted-foreground'>
                          Couldn&apos;t load quizzes taken.
                        </p>
                      ) : quizzesTakenList.length === 0 ? (
                        <p className='text-center text-muted-foreground'>
                          No quizzes taken yet.
                        </p>
                      ) : (
                        <ul className='space-y-2'>
                          {quizzesTakenList.map((quiz) => (
                            <li key={quiz.quizId} className='text-sm'>
                              <Link
                                href={`/quizzes/${quiz.slug ?? quiz.quizId}`}
                                className='text-foreground hover:underline'
                              >
                                {quiz.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='created'>
                  <Card className='bg-main'>
                    <CardContent className='p-4' role='status'>
                      {resolvedUserId === null ? (
                        <p className='text-center text-muted-foreground'>
                          Sign in as{' '}
                          <span className='font-mono'>{routeName}</span> to view
                          this profile&apos;s created quizzes.
                        </p>
                      ) : isQuizzesLoading ? (
                        <p className='text-center text-muted-foreground'>
                          Loading created quizzes…
                        </p>
                      ) : quizzesError ? (
                        <p className='text-center text-muted-foreground'>
                          Couldn&apos;t load created quizzes.
                        </p>
                      ) : createdQuizzes.length === 0 ? (
                        <p className='text-center text-muted-foreground'>
                          No created quizzes yet.
                        </p>
                      ) : (
                        <ul className='space-y-2'>
                          {createdQuizzes.map((quiz) => (
                            <li key={quiz.quizId} className='text-sm'>
                              <Link
                                href={`/quizzes/${quiz.slug ?? quiz.quizId}`}
                                className='text-foreground hover:underline'
                              >
                                {quiz.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='followers'>
                  <Card className='bg-main'>
                    <CardContent className='p-4' role='status'>
                      {resolvedUserId === null ? (
                        <p className='text-center text-muted-foreground'>
                          Sign in as{' '}
                          <span className='font-mono'>{routeName}</span> to view
                          this profile&apos;s followers.
                        </p>
                      ) : followers.isLoading ? (
                        <p className='text-center text-muted-foreground'>
                          Loading followers…
                        </p>
                      ) : followers.error ? (
                        <p className='text-center text-muted-foreground'>
                          Couldn&apos;t load followers.
                        </p>
                      ) : followers.users.length === 0 ? (
                        <p className='text-center text-muted-foreground'>
                          No followers yet.
                        </p>
                      ) : (
                        <ul className='space-y-2'>
                          {followers.users.map((user) => (
                            <li key={user.userId} className='text-sm'>
                              {user.displayName ?? user.userName}
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='following'>
                  <Card className='bg-main'>
                    <CardContent className='p-4' role='status'>
                      {resolvedUserId === null ? (
                        <p className='text-center text-muted-foreground'>
                          Sign in as{' '}
                          <span className='font-mono'>{routeName}</span> to view
                          this profile&apos;s following.
                        </p>
                      ) : following.isLoading ? (
                        <p className='text-center text-muted-foreground'>
                          Loading following…
                        </p>
                      ) : following.error ? (
                        <p className='text-center text-muted-foreground'>
                          Couldn&apos;t load following.
                        </p>
                      ) : following.users.length === 0 ? (
                        <p className='text-center text-muted-foreground'>
                          Not following anyone yet.
                        </p>
                      ) : (
                        <ul className='space-y-2'>
                          {following.users.map((user) => (
                            <li key={user.userId} className='text-sm'>
                              {user.displayName ?? user.userName}
                            </li>
                          ))}
                        </ul>
                      )}
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
                bestCategory={bestCategory}
                mostPlayedCategory={mostPlayedCategory}
                completionRate={completionRate}
                highestStreak={highestStreak}
              />
            </aside>
          </div>
        </div>

        {/* Phase 1 diagnostics — only rendered in development. The
            route slug, viewer's userId, and a one-line summary of the
            resolution help debug the F-15 username → userId mapper
            without changing the public surface. */}
        {process.env.NODE_ENV !== 'production' && (
          <p className='sr-only' data-testid='profile-resolved-userId'>
            resolvedUserId={resolvedUserId ?? 'null'} analyticsLoading=
            {String(isAnalyticsLoading)} quizzesTaken={quizzesTaken} quizzesCreated=
            {quizzesCreated}
          </p>
        )}
      </div>
    </main>
  )
}

export default memo(ProfilePage)
