'use client'
import React, { useState, useMemo, useCallback, memo } from 'react'
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
import { difficultyColors } from '@/constants/difficultyColor'
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
import Link from 'next/link'
import { Tournament } from '@/types/tournament'

const FeaturedTournament = memo(function FeaturedTournament() {
  return (
    <section
      className='relative bg-linear-to-br bg-default to-indigo-950 rounded-xl p-6 md:p-10 lg:p-12 overflow-hidden shadow-lg'
      aria-labelledby='featured-title'
    >
      {/* Abstract background shapes */}
      <div className='absolute inset-0 opacity-20' aria-hidden='true'>
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
          <h2
            id='featured-title'
            className='text-xl md:text-3xl font-extrabold leading-tight text-white'
          >
            Global Knowledge Championship
          </h2>
          <p className='text-base text-white'>
            Test your knowledge against the best quiz enthusiasts from around
            the world in this premier tournament with multiple rounds of
            challenging questions.
          </p>
          <div className='flex flex-wrap items-center gap-4 text-white text-sm'>
            <div className='flex items-center gap-2'>
              <CalendarDays className='w-5 h-5' aria-hidden='true' />
              <span>May 15 - June 10, 2023</span>
            </div>
            <div className='flex items-center gap-2'>
              <Users className='w-5 h-5' aria-hidden='true' />
              <span className='tabular-nums'>1,248 participants</span>
            </div>
            <div className='flex items-center gap-2'>
              <Trophy className='w-5 h-5' aria-hidden='true' />
              <span>$5,000 prize pool</span>
            </div>
          </div>
          <Button
            className='bg-default text-white px-6 py-3 rounded-lg text-sm font-semibold flex items-center gap-2'
            aria-label='Join Global Knowledge Championship tournament'
          >
            Join Tournament
            <ArrowRight className='w-5 h-5' aria-hidden='true' />
          </Button>
        </div>

        {/* Right Section */}
        <div className='bg-default/30 backdrop-blur-sm rounded-lg p-6 space-y-6 lg:ml-auto lg:max-w-sm w-full'>
          <div className='flex items-center justify-between text-white'>
            <span>Registration closes in</span>
            <div className='flex items-center gap-1'>
              <Clock className='w-4 h-4' aria-hidden='true' />
              <span className='tabular-nums'>3 days</span>
            </div>
          </div>
          <div
            className='w-full bg-default rounded-full h-2.5'
            role='progressbar'
            aria-valuenow={70}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label='Registration progress'
          >
            <div
              className='bg-white h-2.5 rounded-full'
              style={{ width: '70%' }}
            ></div>
          </div>
          <div className='grid grid-cols-3 gap-4'>
            <div className='bg-default rounded-lg p-4 text-center'>
              <div className='text-2xl font-bold text-white tabular-nums'>
                3
              </div>
              <div className='text-white text-sm'>Rounds</div>
            </div>
            <div className='bg-default rounded-lg p-4 text-center'>
              <div className='text-2xl font-bold text-white tabular-nums'>
                15
              </div>
              <div className='text-white text-sm'>Categories</div>
            </div>
            <div className='bg-default rounded-lg p-4 text-center'>
              <div className='text-2xl font-bold text-white tabular-nums'>
                50
              </div>
              <div className='text-white text-sm'>Questions</div>
            </div>
          </div>
          <p className='text-white text-sm text-center'>
            Top 100 participants advance to the final round
          </p>
        </div>
      </div>
    </section>
  )
})

