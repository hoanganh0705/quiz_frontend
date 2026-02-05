'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
// Direct imports (bundle-barrel-imports)
import QuizCategoriesCard from '@/components/quizCategoriesCard'
import TestKnowledge from '@/components/categories/TestKnowledge'
import HowItWorks from '@/components/HowItWorks'
import categories from '@/constants/categories'

export default function QuizCategories() {
  const [searchTerm, setSearchTerm] = useState('')

  // Memoize search handler (rerender-functional-setstate)
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value)
    },
    []
  )

  // Memoize filtered results (js-cache-function-results)
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories
    const query = searchTerm.toLowerCase()
    return categories.filter((category) =>
      category.name.toLowerCase().includes(query)
    )
  }, [searchTerm])

  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-4 text-foreground'>
          Quiz Categories
        </h1>
        <p className='text-foreground/70 text-base mb-6'>
          Browse all quiz categories and find quizzes that match your interests.
        </p>
        {/* Search Bar - Added proper accessibility */}
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
            className='pl-10 bg-background border-slate-700 text-foreground placeholder-foreground/70 focus:border-slate-600'
            aria-label='Search quiz categories'
            autoComplete='off'
            spellCheck={false}
          />
        </div>
      </div>
      {/* Categories Grid */}
      <div
        className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'
        role='list'
        aria-label='Quiz categories'
      >
        {filteredCategories.map((category) => (
          <QuizCategoriesCard
            key={category.id}
            {...category}
            id={Number(category.id)}
          />
        ))}
      </div>
      {/* No Results - Using ternary for conditional rendering (rendering-conditional-render) */}
      {filteredCategories.length === 0 ? (
        <div className='text-center py-12' role='status' aria-live='polite'>
          <p className='text-foreground/70 text-lg'>
            No categories found matching your search.
          </p>
        </div>
      ) : null}
      <TestKnowledge />
      <HowItWorks />
    </div>
  )
}
