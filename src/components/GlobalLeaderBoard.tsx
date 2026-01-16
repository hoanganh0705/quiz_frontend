'use client'

import { useState } from 'react'
import {
  Search,
  ChevronDown,
  Trophy,
  Star,
  Flame,
  TrendingUp
} from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { players } from '@/constants/players'
import { Card, CardContent } from './ui/card'

const getBadgeColor = (badge: string) => {
  switch (badge) {
    case 'Diamond':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
    case 'Platinum':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
    case 'Gold':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/50'
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/50'
  }
}

export default function GlobalLeaderboard() {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('Score')
  const maxScore = Math.max(...players.map((p) => p.score || 0))

  // Filter players based on search query
  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    switch (sortBy) {
      case 'Score':
        return (b.score || 0) - (a.score || 0) // Descending
      case 'Level':
        return (b.level || 0) - (a.level || 0) // Descending
      case 'Quizzes':
        return (b.quizzes || 0) - (a.quizzes || 0) // Descending
      case 'Streak':
        return (b.streak || 0) - (a.streak || 0) // Descending
      case 'Name':
        return a.name.localeCompare(b.name) // Ascending
      default:
        return (b.score || 0) - (a.score || 0) // Default to Score
    }
  })

  return (
    <Card className='min-h-screen rounded-xl bg-background text-foreground mt-10 md:mt-20'>
      {/* Header Section */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 bg-default rounded-t-xl'>
        <div>
          <h1 className='text-xl md:text-2xl font-bold mb-2 text-white'>
            Global Leaderboard
          </h1>
          <p className='text-sm md:text-base text-white/70'>
            Compete with the best quiz masters from around the world
          </p>
        </div>
        <div className='flex flex-col sm:flex-row gap-3'>
          <Button className='bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-full px-5 py-2.5 font-medium transition-colors'>
            <Trophy className='w-5 h-5 mr-2' />
            Hall of Fame
          </Button>
          <Button className='bg-white/10 text-white hover:bg-white/20 border border-white/20 rounded-full px-5 py-2.5 font-medium transition-colors'>
            <Trophy className='w-5 h-5 mr-2' />
            Seasonal Awards
          </Button>
        </div>
      </div>

      <CardContent className='p-6 bg-transparent border-none'>
        {/* Search and Filter Section */}
        <div className='flex flex-col md:flex-row justify-between items-center gap-4 mb-8'>
          {/* Search */}
          <div className='relative w-full md:w-1/3'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5' />
            <Input
              type='text'
              placeholder='Search players...'
              className='w-full pl-10 pr-4 py-2.5 rounded-lg bg-transparent border border-foreground/20 text-foreground placeholder-foreground/50 focus:ring-0.5 focus:ring-default focus:border-transparent'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label='Search players'
            />
          </div>

          {/* Filter */}
          <div className='flex gap-3 w-full md:w-auto justify-end'>
            <DropdownMenu>
              <DropdownMenuTrigger
                className='border-gray-300 dark:border-slate-700 border text-foreground'
                asChild
              >
                <Button className='bg-transparent text-foreground border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2.5 flex items-center gap-2 font-medium'>
                  Sort by: {sortBy}
                  <ChevronDown className='w-4 h-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='bg-main  text-foreground '>
                {['Score', 'Level', 'Quizzes', 'Streak', 'Name'].map(
                  (option) => (
                    <DropdownMenuItem
                      key={option}
                      className='text-foreground cursor-pointer data-highlighted:bg-default-hover'
                      onClick={() => setSortBy(option)}
                    >
                      {option}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger
                className='border-gray-300 dark:border-slate-700 border text-foreground'
                asChild
              >
                <Button className='bg-transparent text-foreground border border-gray-300 dark:border-slate-700 rounded-lg px-4 py-2.5 flex items-center gap-2 font-medium'>
                  All Time
                  <ChevronDown className='w-4 h-4' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='bg-main border text-foreground'>
                {['All Time', 'Last Month', 'Last Week'].map((option) => (
                  <DropdownMenuItem
                    key={option}
                    className='text-foreground hover:bg-default-hover cursor-pointer'
                  >
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className='rounded-xl overflow-hidden border border-foreground/20'>
          {/* Table Header */}
          <div className='grid grid-cols-[60px_2fr_1.5fr_1fr_1fr_1fr] md:grid-cols-[60px_2fr_1.5fr_1fr_1fr_1fr] gap-4 p-4 bg-main text-foreground font-semibold border-b border-foreground/20 text-sm md:text-base'>
            <div className='text-center'>Rank</div>
            <div>User</div>
            <div>Score</div>
            <div>Level</div>
            <div>Quizzes</div>
            <div>Badge</div>
          </div>

          {/* Table Rows */}
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className='grid grid-cols-[60px_2fr_1.5fr_1fr_1fr_1fr] md:grid-cols-[60px_2fr_1.5fr_1fr_1fr_1fr] gap-4 p-4 border-b border-foreground/20 last:border-b-0 items-center text-sm md:text-base hover:bg-foreground/10 transition-colors'
            >
              {/* Rank */}
              <div className='flex justify-center items-center'>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                ${
                  index === 0
                    ? 'bg-amber-500 text-white'
                    : index === 1
                    ? 'bg-gray-400 text-white'
                    : index === 2
                    ? 'bg-orange-600 text-white'
                    : 'bg-background text-foreground/80 border'
                }
              `}
                >
                  {index + 1}
                </div>
              </div>

              {/* User */}
              <div className='flex items-center gap-3'>
                <Avatar className='w-10 h-10 border border-foreground/20'>
                  <AvatarImage
                    src={player.avatar || '/placeholder.svg'}
                    alt={`${player.name}'s avatar`}
                  />
                  <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className='flex flex-col'>
                  <span className='font-semibold'>{player.name}</span>
                  <span className='text-foreground/50 text-xs flex items-center gap-1'>
                    {player.country}{' '}
                    <Flame className='w-3 h-3 text-orange-400' />{' '}
                    {player.streak} streak
                  </span>
                </div>
              </div>

              {/* Score */}
              <div className='flex flex-col items-start'>
                <span className='font-semibold mb-1'>
                  {player.score?.toLocaleString() || 0}
                </span>
                <div className='w-full h-2 rounded-full bg-foreground/20'>
                  <div
                    className='h-full rounded-full transition-all'
                    style={{
                      width: `${((player.score || 0) / maxScore) * 100}%`,
                      background:
                        index === 0
                          ? 'bg-amber-500'
                          : index === 1
                          ? 'bg-gray-400'
                          : index === 2
                          ? 'bg-orange-600'
                          : 'bg-foreground/20'
                    }}
                  />
                </div>
              </div>

              {/* Level */}
              <div className='flex items-center gap-1'>
                <Star className='w-4 h-4 fill-amber-400 text-amber-400' />
                <span>{player.level}</span>
              </div>

              {/* Quizzes */}
              <div className='flex flex-col items-start'>
                <span className='font-semibold'>{player.quizzes}</span>
                <span className='text-xs text-emerald-400 flex items-center gap-1'>
                  <TrendingUp className='w-3 h-3 text-emerald-400' /> Active
                </span>
              </div>

              {/* Badge */}
              <div>
                <Button
                  variant='outline'
                  className={`rounded-full px-3 py-1 h-auto text-xs font-medium flex items-center gap-1 bg-transparent
                ${getBadgeColor(player.badge || 'Gold')}
              `}
                >
                  <Trophy className='w-3 h-3' />
                  {player.badge}
                </Button>
              </div>
            </div>
          ))}
          <div className='text-sm p-5 flex flex-row justify-between items-center'>
            <span>Showing 1-10 of {sortedPlayers.length} players</span>
            <div className='flex items-center gap-2'>
              <Button
                className='rounded-full px-4 py-2 h-auto text-sm font-medium bg-transparent  hover:bg-foreground/10 border border-foreground/20 disabled:opacity-50'
                disabled
              >
                Previous
              </Button>
              <Button className='rounded-full px-4 py-2 h-auto text-sm font-medium bg-transparent hover:bg-foreground/10 border border-foreground/20'>
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
