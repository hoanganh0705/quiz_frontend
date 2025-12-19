'use client'
import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { difficultyColors } from '@/constants/difficultColor'
import { tournaments } from '@/constants/tournament'
import {
  CalendarDays,
  Users,
  Trophy,
  Clock,
  ArrowRight,
  Calendar,
  ChevronDown,
  Check,
  Tag
} from 'lucide-react'
import Image from 'next/image'
import { Tournament } from '@/types/tournament'

export default function QuizTournament() {
  const [filter, setFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Get unique categories from tournaments for tabs
  const uniqueCategories = [
    'all',
    ...new Set(tournaments.map((t) => t.category))
  ]

  const getFilteredTournaments = (
    filter: string,
    category: string
  ): Tournament[] => {
    const now = new Date('2025-08-01')
    let filtered = [...tournaments]

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter((t) => t.category === category)
    }

    // Filter by status
    switch (filter) {
      case 'upcoming':
        return filtered.filter((t) => new Date(t.startDate) > now)
      case 'ongoing':
        return filtered.filter(
          (t) => new Date(t.startDate) <= now && new Date(t.endDate) >= now
        )
      case 'completed':
        return filtered.filter((t) => new Date(t.endDate) < now)
      case 'registration':
        return filtered.filter((t) => t.registrationOpen)
      case 'all':
      default:
        return filtered
    }
  }

  // Handle filter changes
  const handleFilterChange = (value: string) => {
    setFilter(value)
  }

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setSelectedCategory(value)
  }

  // Get filtered tournaments
  const filteredTournaments = getFilteredTournaments(filter, selectedCategory)

  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      <div className=''>
        <h1 className='text-3xl font-bold mb-2'>Quiz Tournaments</h1>
        <p className='text-foreground/70 text-base mb-8'>
          Compete against other quiz enthusiasts and win amazing prizes
        </p>

        <div className='relative bg-linear-to-br bg-default to-indigo-950 rounded-xl p-6 md:p-10 lg:p-12 overflow-hidden shadow-lg'>
          {/* Abstract background shapes */}
          <div className='absolute inset-0 opacity-20'>
            <div className='absolute w-64 h-64 bg-default rounded-full -top-16 -left-16 blur-3xl'></div>
            <div className='absolute w-96 h-96 bg-indigo-700 rounded-full -bottom-32 -right-32 blur-3xl'></div>
            <div className='absolute w-48 h-48 bg-default rounded-full top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 blur-3xl'></div>
          </div>

          <div className='relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center'>
            {/* Left Section */}
            <div className='space-y-6'>
              <span className='inline-flex items-center rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white'>
                FEATURED
              </span>
              <h2 className='text-xl md:text-3xl font-extrabold leading-tight text-white'>
                Global Knowledge Championship
              </h2>
              <p className='text-base text-white'>
                Test your knowledge against the best quiz enthusiasts from
                around the world in this premier tournament with multiple rounds
                of challenging questions.
              </p>
              <div className='flex flex-wrap items-center gap-4 text-white text-sm'>
                <div className='flex items-center gap-2'>
                  <CalendarDays className='w-5 h-5' />
                  <span>May 15 - June 10, 2023</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Users className='w-5 h-5' />
                  <span>1,248 participants</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Trophy className='w-5 h-5' />
                  <span>$5,000 prize pool</span>
                </div>
              </div>
              <Button className='bg-default text-white px-6 py-3 rounded-lg text-sm font-semibold flex items-center gap-2'>
                Join Tournament
                <ArrowRight className='w-5 h-5' />
              </Button>
            </div>

            {/* Right Section */}
            <div className='bg-default/30 backdrop-blur-sm rounded-lg p-6 space-y-6 lg:ml-auto lg:max-w-sm w-full'>
              <div className='flex items-center justify-between text-white'>
                <span>Registration closes in</span>
                <div className='flex items-center gap-1'>
                  <Clock className='w-4 h-4' />
                  <span>3 days</span>
                </div>
              </div>
              <div className='w-full bg-default rounded-full h-2.5'>
                <div
                  className='bg-white h-2.5 rounded-full'
                  style={{ width: '70%' }}
                ></div>
              </div>
              <div className='grid grid-cols-3 gap-4'>
                <div className='bg-default rounded-lg p-4 text-center'>
                  <div className='text-2xl font-bold text-white'>3</div>
                  <div className='text-white text-sm'>Rounds</div>
                </div>
                <div className='bg-default rounded-lg p-4 text-center'>
                  <div className='text-2xl font-bold text-white'>15</div>
                  <div className='text-white text-sm'>Categories</div>
                </div>
                <div className='bg-default rounded-lg p-4 text-center'>
                  <div className='text-2xl font-bold text-white'>50</div>
                  <div className='text-white text-sm'>Questions</div>
                </div>
              </div>
              <p className='text-white text-sm text-center'>
                Top 100 participants advance to the final round
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='mt-10'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <h1 className='text-2xl font-bold'>All Tournaments</h1>
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className='w-48 bg-background border-gray-300 dark:border-slate-700'>
              <SelectValue placeholder='All Tournaments' />
            </SelectTrigger>
            <SelectContent className='bg-background border-gray-300 dark:border-slate-700'>
              <SelectItem value='all' className='text-foreground border'>
                <div className='flex items-center gap-2'>
                  <Check className='w-4 h-4' />
                  All Tournaments
                </div>
              </SelectItem>
              <SelectItem value='upcoming' className='text-foreground'>
                Upcoming
              </SelectItem>
              <SelectItem value='ongoing' className='text-foreground'>
                Ongoing
              </SelectItem>
              <SelectItem value='completed' className='text-foreground'>
                Completed
              </SelectItem>
              <SelectItem value='registration' className='text-foreground'>
                Registration Open
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Category Tabs */}
        <Tabs
          value={selectedCategory}
          onValueChange={handleTabChange}
          className='mb-8 w-full'
        >
          <TabsList className='flex flex-nowrap  gap-2 mx-2 sm:mx-0 sm:gap-3 overflow-x-auto pb-2 bg-transparent scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent'>
            {uniqueCategories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className='shrink-0 whitespace-nowrap px-2.5 py-1 text-xs sm:text-sm border-gray-300 dark:border-slate-700 rounded-full  sm:px-4 sm:py-1.5 font-medium text-foreground/70 data-[state=active]:bg-default data-[state=active]:text-white hover:bg-default-hover hover:text-white transition-all duration-200'
              >
                {category === 'all' ? 'All Categories' : category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Tournament Grid */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
          {filteredTournaments.map((tournament) => (
            <Card
              key={tournament.id}
              className='bg-background border-gray-300 dark:border-slate-700 overflow-hidden'
            >
              <div className='relative'>
                <Image
                  src={tournament.image || '/placeholder.svg'}
                  alt={tournament.title}
                  width={350}
                  height={200}
                  className='w-full h-48 object-cover'
                />
                <div className='absolute top-3 left-3'>
                  <Badge
                    className={`${difficultyColors[tournament.difficulty].bg}`}
                  >
                    {tournament.difficulty}
                  </Badge>
                </div>
                <div className='absolute top-3 right-3'>
                  <Badge className={`${tournament.statusColor} text-white`}>
                    {tournament.status}
                  </Badge>
                </div>
              </div>

              <CardContent className='p-4'>
                <h3 className='text-xl font-bold mb-2 text-foreground'>
                  {tournament.title}
                </h3>
                <p className='text-foreground/70 text-sm mb-4 line-clamp-2'>
                  {tournament.description}
                </p>

                <div className='space-y-2 mb-4'>
                  <div className='flex items-center gap-2 text-foreground/70 text-sm'>
                    <Tag className='w-4 h-4' />
                    <span>{tournament.category}</span>
                  </div>
                  <div className='flex items-center gap-2 text-foreground/70 text-sm'>
                    <Calendar className='w-4 h-4' />
                    <span>{tournament.dateRange}</span>
                  </div>
                  <div className='flex items-center gap-2 text-foreground/70 text-sm'>
                    <Users className='w-4 h-4' />
                    <span>{tournament.participants} participants</span>
                  </div>
                  <div className='flex items-center gap-2 text-foreground/70 text-sm'>
                    <Trophy className='w-4 h-4' />
                    <span>{tournament.prize} prize</span>
                  </div>
                </div>

                {tournament.closingInfo && (
                  <div className='flex items-center gap-2 dark:text-yellow-400 text-foreground text-sm mb-4'>
                    <Clock className='w-4 h-4 text-yellow-500' />
                    <span>{tournament.closingInfo}</span>
                  </div>
                )}

                <Button className='w-full bg-default hover:bg-default-hover text-white'>
                  View Details
                  <ChevronDown className='w-4 h-4 ml-2 -rotate-90' />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
