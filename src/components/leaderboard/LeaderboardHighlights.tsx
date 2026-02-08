'use client'

import { useState, useEffect, memo } from 'react'
// Fix barrel imports (bundle-barrel-imports)
import { Card } from '@/components/ui/card'
import { CardContent } from '@/components/ui/card'
import { CardHeader } from '@/components/ui/card'
import { CardTitle } from '@/components/ui/card'
import { CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SelectContent } from '@/components/ui/select'
import { SelectItem } from '@/components/ui/select'
import { SelectTrigger } from '@/components/ui/select'
import { SelectValue } from '@/components/ui/select'
import { Tabs } from '@/components/ui/tabs'
import { TabsContent } from '@/components/ui/tabs'
import { TabsList } from '@/components/ui/tabs'
import { TabsTrigger } from '@/components/ui/tabs'
import {
  Globe,
  BarChart3,
  TrendingUp,
  Calendar,
  Clock,
  Trophy
} from 'lucide-react'
import GlobalTab from './leaderboard-highlights/GlobalTab'
import CategoryTab from './leaderboard-highlights/CategoryTab'
import TrendingTab from './leaderboard-highlights/TrendingTab'

// Shared interfaces and mock data
interface LeaderboardUser {
  id: string
  rank: number
  name: string
  username: string
  points: number
  avatar: string
  badge: 'Diamond' | 'Platinum' | 'Gold' | 'Silver' | 'Bronze'
  badgeColor: string
  borderColor: string
  rankBgColor: string
  rankTextColor: string
  stars: number
  streak: number
  quizzesCompleted: number
  winRate: number
  change: number
  category?: string
  isOnline?: boolean
  lastActive?: string
}

interface Category {
  id: string
  name: string
  icon: string
  color: string
  totalUsers: number
}

// Hoist mock data outside component (data-hoisting)
const mockUsers: LeaderboardUser[] = [
  {
    id: '1',
    rank: 1,
    name: 'Alex Chen',
    username: '@alexchen',
    points: 15420,
    avatar: '/avatarPlaceholder.webp',
    badge: 'Diamond',
    badgeColor: 'bg-blue-600 hover:bg-blue-700',
    borderColor: 'border-yellow-400',
    rankBgColor: 'bg-yellow-400',
    rankTextColor: 'text-black',
    stars: 5,
    streak: 12,
    quizzesCompleted: 245,
    winRate: 94.2,
    change: 0,
    isOnline: true,
    lastActive: '2 minutes ago'
  },
  {
    id: '2',
    rank: 2,
    name: 'Sarah Kim',
    username: '@sarahkim',
    points: 14850,
    avatar: '/avatarPlaceholder.webp',
    badge: 'Diamond',
    badgeColor: 'bg-blue-600 hover:bg-blue-700',
    borderColor: 'border-gray-400',
    rankBgColor: 'bg-gray-400',
    rankTextColor: 'text-black',
    stars: 5,
    streak: 8,
    quizzesCompleted: 198,
    winRate: 91.8,
    change: 1,
    isOnline: false,
    lastActive: '1 hour ago'
  },
  {
    id: '3',
    rank: 3,
    name: 'Mike Johnson',
    username: '@mikejohnson',
    points: 13920,
    avatar: '/avatarPlaceholder.webp',
    badge: 'Diamond',
    badgeColor: 'bg-blue-600 hover:bg-blue-700',
    borderColor: 'border-orange-400',
    rankBgColor: 'bg-orange-400',
    rankTextColor: 'text-black',
    stars: 4,
    streak: 15,
    quizzesCompleted: 167,
    winRate: 89.5,
    change: -1,
    isOnline: true,
    lastActive: '5 minutes ago'
  },
  {
    id: '4',
    rank: 4,
    name: 'Emma Wilson',
    username: '@emmawilson',
    points: 13280,
    avatar: '/avatarPlaceholder.webp',
    badge: 'Platinum',
    badgeColor: 'bg-slate-600',
    borderColor: 'border-slate-400',
    rankBgColor: 'bg-slate-400',
    rankTextColor: 'text-white',
    stars: 4,
    streak: 6,
    quizzesCompleted: 189,
    winRate: 87.3,
    change: 2,
    isOnline: true,
    lastActive: '10 minutes ago'
  },
  {
    id: '5',
    rank: 5,
    name: 'David Park',
    username: '@davidpark',
    points: 12890,
    avatar: '/avatarPlaceholder.webp',
    badge: 'Platinum',
    badgeColor: 'bg-slate-600',
    borderColor: 'border-slate-400',
    rankBgColor: 'bg-slate-400',
    rankTextColor: 'text-white',
    stars: 4,
    streak: 9,
    quizzesCompleted: 156,
    winRate: 85.7,
    change: -1,
    isOnline: false,
    lastActive: '3 hours ago'
  }
]

const categoryUsers: Record<string, LeaderboardUser[]> = {
  coding: [
    { ...mockUsers[0], category: 'coding', rank: 1 },
    { ...mockUsers[2], category: 'coding', rank: 2 },
    { ...mockUsers[4], category: 'coding', rank: 3 }
  ],
  design: [
    { ...mockUsers[1], category: 'design', rank: 1 },
    { ...mockUsers[3], category: 'design', rank: 2 },
    { ...mockUsers[0], category: 'design', rank: 3 }
  ],
  marketing: [
    { ...mockUsers[3], category: 'marketing', rank: 1 },
    { ...mockUsers[1], category: 'marketing', rank: 2 },
    { ...mockUsers[2], category: 'marketing', rank: 3 }
  ]
}

