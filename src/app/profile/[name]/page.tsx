'use client'

import { useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityItem } from '@/components/profile/ActivityItem'
import { CategoryRow } from '@/components/profile/CategoryRow'
import { players } from '@/constants/players'
import { challengeData } from '@/constants/challengeHistoryData'
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
  Link,
  ArrowLeft
} from 'lucide-react'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('activity')

  // Get the first player as example (you can later make this dynamic based on route params)
  const currentPlayer = players[0]

  // Sample activity data based on challenge history
  const recentActivities = challengeData
    .slice(0, 3)
    .map((challenge, index) => ({
      id: challenge.id,
      icon:
        index === 0 ? (
          <CheckCircle2 className='w-6 h-6 text-green-500' />
        ) : index === 1 ? (
          <Trophy className='w-6 h-6 text-amber-500' />
        ) : (
          <Zap className='w-6 h-6 text-default' />
        ),
      title: `Completed '${challenge.category}' with a score of ${challenge.score}%`,
      date: challenge.date
    }))

  // Calculate stats
  const averageScore =
    challengeData.reduce((sum, c) => sum + c.score, 0) / challengeData.length
  const topRanks = challengeData.filter((c) => c.rank <= 10).length
  const winRate = Math.round((topRanks / challengeData.length) * 100)

  return (
    <div className='min-h-screen flex items-center justify-center'>
      <div>
        {/* Header Section */}
        <div className='border-b border-border bg-main rounded-2xl'>
          <Button
            size='sm'
            className='text-foreground/70 dark:text-foreground/70 bg-transparent p-0 hover:bg-transparent hover:text-foreground dark:hover:text-foreground   shadow-none'
            asChild
          >
            <Link href='/'>
              <ArrowLeft className='w-5 h-5 mr-2' />
              Back to Home
            </Link>
          </Button>
          <div className='max-w-7xl mx-auto px-2 py-4'>
            <div className='flex flex-col md:flex-row items-start justify-between gap-6'>
              <div className='flex flex-col sm:flex-row items-start gap-6 flex-1'>
                <Avatar className='h-28 w-28 border-4 border-default'>
                  <AvatarImage
                    src={currentPlayer.avatarUrl}
                    alt={currentPlayer.name}
                  />
                  <AvatarFallback className='text-2xl'>
                    {currentPlayer.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>

                <div className='flex-1 pt-2'>
                  <div className='flex flex-wrap items-center gap-3 mb-2'>
                    <h1 className='text-3xl font-bold text-foreground'>
                      {currentPlayer.name}
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
                      Level {currentPlayer.level}
                    </Badge>
                  </div>

                  <div className='flex flex-wrap items-center gap-4 text-muted-foreground text-sm mb-3'>
                    <span>
                      @{currentPlayer.name.toLowerCase().replace(' ', '')}
                    </span>
                    <span className='flex items-center gap-1'>
                      <MapPin className='w-3 h-3' />
                      {currentPlayer.country}
                    </span>
                    <span className='flex items-center gap-1'>
                      <Calendar className='w-3 h-3' />
                      Joined March 15, 2022
                    </span>
                  </div>

                  <p className='text-muted-foreground mb-4'>
                    Quiz enthusiast and knowledge seeker. I love challenging
                    myself with difficult quizzes!
                  </p>

                  <div className='flex flex-wrap gap-6 text-sm'>
                    <div>
                      <span className='text-foreground font-bold text-lg'>
                        {currentPlayer.quizzes}
                      </span>
                      <span className='text-muted-foreground ml-2'>
                        Quizzes Taken
                      </span>
                    </div>
                    <div>
                      <span className='text-foreground font-bold text-lg'>
                        15
                      </span>
                      <span className='text-muted-foreground ml-2'>
                        Quizzes Created
                      </span>
                    </div>
                    <div>
                      <span className='text-foreground font-bold text-lg'>
                        {currentPlayer.followers}
                      </span>
                      <span className='text-muted-foreground ml-2'>
                        Followers
                      </span>
                    </div>
                    <div>
                      <span className='text-foreground font-bold text-lg'>
                        {currentPlayer.following}
                      </span>
                      <span className='text-muted-foreground ml-2'>
                        Following
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className='flex gap-3'>
                <Button className='gap-2'>
                  <Users className='w-4 h-4' />
                  Follow
                </Button>
                <Button variant='outline' className='gap-2'>
                  <MessageCircle className='w-4 h-4' />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className='max-w-7xl mx-auto px-6 py-8'>
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {/* Activity Section */}
            <div className='lg:col-span-2'>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className='w-full'
              >
                <TabsList className='bg-main border border-border w-full justify-start'>
                  <TabsTrigger value='activity'>Activity</TabsTrigger>
                  <TabsTrigger value='quizzes'>Quizzes Taken</TabsTrigger>
                  <TabsTrigger value='created'>Created Quizzes</TabsTrigger>
                  <TabsTrigger value='followers'>Followers</TabsTrigger>
                  <TabsTrigger value='following'>Following</TabsTrigger>
                </TabsList>

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

                <TabsContent value='quizzes'>
                  <Card className='bg-main'>
                    <CardContent className='pt-6 text-center text-muted-foreground'>
                      No quizzes data to display
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='created'>
                  <Card className='bg-main'>
                    <CardContent className='pt-6 text-center text-muted-foreground'>
                      No created quizzes to display
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='followers'>
                  <Card className='bg-main'>
                    <CardContent className='pt-6 text-center text-muted-foreground'>
                      No followers data to display
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value='following'>
                  <Card className='bg-main'>
                    <CardContent className='pt-6 text-center text-muted-foreground'>
                      No following data to display
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Stats Section */}
            <div className='lg:col-span-1'>
              <Card className='bg-main sticky top-8'>
                <CardContent className='pt-6'>
                  <h2 className='text-xl font-bold text-foreground mb-6'>
                    Stats & Performance
                  </h2>

                  <div className='space-y-6'>
                    {/* Average Score */}
                    <div className='flex justify-between items-center'>
                      <div>
                        <p className='text-muted-foreground text-sm'>
                          Average Score
                        </p>
                        <p className='text-2xl font-bold text-foreground'>
                          {averageScore.toFixed(1)}%
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-muted-foreground text-sm'>
                          Win Rate
                        </p>
                        <p className='text-2xl font-bold text-foreground'>
                          {winRate}%
                        </p>
                      </div>
                    </div>

                    {/* Streaks */}
                    <div className='flex justify-between items-center pt-4 border-t border-border'>
                      <div>
                        <p className='text-muted-foreground text-sm'>
                          Current Streak
                        </p>
                        <p className='text-2xl font-bold text-foreground'>
                          {currentPlayer.streak} quizzes
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-muted-foreground text-sm'>
                          Highest Streak
                        </p>
                        <p className='text-2xl font-bold text-foreground'>
                          12 quizzes
                        </p>
                      </div>
                    </div>

                    {/* Time */}
                    <div className='flex justify-between items-center pt-4 border-t border-border'>
                      <div>
                        <p className='text-muted-foreground text-sm'>
                          Total Quizzes
                        </p>
                        <p className='text-2xl font-bold text-foreground'>
                          {currentPlayer.quizzes}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-muted-foreground text-sm'>
                          Completion Rate
                        </p>
                        <p className='text-2xl font-bold text-foreground'>
                          94%
                        </p>
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
                      <CategoryRow
                        label='Rank'
                        value={`#${currentPlayer.rank}`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
