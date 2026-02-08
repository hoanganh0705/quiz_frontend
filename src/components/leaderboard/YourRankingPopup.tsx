'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Trophy,
  Star,
  TrendingUp,
  Calendar,
  Target,
  Award,
  Zap,
  Clock,
  BarChart3,
  Crown
} from 'lucide-react'
import Image from 'next/image'

interface UserRankingData {
  rank: number
  name: string
  username: string
  avatar: string
  points: number
  totalPoints: number
  level: number
  currentLevel: string
  nextLevel: string
  pointsToNextLevel: number
  currentLevelPoints: number
  nextLevelPoints: number
  badge: string
  badgeColor: string
  streak: number
  quizzesCompleted: number
  winRate: number
  averageScore: number
  bestScore: number
  totalTime: string
  achievements: Achievement[]
  recentActivity: RecentActivity[]
  seasonStats: SeasonStats
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  earnedAt: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface RecentActivity {
  id: string
  type:
    | 'quiz_completed'
    | 'achievement_earned'
    | 'level_up'
    | 'streak_milestone'
  title: string
  description: string
  points: number
  timestamp: string
}

interface SeasonStats {
  seasonRank: number
  seasonPoints: number
  seasonQuizzes: number
  seasonWinRate: number
  seasonStartDate: string
  seasonEndDate: string
}

const mockUserRanking: UserRankingData = {
  rank: 42,
  name: 'John Doe',
  username: '@johndoe',
  avatar: '/avatarPlaceholder.webp',
  points: 3250,
  totalPoints: 3250,
  level: 15,
  currentLevel: 'Silver',
  nextLevel: 'Gold',
  pointsToNextLevel: 750,
  currentLevelPoints: 250,
  nextLevelPoints: 1000,
  badge: 'Silver',
  badgeColor: 'bg-gray-500',
  streak: 7,
  quizzesCompleted: 156,
  winRate: 78.5,
  averageScore: 85.2,
  bestScore: 98,
  totalTime: '45h 32m',
  achievements: [
    {
      id: '1',
      name: 'Quiz Master',
      description: 'Complete 100 quizzes',
      icon: '🏆',
      earnedAt: '2024-01-15',
      rarity: 'rare'
    },
    {
      id: '2',
      name: 'Streak Champion',
      description: 'Maintain a 7-day streak',
      icon: '🔥',
      earnedAt: '2024-01-20',
      rarity: 'epic'
    },
    {
      id: '3',
      name: 'Perfect Score',
      description: 'Get 100% on a quiz',
      icon: '⭐',
      earnedAt: '2024-01-18',
      rarity: 'legendary'
    }
  ],
  recentActivity: [
    {
      id: '1',
      type: 'quiz_completed',
      title: 'Completed Science Quiz',
      description: 'Scored 92% in 3m 45s',
      points: 92,
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      type: 'achievement_earned',
      title: 'Earned Streak Champion',
      description: '7-day streak milestone',
      points: 50,
      timestamp: '1 day ago'
    },
    {
      id: '3',
      type: 'level_up',
      title: 'Level Up!',
      description: 'Reached Level 15',
      points: 100,
      timestamp: '2 days ago'
    }
  ],
  seasonStats: {
    seasonRank: 42,
    seasonPoints: 3250,
    seasonQuizzes: 156,
    seasonWinRate: 78.5,
    seasonStartDate: '2024-01-01',
    seasonEndDate: '2024-03-31'
  }
}

interface YourRankingPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function YourRankingPopup({ isOpen, onClose }: YourRankingPopupProps) {
  const [selectedTab, setSelectedTab] = useState<
    'overview' | 'achievements' | 'activity'
  >('overview')
  const user = mockUserRanking