const trendingUsers: LeaderboardUser[] = [
  { ...mockUsers[3], rank: 1, change: 5 },
  { ...mockUsers[4], rank: 2, change: 3 },
  { ...mockUsers[0], rank: 3, change: 0 }
]

const categories: Category[] = [
  {
    id: 'coding',
    name: 'Coding',
    icon: '💻',
    color: 'text-blue-400',
    totalUsers: 1247
  },
  {
    id: 'design',
    name: 'Design',
    icon: '🎨',
    color: 'text-purple-400',
    totalUsers: 892
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: '📈',
    color: 'text-green-400',
    totalUsers: 654
  },
  {
    id: 'science',
    name: 'Science',
    icon: '🔬',
    color: 'text-red-400',
    totalUsers: 445
  },
  {
    id: 'history',
    name: 'History',
    icon: '📚',
    color: 'text-yellow-400',
    totalUsers: 334
  }
]

const TIME_PERIODS = [
  {
    value: 'all-time',
    label: 'All Time',
    icon: null
  },
  {
    value: 'monthly',
    label: 'Monthly',
    icon: Calendar
  },
  {
    value: 'weekly',
    label: 'Weekly',
    icon: Calendar
  },
  {
    value: 'daily',
    label: 'Daily',
    icon: Clock
  }
]

type TimePeriod = 'all-time' | 'monthly' | 'weekly' | 'daily'
type ActiveTab = 'global' | 'category' | 'trending'

export const LeaderboardHighlights = memo(function LeaderboardHighlights() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('global')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all-time')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [users] = useState<LeaderboardUser[]>(mockUsers)

  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [activeTab, timePeriod, selectedCategory])

  return (
    <Card className=' bg-background border border-gray-300 dark:border-slate-700 col-span-2 lg:col-span-2 py-4 sm:py-6'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-foreground text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2'>
              <Trophy
                className='w-5 h-5 sm:w-6 sm:h-6 text-yellow-400'
                aria-hidden='true'
              />
              Leaderboard Highlights
            </CardTitle>
            <CardDescription className='text-foreground/80 text-sm sm:text-base'>
              Top performers across different categories and time periods
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className='space-y-4 sm:space-y-6'>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ActiveTab)}
          className='w-full'
        >
          <TabsList
            className='grid w-full grid-cols-3 bg-[#e5eaee] dark:bg-slate-700 mb-4'
            role='tablist'
            aria-label='Leaderboard views'
          >
            <TabsTrigger
              value='global'
              className='data-[state=active]:bg-background text-xs sm:text-sm'
            >
              <Globe
                className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2'
                aria-hidden='true'
              />
              Global
            </TabsTrigger>
            <TabsTrigger
              value='category'
              className='data-[state=active]:bg-background text-xs sm:text-sm'
            >
              <BarChart3
                className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2'
                aria-hidden='true'
              />
              By Category
            </TabsTrigger>
            <TabsTrigger
              value='trending'
              className='data-[state=active]:bg-background text-xs sm:text-sm'
            >
              <TrendingUp
                className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2'
                aria-hidden='true'
              />
              Trending
            </TabsTrigger>
          </TabsList>

          <div
            className='flex flex-wrap gap-2'
            role='toolbar'
            aria-label='Time period filters'
          >
            {TIME_PERIODS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={timePeriod === value ? 'default' : 'outline'}
                size='sm'
                onClick={() => setTimePeriod(value as TimePeriod)}
                className={`text-xs sm:text-sm ${
                  timePeriod === value
                    ? 'bg-default hover:bg-default-hover'
                    : 'dark:border-slate-600 text-foreground/80 dark:hover:bg-slate-700 border border-gray-300 hover:bg-default-hover'
                }`}
              >
                {Icon && (
                  <Icon className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2' />
                )}
                {label}
              </Button>
            ))}
          </div>

          {activeTab === 'category' && (
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className='w-full bg-main border border-gray-300 dark:border-slate-700 text-foreground text-xs sm:text-sm mb-20'>
                <SelectValue placeholder='Select category' />
              </SelectTrigger>
              <SelectContent className=' bg-main border border-gray-300 dark:border-slate-700 text-xs sm:text-sm'>
                <SelectItem value='all'>All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className='flex items-center gap-2'>
                      <span className='text-lg'>{category.icon}</span>
                      <span className='text-foreground/80 text-xs'>
                        {category.name}
                      </span>
                      <span className='text-foreground/80 text-xs'>
                        ({category.totalUsers})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {isLoading && (
            <div
              className='flex items-center justify-center py-8'
              role='status'
              aria-label='Loading leaderboard data'
            >
              <div
                className='animate-spin rounded-full h-8 w-8 border-b-2 border-white'
                aria-hidden='true'
              ></div>
            </div>
          )}

          <TabsContent value='global' className='mt-20'>
            <GlobalTab users={users} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value='category'>
            <CategoryTab
              users={users}
              isLoading={isLoading}
              category={selectedCategory}
            />
          </TabsContent>
          <TabsContent value='trending'>
            <TrendingTab users={trendingUsers} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
})

export { mockUsers, categoryUsers, trendingUsers, categories }
export type { LeaderboardUser, Category }
