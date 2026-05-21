'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import {
  QuizCategoriesCard,
  TestKnowledge,
} from '@/features/categories'
import { HowItWorks } from '@/features/marketing'
import { getCategories } from '@/features/categories/api/categories'
import type { Category } from '@/features/categories/types'

function SkeletonCard() {
  return (
    <div className='animate-pulse'>
      <div className='h-48 w-full bg-muted rounded-xl' />
    </div>
  )
}

export default function QuizCategories() {
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await getCategories({ limit: 100 })
        if (!cancelled) {
          setAllCategories(data.items)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load categories',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value)
    },
    [],
  )

  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return allCategories
    const query = searchTerm.toLowerCase()
    return allCategories.filter((category) =>
      category.name.toLowerCase().includes(query),
    )
  }, [searchTerm, allCategories])

  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-4 text-foreground'>
          Quiz Categories
        </h1>
        <p className='text-foreground/70 text-base mb-6'>
          Browse all quiz categories and find quizzes that match your interests.
        </p>
        <div className='relative max-w-md'>
          <Search
            className='absolute left-3 top-1/2 -translate-y-1/2 text-foreground/70 w-5 h-5'
            aria-hidden='true'
          />
          <Input
            type='search'
            placeholder='Search categories…'
            value={searchTerm}
            onChange={handleSearchChange}
            className='pl-10 bg-background border-border text-foreground placeholder-foreground/70 focus:border-ring'
            aria-label='Search quiz categories'
            autoComplete='off'
            spellCheck={false}
          />
        </div>
      </div>

      {isLoading ? (
        <div
          className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'
          aria-label='Loading categories'
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className='text-center py-12' role='alert'>
          <p className='text-destructive text-lg mb-2'>{error}</p>
          <p className='text-foreground/60 text-sm'>
            Please check that the backend server is running at{' '}
            <code className='bg-muted px-1 rounded'>http://localhost:8080</code>
          </p>
        </div>
      ) : (
        <div
          className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'
          role='list'
          aria-label='Quiz categories'
        >
          {filteredCategories.map((category) => (
            <QuizCategoriesCard
              key={category.categoryId}
              id={category.categoryId}
              name={category.name}
              description={category.description}
              imageUrl={category.imageUrl ?? undefined}
              slug={category.slug}
            />
          ))}
        </div>
      )}

      {!isLoading && !error && filteredCategories.length === 0 && (
        <div className='text-center py-12' role='status' aria-live='polite'>
          <p className='text-foreground/70 text-lg'>
            No categories found matching your search.
          </p>
        </div>
      )}

      <TestKnowledge />
      <HowItWorks />
    </div>
  )
}
