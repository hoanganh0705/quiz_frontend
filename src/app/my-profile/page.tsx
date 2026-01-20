'use client'

import { useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { ActivityItem } from '@/components/profile/ActivityItem'
import { CategoryRow } from '@/components/profile/CategoryRow'
import { players } from '@/constants/players'
import { challengeData } from '@/constants/challengeHistoryData'
import { badges } from '@/constants/badges'
import { streakRewards } from '@/constants/streakRewards'
import {
  CheckCircle2,
  Trophy,
  Zap,
  Settings,
  Edit,
  MapPin,
  Calendar,
  BadgeCheck,
  Star,
  ArrowLeft,
  TrendingUp,
  Target,
  Award,
  Flame,
  BookOpen,
  Clock,
  Share2,
  Camera,
  BarChart3,
  Gift
} from 'lucide-react'
import Link from 'next/link'

export default function MyProfilePage() {
  const [activeTab, setActiveTab] = useState('overview')

  // Current logged-in user (simulated - would come from auth context)
  const currentUser = players[0]

  // Activity data from challenge history
  const recentActivities = challengeData.slice(0, 5).map((challenge) => {
    let icon
    switch (challenge.type) {
      case 'achievement':
        icon = <CheckCircle2 className='w-5 h-5 text-green-500' />
        break
      case 'win':
        icon = <Trophy className='w-5 h-5 text-amber-500' />
        break
      case 'participation':
        icon = <Zap className='w-5 h-5 text-default' />
        break
      default:
        icon = <Zap className='w-5 h-5 text-default' />
    }

    return {
      id: challenge.id,
      icon,
      title: `Completed '${challenge.category}' with a score of ${challenge.score}%`,
      date: challenge.date
    }
  })

  // Calculate stats
  const averageScore =
    challengeData.reduce((sum, c) => sum + c.score, 0) / challengeData.length
  const topRanks = challengeData.filter((c) => c.rank <= 10).length
  const winRate = Math.round((topRanks / challengeData.length) * 100)
  const totalQuizzes = currentUser.quizzes || 0
  const quizzesCreated = currentUser.quizzesCreated || 0

  // Level progress calculation
  const currentLevelXP = 7800
  const nextLevelXP = 10000
  const levelProgress = (currentLevelXP / nextLevelXP) * 100

  // Unlocked badges count
  const unlockedBadges = badges.filter((b) => b.unlocked).length

  return (
    <div className='min-h-screen flex items-start justify-center pt-10 pb-20'>
      <div className='w-[85%] max-w-7xl'>
        {/* Back Button */}
        <Button
          size='sm'
          className='text-foreground/70 bg-transparent p-0 hover:bg-transparent hover:text-foreground shadow-none'
          asChild
        >
          <Link href='/'>
            <ArrowLeft className='w-5 h-5 mr-2' />
            Back to Home
          </Link>
        </Button>

        {/* Profile Header */}
        <div className='border border-border bg-main rounded-2xl mt-6 overflow-hidden'>
          {/* Cover Image */}
          <div className='relative h-32 bg-linear-to-r from-default/30 via-default/20 to-default/10'>
            <Button
              size='sm'
              variant='secondary'
              className='absolute bottom-3 right-3 gap-2 text-xs'
            >
              <Camera className='w-3 h-3' />
              Change Cover
            </Button>
          </div>

          {/* Profile Info */}
          <div className='px-8 pb-6'>
            <div className='flex flex-col md:flex-row items-start justify-between gap-6'>
              {/* Avatar & Info */}
              <div className='flex flex-col sm:flex-row items-start gap-6 flex-1'>
                <div className='relative -mt-12'>
                  <Avatar className='h-24 w-24 border-4 border-main'>
                    <AvatarImage
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                    />
                    <AvatarFallback className='text-2xl'>
                      {currentUser.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size='icon'
                    variant='secondary'
                    className='absolute bottom-0 right-0 h-7 w-7 rounded-full'
                  >
                    <Camera className='w-3 h-3' />
                  </Button>
                </div>

                <div className='flex-1 pt-2'>
                  <div className='flex flex-wrap items-center gap-3 mb-2'>
                    <h1 className='text-2xl font-bold text-foreground'>
                      {currentUser.name}
                    </h1>
                    <Badge className='bg-default/20 text-default border-default/30 gap-1'>
                      <BadgeCheck className='w-3 h-3' />
                      Verified
                    </Badge>
                    <Badge
                      variant='outline'
                      className='border-amber-500/30 bg-amber-500/10 text-amber-500 gap-1'
                    >
                      <Star className='w-3 h-3 fill-current' />
                      {currentUser.levelString || `Level ${currentUser.level}`}
                    </Badge>
                    {currentUser.badge && (
                      <Badge
                        variant='outline'
                        className='border-purple-500/30 bg-purple-500/10 text-purple-500 gap-1'
                      >
                        <Award className='w-3 h-3' />
                        {currentUser.badge}
                      </Badge>
                    )}
                  </div>

                  <div className='flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-3'>
                    <span>
                      @{currentUser.name.toLowerCase().replace(' ', '')}
                    </span>
                    <span className='flex items-center gap-1'>
                      <MapPin className='w-3 h-3' />
                      {currentUser.country}
                    </span>
                    <span className='flex items-center gap-1'>
                      <Calendar className='w-3 h-3' />
                      Joined March 15, 2022
                    </span>
                  </div>

                  <p className='text-muted-foreground mb-4 text-sm max-w-xl'>
                    {currentUser.bio}
                  </p>

                  {/* Quick Stats */}
                  <div className='flex flex-wrap gap-6 text-sm'>
                    <div>
                      <span className='text-foreground font-bold'>
                        {currentUser.quizzes}
                      </span>
                      <span className='text-muted-foreground ml-2'>
                        Quizzes Taken
                      </span>
                    </div>
                    <div>
                      <span className='text-foreground font-bold'>
                        {currentUser.quizzesCreated}
                      </span>
                      <span className='text-muted-foreground ml-2'>
                        Quizzes Created
                      </span>
                    </div>
                    <div>
                      <span className='text-foreground font-bold'>
                        {currentUser.followers}
                      </span>
                      <span className='text-muted-foreground ml-2'>
                        Followers
                      </span>
                    </div>
                    <div>
                      <span className='text-foreground font-bold'>
                        {currentUser.following}
                      </span>
                      <span className='text-muted-foreground ml-2'>
                        Following
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className='flex gap-3 self-start mt-4 md:mt-0'>
                <Button className='gap-2' asChild>
                  <Link href='/settings'>
                    <Edit className='w-4 h-4' />
                    Edit Profile
                  </Link>
                </Button>
                <Button variant='outline' className='gap-2 text-primary'>
                  <Share2 className='w-4 h-4' />
                  Share
                </Button>
                <Button size='icon' asChild>
                  <Link href='/settings'>
                    <Settings className='w-4 h-4' />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-6'>
          <Card className='bg-main'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <div className='p-2 rounded-lg bg-green-500/10'>
                  <TrendingUp className='w-5 h-5 text-green-500' />
                </div>
                <div>
                  <p className='text-xl font-bold text-foreground'>
                    {averageScore.toFixed(1)}%
                  </p>
                  <p className='text-xs text-muted-foreground'>Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='bg-main'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <div className='p-2 rounded-lg bg-amber-500/10'>
                  <Flame className='w-5 h-5 text-amber-500' />
                </div>
                <div>
                  <p className='text-xl font-bold text-foreground'>
                    {currentUser.streak}
                  </p>
                  <p className='text-xs text-muted-foreground'>Day Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='bg-main'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <div className='p-2 rounded-lg bg-purple-500/10'>
                  <Trophy className='w-5 h-5 text-purple-500' />
                </div>
                <div>
                  <p className='text-xl font-bold text-foreground'>
                    #{currentUser.rank}
                  </p>
                  <p className='text-xs text-muted-foreground'>Global Rank</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className='bg-main'>
            <CardContent className='p-4'>
              <div className='flex items-center gap-3'>
                <div className='p-2 rounded-lg bg-blue-500/10'>
                  <Target className='w-5 h-5 text-blue-500' />
                </div>
                <div>
                  <p className='text-xl font-bold text-foreground'>
                    {winRate}%
                  </p>
                  <p className='text-xs text-muted-foreground'>Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6'>
          {/* Left Column - Tabs */}
          <div className='lg:col-span-2'>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='w-full text-sm'
            >
              <TabsList className='bg-main border border-border w-full justify-start'>
                <TabsTrigger
                  value='overview'
                  className='data-[state=active]:text-white text-sm'
                >
                  Overview
                </TabsTrigger>
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
                  My Quizzes
                </TabsTrigger>
                <TabsTrigger
                  value='achievements'
                  className='data-[state=active]:text-white text-sm'
                >
                  Achievements
                </TabsTrigger>
                <TabsTrigger
                  value='stats'
                  className='data-[state=active]:text-white text-sm'
                >
                  Statistics
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value='overview' className='space-y-6 mt-6'>
                {/* Level Progress */}
                <Card className='bg-main'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-base flex items-center gap-2'>
                      <Star className='w-4 h-4 text-amber-500' />
                      Level Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      <div className='flex justify-between text-sm'>
                        <span className='text-muted-foreground'>
                          Level {currentUser.level}
                        </span>
                        <span className='text-muted-foreground'>
                          {currentLevelXP.toLocaleString()} /{' '}
                          {nextLevelXP.toLocaleString()} XP
                        </span>
                      </div>
                      <Progress value={levelProgress} className='h-2' />
                      <p className='text-xs text-muted-foreground'>
                        {(nextLevelXP - currentLevelXP).toLocaleString()} XP to
                        reach Level {(currentUser.level || 0) + 1}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className='bg-main'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-base flex items-center justify-between'>
                      <span className='flex items-center gap-2'>
                        <Clock className='w-4 h-4 text-default' />
                        Recent Activity
                      </span>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-xs'
                        onClick={() => setActiveTab('activity')}
                      >
                        View All
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    {recentActivities.slice(0, 3).map((activity) => (
                      <div
                        key={activity.id}
                        className='flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors'
                      >
                        {activity.icon}
                        <div className='flex-1 min-w-0'>
                          <p className='text-sm text-foreground truncate'>
                            {activity.title}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {activity.date}
                          </p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Badges Preview */}
                <Card className='bg-main'>
                  <CardHeader className='pb-2'>
                    <CardTitle className='text-base flex items-center justify-between'>
                      <span className='flex items-center gap-2'>
                        <Award className='w-4 h-4 text-purple-500' />
                        Badges ({unlockedBadges}/{badges.length})
                      </span>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='text-xs'
                        onClick={() => setActiveTab('achievements')}
                      >
                        View All
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='flex flex-wrap gap-3'>
                      {badges.slice(0, 5).map((badge) => {
                        const IconComponent = badge.icon
                        return (
                          <div
                            key={badge.id}
                            className={`flex items-center gap-2 p-2 rounded-lg ${badge.bgColor} ${!badge.unlocked && 'opacity-50'}`}
                          >
                            <IconComponent
                              className={`w-4 h-4 ${badge.color}`}
                            />
                            <span
                              className={`text-xs font-medium ${badge.color}`}
                            >
                              {badge.name}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value='activity' className='space-y-4 mt-6'>
                {recentActivities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    icon={activity.icon}
                    title={activity.title}
                    date={activity.date}
                  />
                ))}
              </TabsContent>

              {/* My Quizzes Tab */}
              <TabsContent value='quizzes' className='mt-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <Card className='bg-main'>
                    <CardContent className='p-6'>
                      <div className='flex items-center gap-4'>
                        <div className='p-3 rounded-lg bg-default/10'>
                          <BookOpen className='w-6 h-6 text-default' />
                        </div>
                        <div>
                          <p className='text-3xl font-bold text-foreground'>
                            {totalQuizzes}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            Quizzes Completed
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className='bg-main'>
                    <CardContent className='p-6'>
                      <div className='flex items-center gap-4'>
                        <div className='p-3 rounded-lg bg-green-500/10'>
                          <Edit className='w-6 h-6 text-green-500' />
                        </div>
                        <div>
                          <p className='text-3xl font-bold text-foreground'>
                            {quizzesCreated}
                          </p>
                          <p className='text-sm text-muted-foreground'>
                            Quizzes Created
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className='bg-main mt-4'>
                  <CardHeader>
                    <CardTitle className='text-base'>Quiz History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-3'>
                      {challengeData.map((quiz) => (
                        <div
                          key={quiz.id}
                          className='flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors'
                        >
                          <div className='flex items-center gap-3'>
                            <div
                              className={`p-2 rounded-lg ${quiz.isTopTen ? 'bg-amber-500/10' : 'bg-muted'}`}
                            >
                              {quiz.isTopTen ? (
                                <Trophy className='w-4 h-4 text-amber-500' />
                              ) : (
                                <BookOpen className='w-4 h-4 text-muted-foreground' />
                              )}
                            </div>
                            <div>
                              <p className='text-sm font-medium text-foreground'>
                                {quiz.category}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {quiz.date}
                              </p>
                            </div>
                          </div>
                          <div className='text-right'>
                            <p className='text-sm font-bold text-foreground'>
                              {quiz.score}%
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              Rank #{quiz.rank}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Achievements Tab */}
              <TabsContent value='achievements' className='mt-6'>
                <Card className='bg-main'>
                  <CardHeader>
                    <CardTitle className='text-base flex items-center gap-2'>
                      <Award className='w-4 h-4 text-purple-500' />
                      All Badges ({unlockedBadges}/{badges.length} Unlocked)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                      {badges.map((badge) => {
                        const IconComponent = badge.icon
                        return (
                          <div
                            key={badge.id}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${badge.unlocked ? 'border-border' : 'border-border/50 opacity-50'} ${badge.bgColor}`}
                          >
                            <IconComponent
                              className={`w-8 h-8 ${badge.color}`}
                            />
                            <span
                              className={`text-sm font-medium ${badge.color}`}
                            >
                              {badge.name}
                            </span>
                            <span className='text-xs text-muted-foreground'>
                              {badge.unlocked ? 'Unlocked' : 'Locked'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Streak Rewards */}
                <Card className='bg-main mt-4'>
                  <CardHeader>
                    <CardTitle className='text-base flex items-center gap-2'>
                      <Gift className='w-4 h-4 text-amber-500' />
                      Streak Rewards
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                      {streakRewards.map((reward) => (
                        <div
                          key={reward.id}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border ${(currentUser.streak || 0) >= reward.days ? 'border-amber-500/50 bg-amber-500/10' : 'border-border bg-muted/30'}`}
                        >
                          <Flame
                            className={`w-6 h-6 ${(currentUser.streak || 0) >= reward.days ? 'text-amber-500' : 'text-muted-foreground'}`}
                          />
                          <span className='text-lg font-bold text-foreground'>
                            {reward.days} Days
                          </span>
                          <span className='text-xs text-muted-foreground text-center'>
                            {reward.reward}
                          </span>
                          {(currentUser.streak || 0) >= reward.days && (
                            <Badge
                              variant='outline'
                              className='text-xs border-green-500/30 text-green-500'
                            >
                              Claimed
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Statistics Tab */}
              <TabsContent value='stats' className='mt-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <Card className='bg-main'>
                    <CardHeader>
                      <CardTitle className='text-base flex items-center gap-2'>
                        <BarChart3 className='w-4 h-4 text-default' />
                        Performance Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='flex justify-between items-center'>
                        <span className='text-sm text-muted-foreground'>
                          Average Score
                        </span>
                        <span className='text-sm font-bold text-foreground'>
                          {averageScore.toFixed(1)}%
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <span className='text-sm text-muted-foreground'>
                          Win Rate
                        </span>
                        <span className='text-sm font-bold text-foreground'>
                          {winRate}%
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <span className='text-sm text-muted-foreground'>
                          Completion Rate
                        </span>
                        <span className='text-sm font-bold text-foreground'>
                          94%
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <span className='text-sm text-muted-foreground'>
                          Total Score
                        </span>
                        <span className='text-sm font-bold text-foreground'>
                          {currentUser.score?.toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className='bg-main'>
                    <CardHeader>
                      <CardTitle className='text-base flex items-center gap-2'>
                        <TrendingUp className='w-4 h-4 text-green-500' />
                        Streaks & Records
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='flex justify-between items-center'>
                        <span className='text-sm text-muted-foreground'>
                          Current Streak
                        </span>
                        <span className='text-sm font-bold text-foreground'>
                          {currentUser.streak} days
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <span className='text-sm text-muted-foreground'>
                          Longest Streak
                        </span>
                        <span className='text-sm font-bold text-foreground'>
                          14 days
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <span className='text-sm text-muted-foreground'>
                          Best Score
                        </span>
                        <span className='text-sm font-bold text-foreground'>
                          98%
                        </span>
                      </div>
                      <div className='flex justify-between items-center'>
                        <span className='text-sm text-muted-foreground'>
                          Best Rank
                        </span>
                        <span className='text-sm font-bold text-foreground'>
                          #1
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Category Performance */}
                <Card className='bg-main mt-4'>
                  <CardHeader>
                    <CardTitle className='text-base'>
                      Category Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    {challengeData.slice(0, 4).map((quiz) => (
                      <div key={quiz.id} className='space-y-2'>
                        <div className='flex justify-between text-sm'>
                          <span className='text-foreground'>
                            {quiz.category}
                          </span>
                          <span className='text-muted-foreground'>
                            {quiz.score}%
                          </span>
                        </div>
                        <Progress value={quiz.score} className='h-2' />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className='lg:col-span-1 space-y-6'>
            {/* Stats Card */}
            <Card className='bg-main sticky top-8'>
              <CardContent className='p-4'>
                <h2 className='text-base font-bold text-foreground mb-4'>
                  Quick Stats
                </h2>

                <div className='space-y-4'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-muted-foreground'>
                      Total Score
                    </span>
                    <span className='text-sm font-bold text-foreground'>
                      {currentUser.score?.toLocaleString()}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-muted-foreground'>
                      Total Wins
                    </span>
                    <span className='text-sm font-bold text-foreground'>
                      {currentUser.wins}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-sm text-muted-foreground'>
                      Earned
                    </span>
                    <span className='text-sm font-bold text-green-500'>
                      ${currentUser.earned?.toFixed(2)}
                    </span>
                  </div>

                  <div className='pt-4 border-t border-border space-y-3'>
                    <CategoryRow
                      label='Best Category'
                      value={challengeData[0]?.category || 'History'}
                    />
                    <CategoryRow
                      label='Most Played'
                      value={challengeData[1]?.category || 'Science'}
                    />
                    <CategoryRow
                      label='Global Rank'
                      value={`#${currentUser.rank}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className='bg-main'>
              <CardContent className='p-4'>
                <h2 className='text-base font-bold text-foreground mb-4'>
                  Quick Actions
                </h2>
                <div className='space-y-2'>
                  <Button
                    variant='outline'
                    className='w-full justify-start gap-2'
                    asChild
                  >
                    <Link href='/create-quiz'>
                      <Edit className='w-4 h-4' />
                      Create New Quiz
                    </Link>
                  </Button>
                  <Button
                    variant='outline'
                    className='w-full justify-start gap-2'
                    asChild
                  >
                    <Link href='/daily-challenge'>
                      <Flame className='w-4 h-4' />
                      Daily Challenge
                    </Link>
                  </Button>
                  <Button
                    variant='outline'
                    className='w-full justify-start gap-2'
                    asChild
                  >
                    <Link href='/leaderboard'>
                      <Trophy className='w-4 h-4' />
                      View Leaderboard
                    </Link>
                  </Button>
                  <Button
                    variant='outline'
                    className='w-full justify-start gap-2'
                    asChild
                  >
                    <Link href='/settings'>
                      <Settings className='w-4 h-4' />
                      Account Settings
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
