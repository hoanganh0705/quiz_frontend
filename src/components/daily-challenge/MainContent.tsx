'use client'

import { useState, useEffect } from 'react'
import {
  Clock,
  Calendar,
  Trophy,
  Flame,
  ChevronRight,
  ChevronLeft,
  Star
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { leaderboardData } from '@/constants/leaderBoard'
import { streakRewards } from '@/constants/streakRewards'
import ChallengeChart from '@/components/ChallengeChart'
import { Badge } from '@/components/ui/badge'
import { badges } from '@/constants/badges'
import { challengeData } from '@/constants/challengeHistoryData'
import Image from 'next/image'
import { players } from '@/constants/players'
import { Gem, Medal } from 'lucide-react'

const badgeIcons: Record<string, React.ReactNode> = {
  Diamond: <Gem className='text-cyan-400 w-5 h-5' />,
  Platinum: <Gem className='text-slate-300 w-5 h-5' />,
  Gold: <Medal className='text-yellow-500 w-5 h-5' />,
  Silver: <Medal className='text-gray-400 w-5 h-5' />,
  Bronze: <Medal className='text-orange-600 w-5 h-5' />
}

const MainContent = () => {
  const [questionTime, setQuestionTime] = useState<string>('5:00')
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)

  useEffect(() => {
    if (!isTimerActive || selectedAnswer === '') return

    let seconds = 5 * 60

    const updateTimer = () => {
      if (seconds <= 0) {
        setQuestionTime('00:00')
        setIsTimerActive(false)
        return
      }

      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60

      setQuestionTime(
        `${minutes.toString().padStart(2, '0')}:${remainingSeconds
          .toString()
          .padStart(2, '0')}`
      )
      seconds--
    }

    updateTimer() // Update immediately on selection
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [isTimerActive, selectedAnswer]) // Depend on isTimerActive and selectedAnswer

  // Start the timer when an answer is selected
  useEffect(() => {
    if (selectedAnswer !== '') {
      setIsTimerActive(true)
    }
  }, [selectedAnswer])

  const displayedHistory = showAllHistory
    ? challengeData
    : challengeData.slice(0, 3)

  return (
    <main className='grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 items-start'>
      {/* Left Block */}
      <div className='lg:col-span-2 space-y-6'>
        {/* Quiz Section */}
        <Card className='bg-background text-foreground border border-gray-300 dark:border-slate-700 lg:col-span-2 py-6'>
          <CardHeader>
            <div className='flex justify-between items-start'>
              <div>
                <CardTitle className='text-xl font-bold'>
                  Science & Technology Challenge
                </CardTitle>
                <p className='text-foreground/70 mt-1'>
                  Test your knowledge of scientific discoveries and
                  technological innovations.
                </p>
              </div>
              <div className='flex items-center space-x-2 text-gray-500'>
                <Clock className='h-4 w-4' />
                <span className='font-mono'>{questionTime}</span>
              </div>
            </div>
            <div className='space-y-2'>
              <div className='flex justify-between text-sm text-foreground/70'>
                <span>Question 1 of 5</span>
                <span>20% Complete</span>
              </div>
              <Progress value={20} className='h-2' />
            </div>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div>
              <h3 className='text-lg font-semibold mb-4'>
                Which of these is NOT a programming language?
              </h3>
              <RadioGroup
                value={selectedAnswer}
                onValueChange={setSelectedAnswer}
                className='space-y-3'
              >
                {['Java', 'Python', 'HTML', 'JavaScript'].map((option) => (
                  <div
                    key={option}
                    className='flex items-center space-x-3 p-3 border rounded-lg hover:bg-main-hover'
                  >
                    <RadioGroupItem
                      value={option.toLowerCase()}
                      id={option.toLowerCase()}
                    />
                    <Label
                      htmlFor={option.toLowerCase()}
                      className='flex-1 cursor-pointer'
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <div className='flex justify-between'>
              <Button variant='outline' disabled>
                Previous
              </Button>
              <Button
                disabled={!selectedAnswer}
                className='text-white transition-colors'
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Challenge Stats */}
        <ChallengeChart />

        {/* Challenge History */}
        <Card className='bg-background text-foreground border border-gray-300 dark:border-slate-700 py-6'>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <h1 className='text-xl font-bold'>Challenge History</h1>
              <Button
                className='flex items-center gap-1 bg-background text-foreground/70 hover:text-foreground hover:bg-transparent transition-colors  shadow-none '
                onClick={() => setShowAllHistory(!showAllHistory)}
              >
                <span className='text-xs'>
                  {showAllHistory ? 'View Less' : 'View All'}
                </span>
                {showAllHistory ? (
                  <ChevronLeft className='w-4 h-4' />
                ) : (
                  <ChevronRight className='w-4 h-4' />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-6'>
              {displayedHistory.map((challenge) => (
                <Card
                  key={challenge.id}
                  className='bg-background border-b border-gray-300 dark:border-slate-700 last:border-b-0'
                >
                  <CardContent className='p-4'>
                    <div className='flex items-center justify-between'>
                      <div className='flex-1'>
                        <div className='text-base font-medium mb-3'>
                          {challenge.date}
                        </div>
                        <div className='flex items-center gap-3'>
                          <Badge className='bg-background text-foreground hover:bg-main-hover transition-colors border border-gray-300 dark:border-slate-700 py-0.5 px-2 rounded-3xl'>
                            {challenge.category}
                          </Badge>
                          {challenge.isTopTen && (
                            <Badge className='bg-orange-300 hover:bg-orange-400 text-foreground border border-gray-300 dark:border-slate-700 py-0.5 px-2 rounded-3xl'>
                              Top 10
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className='text-right'>
                        <div className='text-base font-bold mb-1'>
                          {challenge.score}%
                        </div>
                        <div className='text-foreground/70 text-sm'>
                          Rank #{challenge.rank}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Block */}
      <div className='space-y-6'>
        {/* Leaderboard */}
        <Card className='bg-background text-foreground border border-border/50 py-6'>
          <CardHeader>
            <CardTitle>Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue='today' className='w-full'>
              <TabsList className='text-white grid grid-cols-3 w-full bg-main'>
                <TabsTrigger
                  className='text-foreground data-[state=active]:bg-default data-[state=active]:text-white'
                  value='today'
                >
                  Today
                </TabsTrigger>
                <TabsTrigger
                  className='text-foreground data-[state=active]:bg-default data-[state=active]:text-white'
                  value='week'
                >
                  Week
                </TabsTrigger>
                <TabsTrigger
                  className='text-foreground data-[state=active]:bg-default data-[state=active]:text-white'
                  value='allTime'
                >
                  All Time
                </TabsTrigger>
              </TabsList>
              {Object.entries(leaderboardData).map(([period, data]) => (
                <TabsContent
                  key={period}
                  value={period}
                  className='space-y-3 mt-4'
                >
                  {data.map((player) => (
                    <div
                      key={player.id}
                      className='flex items-center space-x-3 p-3 border rounded-lg hover:bg-main-hover'
                    >
                      <span className='text-lg'>
                        {badgeIcons[player.badge]}
                      </span>
                      <div className='w-8 h-8 rounded-full flex items-center justify-center text-white'>
                        <Image
                          src={player.avatar}
                          alt={player.name}
                          width={8}
                          height={8}
                          className='w-8 h-8 rounded-full flex items-center justify-center text-white'
                        />
                      </div>
                      <div className='flex-1'>
                        <p className='font-medium text-sm'>{player.name}</p>
                        <p className='text-xs text-gray-500'>{player.time}</p>
                      </div>
                      <p className='font-bold text-sm'>{player.score} pts</p>
                    </div>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Rewards & Streaks */}
        <Card className='bg-background text-foreground border border-gray-300 dark:border-slate-700 py-6'>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Trophy className='h-5 w-5' />
              <span className='text-foreground font-bold'>
                Rewards & Streaks
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div>
              <div className='flex items-center space-x-2 mb-3'>
                <Calendar className='h-4 w-4 text-blue-500' />
                <span className='font-medium text-foreground text-sm'>
                  Daily Streak
                </span>
              </div>
              <div className='flex space-x-2 mb-2'>
                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                  <div
                    key={day}
                    className={`w-8 h-8 text-foreground relative rounded-full flex items-center justify-center text-xs font-medium ${
                      day <= (players[0]?.streak || 0)
                        ? day === 7 && (players[0]?.streak || 0) >= 7
                          ? 'bg-[#f59e0b] border border-yellow-500'
                          : 'border bg-[#dbeafe] dark:bg-[#1e3a8a] dark:border-[#1d4ed8] border-[#93c5fd]'
                        : 'dark:bg-slate-700 bg-slate-200'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <p className='text-xs text-foreground/70 font-medium'>
                Current streak: {players[0].streak} days. Keep playing daily!
              </p>
            </div>

            <div>
              <div className='flex items-center space-x-2 mb-3'>
                <Flame className='h-4 w-4 text-orange-400' />
                <span className='font-medium text-foreground text-sm'>
                  Streak Rewards
                </span>
              </div>
              <div className='grid grid-cols-2 gap-2 mb-2'>
                {streakRewards
                  .filter((reward) => reward.days <= 7)
                  .map((reward) => {
                    const isCurrentStreak =
                      reward.days === (players[0]?.streak || 0)
                    const isUnlocked = reward.days <= (players[0]?.streak || 0)

                    return (
                      <div
                        key={reward.days}
                        className={`rounded-lg p-3 text-center transition-all ${
                          isCurrentStreak
                            ? 'bg-orange-400 dark:bg-orange-400 border-2 border-orange-300 dark:border-orange-200'
                            : isUnlocked
                            ? 'bg-green-500 dark:bg-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-600'
                        }`}
                      >
                        <div className='font-bold text-xs text-foreground'>
                          {reward.days} Days
                        </div>
                        <div className='text-xs text-foreground/80 mt-1'>
                          {reward.reward}
                        </div>
                        {isCurrentStreak && (
                          <div className='text-xs mt-1 font-medium text-foreground/80'>
                            Current Streak!
                          </div>
                        )}
                        {isUnlocked && !isCurrentStreak && (
                          <div className='text-xs mt-1 text-foreground'>
                            ✓ Unlocked
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>

            <div className='flex items-center gap-3 mb-8'>
              <div className='w-6 h-6 rounded-lg flex items-center justify-center'>
                <Star className='h-4 w-4 text-violet-500' />
              </div>
              <h1 className='text-medium text-foreground font-bold'>
                Daily Challenge Badges
              </h1>
            </div>

            <div className='grid grid-cols-3 gap-2'>
              {badges.map((badge) => {
                const IconComponent = badge.icon
                return (
                  <Card
                    key={badge.id}
                    className={`
                  bg-background dark:bg-slate-700 rounded-lg p-3 text-center border border-gray-300 dark:border-slate-700
                  ${!badge.unlocked ? 'opacity-60' : ''}
                `}
                  >
                    <div className='flex flex-col justify-center items-center gap-2'>
                      <div
                        className={`w-6 h-6 rounded-full  flex items-center justify-center ${badge.bgColor}`}
                      >
                        <IconComponent className={`w-4 h-4 ${badge.color}`} />
                      </div>
                      <span
                        className={`font-bold text-xs ${
                          badge.unlocked
                            ? 'text-foreground/90'
                            : 'text-foreground/70'
                        }`}
                      >
                        {badge.name}
                      </span>
                    </div>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default MainContent
