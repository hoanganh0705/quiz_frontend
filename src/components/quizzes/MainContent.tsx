'use client'

import { memo, useMemo, useRef, useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import QuizCardUnified from '@/components/QuizCardUnified'
import { quizzes } from '@/constants/mockQuizzes'
import { categories } from '@/constants/categories'
import type { Quiz } from '@/types/quiz'
import { Button } from '@/components/ui/button'

interface MainContentProps {
  searchQuery: string
  selectedCategory: string
}

const MainContent = memo(function MainContent({
  searchQuery,
  selectedCategory
}: MainContentProps) {
  const [difficultyFilter, setDifficultyFilter] = useState('all')
  const [sortBy, setSortBy] = useState('most-popular')
  const [maxDuration, setMaxDuration] = useState([60])
  const [minRating, setMinRating] = useState([0])
  const [visibleCountByQuery, setVisibleCountByQuery] = useState<
    Record<string, number>
  >({})
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'all-categories') return null

    return (
      categories.find((category) => category.id === selectedCategory)?.name ??
      null
    )
  }, [selectedCategory])

  const filteredQuizzes = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    const filtered = quizzes.filter((quiz) => {
      if (
        difficultyFilter !== 'all' &&
        quiz.difficulty.toLowerCase() !== difficultyFilter
      ) {
        return false
      }

      if (selectedCategoryName) {
        const categoryMatches = quiz.categories.some(
          (category) =>
            category.toLowerCase() === selectedCategoryName.toLowerCase()
        )
        if (!categoryMatches) return false
      }

      const durationInMinutes = Math.max(1, Math.round(quiz.duration / 60))
      if (durationInMinutes > maxDuration[0]) {
        return false
      }

      if (quiz.rating < minRating[0]) {
        return false
      }

      if (!normalizedQuery) return true

      return (
        quiz.title.toLowerCase().includes(normalizedQuery) ||
        quiz.description.toLowerCase().includes(normalizedQuery) ||
        quiz.creator.name.toLowerCase().includes(normalizedQuery) ||
        quiz.categories.some((category) =>
          category.toLowerCase().includes(normalizedQuery)
        ) ||
        quiz.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      )
    })

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }

      if (sortBy === 'trending') {
        return getTrendingScore(b) - getTrendingScore(a)
      }

      return getPopularityScore(b) - getPopularityScore(a)
    })

    return sorted
  }, [
    difficultyFilter,
    maxDuration,
    minRating,
    searchQuery,
    selectedCategoryName,
    sortBy
  ])

  const queryKey = useMemo(
    () =>
      [
        searchQuery.trim().toLowerCase(),
        selectedCategory,
        difficultyFilter,
        sortBy,
        maxDuration[0],
        minRating[0]
      ].join('|'),
    [
      difficultyFilter,
      maxDuration,
      minRating,
      searchQuery,
      selectedCategory,
      sortBy
    ]
  )

  const visibleCount = visibleCountByQuery[queryKey] ?? 12

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          setVisibleCountByQuery((prev) => {
            const current = prev[queryKey] ?? 12
            return {
              ...prev,
              [queryKey]: Math.min(filteredQuizzes.length, current + 6)
            }
          })
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [filteredQuizzes.length, queryKey])

  const visibleQuizzes = filteredQuizzes.slice(0, visibleCount)

  return (
    <div className='text-foreground'>
      <div className='flex xl:flex-row flex-col gap-7'>
        <aside
          className='xl:w-[16rem] w-full rounded-xl'
          aria-label='Quiz filters'
        >
          <h2 className='text-xl font-bold mb-6'>Filters</h2>

          <div className='border border-border rounded-md p-4 space-y-5'>
            <div>
              <p className='font-semibold mb-3'>Difficulty</p>
              <RadioGroup
                value={difficultyFilter}
                onValueChange={(value) => setDifficultyFilter(value)}
                aria-label='Filter by difficulty'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='all' id='difficulty-all' />
                  <Label htmlFor='difficulty-all'>All levels</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='easy' id='difficulty-easy' />
                  <Label htmlFor='difficulty-easy'>Easy</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='medium' id='difficulty-medium' />
                  <Label htmlFor='difficulty-medium'>Medium</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='hard' id='difficulty-hard' />
                  <Label htmlFor='difficulty-hard'>Hard</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <div className='flex justify-between mb-3'>
                <p className='font-semibold'>Duration</p>
                <p className='text-sm text-foreground/70'>
                  Up to {maxDuration[0]} min
                </p>
              </div>
              <Slider
                value={maxDuration}
                onValueChange={(value) => setMaxDuration(value)}
                min={5}
                max={60}
                step={5}
                className='w-full'
                aria-label='Maximum duration in minutes'
              />
            </div>

            <div>
              <div className='flex justify-between mb-3'>
                <p className='font-semibold'>Rating</p>
                <p className='text-sm text-foreground/70'>
                  {minRating[0].toFixed(1)}+
                </p>
              </div>
              <Slider
                value={minRating}
                onValueChange={(value) => setMinRating(value)}
                min={0}
                max={5}
                step={0.5}
                className='w-full'
                aria-label='Minimum rating'
              />
            </div>

            <div>
              <p className='font-semibold mb-3'>Sort by</p>
              <RadioGroup
                value={sortBy}
                onValueChange={(value) => setSortBy(value)}
                aria-label='Sort quizzes'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='newest' id='sort-newest' />
                  <Label htmlFor='sort-newest'>Newest</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='most-popular' id='sort-popular' />
                  <Label htmlFor='sort-popular'>Most popular</Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='trending' id='sort-trending' />
                  <Label htmlFor='sort-trending'>Trending</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </aside>

        <div className='flex-1'>
          <div className='mb-6'>
            <p className='text-foreground/70 text-sm' aria-live='polite'>
              Showing {visibleQuizzes.length} of {filteredQuizzes.length}{' '}
              quizzes
            </p>
          </div>

          <div
            className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            role='list'
            aria-label='Quiz results'
          >
            {visibleQuizzes.map((quiz) => (
              <QuizCardUnified key={quiz.id} variant='detail' quiz={quiz} />
            ))}
          </div>

          {visibleCount < filteredQuizzes.length && (
            <div className='mt-6 flex justify-center'>
              <Button
                variant='outline'
                onClick={() =>
                  setVisibleCountByQuery((prev) => {
                    const current = prev[queryKey] ?? 12
                    return {
                      ...prev,
                      [queryKey]: Math.min(filteredQuizzes.length, current + 6)
                    }
                  })
                }
              >
                Load more
              </Button>
            </div>
          )}

          <div ref={loadMoreRef} className='h-2' aria-hidden='true' />
        </div>
      </div>
    </div>
  )
})

function getPopularityScore(quiz: Quiz) {
  return quiz.currentPlayers + (quiz.isPopular ? 15 : 0) + quiz.rating * 4
}

function getTrendingScore(quiz: Quiz) {
  return (
    quiz.currentPlayers * 2 +
    quiz.rating * 8 +
    quiz.quizReview.length * 3 +
    (quiz.isFeatured ? 8 : 0)
  )
}

export default MainContent