const TournamentCard = memo(function TournamentCard({
  tournament
}: {
  tournament: Tournament
}) {
  return (
    <Card
      className='bg-background border-gray-300 dark:border-slate-700 overflow-hidden'
      role='article'
      aria-labelledby={`tournament-${tournament.id}`}
    >
      <div className='relative'>
        <Image
          src={tournament.image || '/placeholder.svg'}
          alt={`${tournament.title} tournament banner`}
          width={350}
          height={200}
          className='w-full h-48 object-cover'
          loading='lazy'
        />
        <div className='absolute top-3 left-3'>
          <Badge className={`${difficultyColors[tournament.difficulty].bg}`}>
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
        <h3
          id={`tournament-${tournament.id}`}
          className='text-xl font-bold mb-2 text-foreground'
        >
          {tournament.title}
        </h3>
        <p className='text-foreground/70 text-sm mb-4 line-clamp-2'>
          {tournament.description}
        </p>

        <div className='space-y-2 mb-4'>
          <div className='flex items-center gap-2 text-foreground/70 text-sm'>
            <Tag className='w-4 h-4' aria-hidden='true' />
            <span>{tournament.category}</span>
          </div>
          <div className='flex items-center gap-2 text-foreground/70 text-sm'>
            <Calendar className='w-4 h-4' aria-hidden='true' />
            <span>{tournament.dateRange}</span>
          </div>
          <div className='flex items-center gap-2 text-foreground/70 text-sm'>
            <Users className='w-4 h-4' aria-hidden='true' />
            <span className='tabular-nums'>
              {tournament.participants} participants
            </span>
          </div>
          <div className='flex items-center gap-2 text-foreground/70 text-sm'>
            <Trophy className='w-4 h-4' aria-hidden='true' />
            <span>{tournament.prize} prize</span>
          </div>
        </div>

        {tournament.closingInfo && (
          <div className='flex items-center gap-2 dark:text-yellow-400 text-foreground text-sm mb-4'>
            <Clock className='w-4 h-4 text-yellow-500' aria-hidden='true' />
            <span>{tournament.closingInfo}</span>
          </div>
        )}

        <Button
          asChild
          className='w-full bg-default hover:bg-default-hover text-white'
        >
          <Link
            href={`/tournament/${tournament.id}`}
            aria-label={`View details for ${tournament.title}`}
          >
            View Details
            <ChevronDown
              className='w-4 h-4 ml-2 -rotate-90'
              aria-hidden='true'
            />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
})

function QuizTournament() {
  const [filter, setFilter] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Get unique categories from tournaments for tabs
  const uniqueCategories = useMemo(
    () => ['all', ...new Set(tournaments.map((t) => t.category))],
    []
  )

  const filteredTournaments = useMemo(() => {
    const now = new Date('2025-08-01')
    let filtered = [...tournaments]

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory)
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
  }, [filter, selectedCategory])

  // Handle filter changes
  const handleFilterChange = useCallback((value: string) => {
    setFilter(value)
  }, [])

  // Handle tab changes
  const handleTabChange = useCallback((value: string) => {
    setSelectedCategory(value)
  }, [])

  return (
    <main className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      <div>
        <header className='mb-8'>
          <h1 className='text-3xl font-bold mb-2'>Quiz Tournaments</h1>
          <p className='text-foreground/70 text-base'>
            Compete against other quiz enthusiasts and win amazing prizes
          </p>
        </header>

        <FeaturedTournament />
      </div>

      <div className='mt-10'>
        {/* Header */}
        <header className='flex items-center justify-between mb-8'>
          <h2 className='text-2xl font-bold'>All Tournaments</h2>
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger
              className='w-48 bg-background border-gray-300 dark:border-slate-700'
              aria-label='Filter tournaments'
            >
              <SelectValue placeholder='All Tournaments' />
            </SelectTrigger>
            <SelectContent className='bg-background border-gray-300 dark:border-slate-700'>
              <SelectItem value='all' className='text-foreground border'>
                <div className='flex items-center gap-2'>
                  <Check className='w-4 h-4' aria-hidden='true' />
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
        </header>

        {/* Category Tabs */}
        <Tabs
          value={selectedCategory}
          onValueChange={handleTabChange}
          className='mb-8 w-full'
        >
          <TabsList
            className='flex flex-nowrap gap-2 mx-2 sm:mx-0 sm:gap-3 overflow-x-auto pb-2 bg-transparent scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent'
            role='tablist'
            aria-label='Tournament categories'
          >
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
        <section
          className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'
          aria-label='Tournament listings'
        >
          {filteredTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </section>
      </div>
    </main>
  )
}

export default memo(QuizTournament)
