'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityItem } from '@/components/profile/ActivityItem'
import {
  ProfileHeader,
  StatsCard,
  QuickStatsSidebar,
  QuickActions,
  OverviewTab,
  QuizzesTab,
  AchievementsTab,
  StatisticsTab
} from '@/components/my-profile'
import { players } from '@/constants/players'
import { challengeData } from '@/constants/challengeHistoryData'
import { badges } from '@/constants/badges'
import { streakRewards } from '@/constants/streakRewards'
import {
  CheckCircle2,
  Trophy,
  Zap,
  ArrowLeft,
  TrendingUp,
  Target,
  Flame
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
        <ProfileHeader user={currentUser} />

        {/* Quick Stats Cards */}
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-6'>
          <StatsCard
            icon={TrendingUp}
            iconColor='text-green-500'
            iconBgColor='bg-green-500/10'
            value={`${averageScore.toFixed(1)}%`}
            label='Average Score'
          />
          <StatsCard
            icon={Flame}
            iconColor='text-amber-500'
            iconBgColor='bg-amber-500/10'
            value={currentUser.streak || 0}
            label='Day Streak'
          />
          <StatsCard
            icon={Trophy}
            iconColor='text-purple-500'
            iconBgColor='bg-purple-500/10'
            value={`#${currentUser.rank}`}
            label='Global Rank'
          />
          <StatsCard
            icon={Target}
            iconColor='text-blue-500'
            iconBgColor='bg-blue-500/10'
            value={`${winRate}%`}
            label='Win Rate'
          />
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
              <TabsContent value='overview'>
                <OverviewTab
                  user={currentUser}
                  currentLevelXP={currentLevelXP}
                  nextLevelXP={nextLevelXP}
                  levelProgress={levelProgress}
                  recentActivities={recentActivities}
                  badges={badges}
                  unlockedBadges={unlockedBadges}
                  onViewAllActivity={() => setActiveTab('activity')}
                  onViewAllBadges={() => setActiveTab('achievements')}
                />
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
              <TabsContent value='quizzes'>
                <QuizzesTab
                  totalQuizzes={totalQuizzes}
                  quizzesCreated={quizzesCreated}
                  quizHistory={challengeData}
                />
              </TabsContent>

              {/* Achievements Tab */}
              <TabsContent value='achievements'>
                <AchievementsTab
                  badges={badges}
                  unlockedBadges={unlockedBadges}
                  streakRewards={streakRewards}
                  currentStreak={currentUser.streak || 0}
                />
              </TabsContent>

              {/* Statistics Tab */}
              <TabsContent value='stats'>
                <StatisticsTab
                  user={currentUser}
                  averageScore={averageScore}
                  winRate={winRate}
                  quizHistory={challengeData}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className='lg:col-span-1 space-y-6'>
            <QuickStatsSidebar
              user={currentUser}
              bestCategory={challengeData[0]?.category || 'History'}
              mostPlayed={challengeData[1]?.category || 'Science'}
            />
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  )
}
