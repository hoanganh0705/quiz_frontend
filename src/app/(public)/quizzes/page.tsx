'use client'

import { useMemo, useState, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import FeaturedQuiz from '@/components/FeaturedQuiz'
import { categories } from '@/constants/categories'
import { quizzes } from '@/constants/mockQuizzes'
import { QuizzesMainContent } from '@/components/quizzes'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode } from 'swiper/modules'
import { useLocalStorage } from '@/hooks'
import { Search } from 'lucide-react'
import { useAppLanguage } from '@/hooks/use-app-language'

export default function QuizPlatform() {
  const { t } = useAppLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] =
    useState<string>('all-categories')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    'quiz_search_recent_v1',
    []
  )

  const suggestionPool = useMemo(() => {
    const items = quizzes.flatMap((quiz) => [
      quiz.title,
      quiz.creator.name,
      ...quiz.categories,
      ...quiz.tags
    ])

    return Array.from(new Set(items))
  }, [])

  const suggestions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) return recentSearches.slice(0, 6)

    return suggestionPool
      .filter((item) => item.toLowerCase().includes(normalizedQuery))
      .slice(0, 6)
  }, [recentSearches, searchQuery, suggestionPool])

  const saveRecentSearch = useCallback(
    (query: string) => {
      const normalized = query.trim()
      if (!normalized) return

      setRecentSearches((prev) =>
        [
          normalized,
          ...prev.filter(
            (item) => item.toLowerCase() !== normalized.toLowerCase()
          )
        ].slice(0, 8)
      )
    },
    [setRecentSearches]
  )

  const applySearchTerm = useCallback(
    (value: string) => {
      setSearchQuery(value)
      saveRecentSearch(value)
      setShowSuggestions(false)
    },
    [saveRecentSearch]
  )

  return (
    <main className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      <header className='mb-8'>
        <h1 className='text-3xl font-bold mb-2 text-foreground'>
          {t('exploreQuizzes', 'Explore Quizzes')}
        </h1>
        <p className='text-foreground/70 text-base'>
          Discover and play quizzes from our community
        </p>
      </header>

      <search className='relative mb-8 flex items-center gap-4 rounded-full'>
        <form
          className='relative flex-1'
          onSubmit={(event) => {
            event.preventDefault()
            saveRecentSearch(searchQuery)
            setShowSuggestions(false)
          }}
        >
          <label htmlFor='quiz-search' className='sr-only'>
            Search quizzes
          </label>
          <Search
            className='absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/70 w-5 h-4'
            aria-hidden='true'
          />
          <Input
            id='quiz-search'
            name='search'
            placeholder='Search quizzes by title, category, or creator…'
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              window.setTimeout(() => setShowSuggestions(false), 100)
            }}
            className='pl-10 bg-transparent border-x border-border text-foreground placeholder:text-foreground/70 h-8 placeholder:text-sm'
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className='absolute z-10 mt-2 w-full rounded-md border border-border bg-background shadow-md p-1'>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type='button'
                  className='block w-full text-left text-sm px-3 py-2 rounded-sm hover:bg-main-hover'
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applySearchTerm(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {!searchQuery && recentSearches.length > 0 && (
            <div className='mt-3 flex flex-wrap gap-2'>
              {recentSearches.slice(0, 6).map((recent) => (
                <button
                  key={recent}
                  type='button'
                  onClick={() => applySearchTerm(recent)}
                  className='text-xs px-2.5 py-1 rounded-full border border-border hover:bg-main-hover'
                >
                  {recent}
                </button>
              ))}
            </div>
          )}
        </form>
      </search>

      <nav className='mb-12 hidden sm:block' aria-label='Quiz categories'>
        <Swiper
          modules={[FreeMode]}
          spaceBetween={12}
          slidesPerView='auto'
          freeMode={true}
          className='category-swiper'
        >
          {categories.map((category) => (
            <SwiperSlide key={category.name} className='w-auto'>
              <Button
                aria-current={
                  selectedCategory === category.id ? 'true' : undefined
                }
                aria-label={`Filter by ${category.name}`}
                onClick={() => setSelectedCategory(category.id)}
                className={`whitespace-nowrap rounded-full border border-border ${
                  selectedCategory === category.id
                    ? 'bg-default hover:bg-default/90 text-white'
                    : 'bg-transparent hover:bg-main/90'
                }`}
              >
                <span className='mr-2' aria-hidden='true'>
                  {category.icon}
                </span>
                {category.name}
              </Button>
            </SwiperSlide>
          ))}
        </Swiper>
      </nav>

      <FeaturedQuiz />

      <section aria-label='Quiz listings'>
        <QuizzesMainContent
          searchQuery={searchQuery}
          selectedCategory={selectedCategory}
        />
      </section>
    </main>
  )
}
