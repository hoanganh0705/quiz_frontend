'use client'

import { memo, useEffect, useState, useRef } from 'react'
import { Label } from '@/components/ui/Label'
import { Slider } from '@/components/ui/Slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup'
import QuizCardCompact from '@/features/quizzes/components/QuizCard/QuizCardCompact'
import { listQuizzes } from '@/features/quizzes/api'
import type { QuizResponseDto } from '@/lib/api/generated/schemas'
import type { ListQuizzesParams } from '@/features/quizzes/api'
import { Button } from '@/components/ui/Button'

interface QuizCatalogMainContentProps {
  categorySlug?: string
  searchQuery: string
}

const QuizCatalogMainContent = memo(function QuizCatalogMainContent({
  categorySlug,
  searchQuery
}: QuizCatalogMainContentProps) {
  const [quizzes, setQuizzes] = useState<QuizResponseDto[]>([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(true)
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [maxDuration, setMaxDuration] = useState<number[]>([60])
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // Fetch quizzes from API
  const fetchQuizzes = async (append = false) => {
    try {
      const params: ListQuizzesParams = {
        limit: 12,
        ...(categorySlug && { categoryId: categorySlug }),
        ...(searchQuery && { search: searchQuery }),
        ...(difficultyFilter !== 'all' && { difficulty: difficultyFilter as 'easy' | 'medium' | 'hard' }),
        ...(cursor && { cursor }),
      }

      const data = await listQuizzes(params)
      setQuizzes(prev => append ? [...prev, ...data.items] : data.items)
      setHasMore(data.pagination.hasNextPage)
      setCursor(data.pagination.nextCursor ?? undefined)
    } catch (error) {
      console.error('Failed to fetch quizzes:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    setLoading(true)
    setCursor(undefined)
    fetchQuizzes(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug, searchQuery, difficultyFilter])

  // Load more when scrolling
  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && hasMore && !loading) {
          fetchQuizzes(true)
        }
      },
      { threshold: 0.2 }
    )

    observer.observe(element)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, cursor])

  if (loading && quizzes.length === 0) {
    return (
      <div className='text-foreground'>
        <div className='flex xl:flex-row flex-col gap-7'>
          <aside className='xl:w-[16rem] w-full rounded-xl'>
            <h2 className='text-xl font-bold mb-6'>Filters</h2>
            <div className='border border-border rounded-md p-4 space-y-5'>
              <div className='h-4 w-24 bg-muted rounded animate-pulse' />
              <div className='h-4 w-24 bg-muted rounded animate-pulse' />
            </div>
          </aside>
          <div className='flex-1'>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className='rounded-lg border bg-card p-4 animate-pulse'>
                  <div className='h-48 bg-muted rounded mb-4' />
                  <div className='h-4 w-3/4 bg-muted rounded mb-2' />
                  <div className='h-4 w-1/2 bg-muted rounded' />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

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
              {quizzes.length} quizzes found
            </p>
          </div>

          {quizzes.length === 0 ? (
            <div className='text-center py-12'>
              <p className='text-muted-foreground'>No quizzes found matching your criteria.</p>
            </div>
          ) : (
            <div
              className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              role='list'
              aria-label='Quiz results'
            >
              {quizzes.map((quiz) => (
                <QuizCardCompact
                  key={quiz.quizId}
                  id={quiz.slug}
                  title={quiz.title}
                  image={quiz.imageUrl ?? '/placeholder.webp'}
                  difficulty={quiz.publishedVersion?.difficulty}
                />
              ))}
            </div>
          )}

          {hasMore && (
            <div className='mt-6 flex justify-center'>
              <Button
                variant='outline'
                onClick={() => fetchQuizzes(true)}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}

          <div ref={loadMoreRef} className='h-2' aria-hidden='true' />
        </div>
      </div>
    </div>
  )
})

export default QuizCatalogMainContent