  const progressPercentage =
    ((user.points - user.currentLevelPoints) /
      (user.nextLevelPoints - user.currentLevelPoints)) *
    100

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-500'
      case 'rare':
        return 'bg-blue-500'
      case 'epic':
        return 'bg-purple-500'
      case 'legendary':
        return 'bg-yellow-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz_completed':
        return <Trophy className='w-4 h-4' />
      case 'achievement_earned':
        return <Award className='w-4 h-4' />
      case 'level_up':
        return <TrendingUp className='w-4 h-4' />
      case 'streak_milestone':
        return <Zap className='w-4 h-4' />
      default:
        return <Star className='w-4 h-4' />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-hidden'>
        <DialogHeader>
          <DialogTitle className='text-xl font-bold flex items-center gap-2'>
            <Crown className='w-5 h-5 text-yellow-400' />
            Your Ranking Profile
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-6'>
          {/* User Header */}
          <div className='flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg'>
            <div className='relative'>
              <div className='w-16 h-16 rounded-full overflow-hidden'>
                <Image
                  src={user.avatar}
                  alt={user.name}
                  width={64}
                  height={64}
                  className='w-full h-full object-cover'
                />
              </div>
              <Badge
                className={`${user.badgeColor} absolute -bottom-1 -right-1 text-xs`}
              >
                {user.badge}
              </Badge>
            </div>

            <div className='flex-1'>
              <h2 className='text-xl font-bold text-white'>{user.name}</h2>
              <p className='text-slate-400'>{user.username}</p>
              <div className='flex items-center gap-4 mt-2'>
                <div className='flex items-center gap-1'>
                  <Trophy className='w-4 h-4 text-yellow-400' />
                  <span className='text-sm text-slate-300'>
                    Rank #{user.rank}
                  </span>
                </div>
                <div className='flex items-center gap-1'>
                  <Star className='w-4 h-4 text-blue-400' />
                  <span className='text-sm text-slate-300'>
                    {user.points.toLocaleString()} pts
                  </span>
                </div>
                <div className='flex items-center gap-1'>
                  <Zap className='w-4 h-4 text-orange-400' />
                  <span className='text-sm text-slate-300'>
                    {user.streak} day streak
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className='flex gap-2 border-b border-slate-700'>
            <Button
              variant={selectedTab === 'overview' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setSelectedTab('overview')}
              className={
                selectedTab === 'overview'
                  ? 'bg-default hover:bg-default-hover'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'
              }
            >
              Overview
            </Button>
            <Button
              variant={selectedTab === 'achievements' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setSelectedTab('achievements')}
              className={
                selectedTab === 'achievements'
                  ? 'bg-default hover:bg-default-hover'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'
              }
            >
              Achievements
            </Button>
            <Button
              variant={selectedTab === 'activity' ? 'default' : 'outline'}
              size='sm'
              onClick={() => setSelectedTab('activity')}
              className={
                selectedTab === 'activity'
                  ? 'bg-default hover:bg-default-hover'
                  : 'border-slate-600 text-slate-300 hover:bg-slate-700'
              }
            >
              Recent Activity
            </Button>
          </div>

