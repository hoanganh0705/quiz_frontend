'use client'

import { useState, memo } from 'react'
// Fix barrel imports (bundle-barrel-imports)
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { TabsContent } from '@/components/ui/tabs'
import { TabsList } from '@/components/ui/tabs'
import { TabsTrigger } from '@/components/ui/tabs'
import { ActivityItem } from '@/components/profile/ActivityItem'
import { ProfileHeader } from '@/components/my-profile/ProfileHeader'
import { StatsCard } from '@/components/my-profile/StatsCard'
import { QuickStatsSidebar } from '@/components/my-profile/QuickStatsSidebar'
import { QuickActions } from '@/components/my-profile/QuickActions'
import { OverviewTab } from '@/components/my-profile/tabs/OverviewTab'
import { QuizzesTab } from '@/components/my-profile/tabs/QuizzesTab'
import { AchievementsTab } from '@/components/my-profile/tabs/AchievementsTab'
import { StatisticsTab } from '@/components/my-profile/tabs/StatisticsTab'
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

// Hoist helper function outside component (data-hoisting)
function getActivityIcon(type?: string) {
  switch (type) {
    case 'achievement':
      return (
        <CheckCircle2 className='w-5 h-5 text-green-500' aria-hidden='true' />
      )
    case 'win':
      return <Trophy className='w-5 h-5 text-amber-500' aria-hidden='true' />
    case 'participation':
      return <Zap className='w-5 h-5 text-default' aria-hidden='true' />
    default:
      return <Zap className='w-5 h-5 text-default' aria-hidden='true' />
  }
}

// Hoist calculation functions outside component (data-hoisting)
function calculateStats() {
  const averageScore =
    challengeData.reduce((sum, c) => sum + c.score, 0) / challengeData.length
  const topRanks = challengeData.filter((c) => c.rank <= 10).length
  const winRate = Math.round((topRanks / challengeData.length) * 100)
  return { averageScore, winRate }
}

const MyProfilePage = memo(function MyProfilePage() {
  const [activeTab, setActiveTab] = useState('overview')

  // Current logged-in user (simulated - would come from auth context)
  const currentUser = players[0]

  // Activity data from challenge history
  const recentActivities = challengeData.slice(0, 5).map((challenge) => ({
    id: challenge.id,
    icon: getActivityIcon(challenge.type),
    title: `Completed '${challenge.category}' with a score of ${challenge.score}%`,
    date: challenge.date
  }))

  // Calculate stats
  const { averageScore, winRate } = calculateStats()
  const totalQuizzes = currentUser.quizzes || 0
  const quizzesCreated = currentUser.quizzesCreated || 0

  // Level progress calculation
  const currentLevelXP = 7800
  const nextLevelXP = 10000
  const levelProgress = (currentLevelXP / nextLevelXP) * 100

  // Unlocked badges count
  const unlockedBadges = badges.filter((b) => b.unlocked).length

  return (
    <main className='min-h-screen flex items-start justify-center pt-10 pb-20'>
      <div className='w-[85%] max-w-7xl'>
        {/* Back Button */}
        <Button
          size='sm'
          className='text-foreground/70 bg-transparent p-0 hover:bg-transparent hover:text-foreground shadow-none'
          asChild
        >
          <Link href='/' aria-label='Back to home page'>
            <ArrowLeft className='w-5 h-5 mr-2' aria-hidden='true' />
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
              <TabsList
                className='border border-border w-full justify-start'
                role='tablist'
                aria-label='Profile sections'
              >
                <TabsTrigger
                  value='overview'
                  className=' text-sm font-semibold dark:data-[state=active]:bg-default dark:dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value='activity'
                  className=' text-sm font-semibold dark:data-[state=active]:bg-default dark:dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
                >
                  Activity
                </TabsTrigger>
                <TabsTrigger
                  value='quizzes'
                  className=' text-sm font-semibold dark:data-[state=active]:bg-default dark:dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
                >
                  My Quizzes
                </TabsTrigger>
                <TabsTrigger
                  value='achievements'
                  className=' text-sm font-semibold dark:data-[state=active]:bg-default dark:dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
                >
                  Achievements
                </TabsTrigger>
                <TabsTrigger
                  value='stats'
                  className=' text-sm font-semibold dark:data-[state=active]:bg-default dark:dark:data-[state=active]:text-white data-[state=active]:bg-background text-foreground/70 data-[state=active]:text-foreground transition-transform'
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
    </main>
  )
})

export default MyProfilePage