          {/* Tab Content */}
          <div className='max-h-96 overflow-y-auto'>
            {selectedTab === 'overview' && (
              <div className='space-y-6'>
                {/* Level Progress */}
                <div className='space-y-3'>
                  <div className='flex items-center justify-between'>
                    <h3 className='font-semibold text-white'>Level Progress</h3>
                    <span className='text-sm text-slate-400'>
                      Level {user.level}
                    </span>
                  </div>
                  <div className='space-y-2'>
                    <div className='flex justify-between text-sm'>
                      <span className='text-slate-400'>
                        {user.currentLevel}
                      </span>
                      <span className='text-slate-400'>{user.nextLevel}</span>
                    </div>
                    <Progress value={progressPercentage} className='h-2' />
                    <p className='text-xs text-slate-400'>
                      {user.pointsToNextLevel} points to {user.nextLevel}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <div className='bg-slate-800/50 p-3 rounded-lg text-center'>
                    <div className='flex items-center justify-center mb-2'>
                      <BarChart3 className='w-5 h-5 text-blue-400' />
                    </div>
                    <p className='text-lg font-bold text-white'>
                      {user.quizzesCompleted}
                    </p>
                    <p className='text-xs text-slate-400'>Quizzes Completed</p>
                  </div>

                  <div className='bg-slate-800/50 p-3 rounded-lg text-center'>
                    <div className='flex items-center justify-center mb-2'>
                      <Target className='w-5 h-5 text-green-400' />
                    </div>
                    <p className='text-lg font-bold text-white'>
                      {user.winRate}%
                    </p>
                    <p className='text-xs text-slate-400'>Win Rate</p>
                  </div>

                  <div className='bg-slate-800/50 p-3 rounded-lg text-center'>
                    <div className='flex items-center justify-center mb-2'>
                      <Star className='w-5 h-5 text-yellow-400' />
                    </div>
                    <p className='text-lg font-bold text-white'>
                      {user.averageScore}%
                    </p>
                    <p className='text-xs text-slate-400'>Avg Score</p>
                  </div>

                  <div className='bg-slate-800/50 p-3 rounded-lg text-center'>
                    <div className='flex items-center justify-center mb-2'>
                      <Clock className='w-5 h-5 text-purple-400' />
                    </div>
                    <p className='text-lg font-bold text-white'>
                      {user.totalTime}
                    </p>
                    <p className='text-xs text-slate-400'>Total Time</p>
                  </div>
                </div>

                {/* Season Stats */}
                <div className='bg-slate-800/30 p-4 rounded-lg'>
                  <h3 className='font-semibold text-white mb-3 flex items-center gap-2'>
                    <Calendar className='w-4 h-4' />
                    Season Statistics
                  </h3>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                    <div>
                      <p className='text-slate-400'>Season Rank</p>
                      <p className='text-white font-semibold'>
                        #{user.seasonStats.seasonRank}
                      </p>
                    </div>
                    <div>
                      <p className='text-slate-400'>Season Points</p>
                      <p className='text-white font-semibold'>
                        {user.seasonStats.seasonPoints.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className='text-slate-400'>Season Quizzes</p>
                      <p className='text-white font-semibold'>
                        {user.seasonStats.seasonQuizzes}
                      </p>
                    </div>
                    <div>
                      <p className='text-slate-400'>Season Win Rate</p>
                      <p className='text-white font-semibold'>
                        {user.seasonStats.seasonWinRate}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'achievements' && (
              <div className='space-y-4'>
                <h3 className='font-semibold text-white'>Your Achievements</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {user.achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className='flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg'
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getRarityColor(
                          achievement.rarity
                        )}`}
                      >
                        {achievement.icon}
                      </div>
                      <div className='flex-1'>
                        <h4 className='font-semibold text-white'>
                          {achievement.name}
                        </h4>
                        <p className='text-sm text-slate-400'>
                          {achievement.description}
                        </p>
                        <p className='text-xs text-slate-500 mt-1'>
                          Earned{' '}
                          {new Date(achievement.earnedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        className={`${getRarityColor(
                          achievement.rarity
                        )} text-xs capitalize`}
                      >
                        {achievement.rarity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'activity' && (
              <div className='space-y-4'>
                <h3 className='font-semibold text-white'>Recent Activity</h3>
                <div className='space-y-3'>
                  {user.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className='flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg'
                    >
                      <div className='w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center'>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className='flex-1'>
                        <h4 className='font-semibold text-white'>
                          {activity.title}
                        </h4>
                        <p className='text-sm text-slate-400'>
                          {activity.description}
                        </p>
                        <p className='text-xs text-slate-500 mt-1'>
                          {activity.timestamp}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='text-sm font-semibold text-green-400'>
                          +{activity.points}
                        </p>
                        <p className='text-xs text-slate-400'>points</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className='flex justify-end gap-2 pt-4 border-t border-slate-700'>
          <Button
            variant='outline'
            onClick={onClose}
            className='border-slate-600 text-slate-300 hover:bg-slate-700'
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
