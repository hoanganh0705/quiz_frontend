'use client'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import QuizCategoriesCard from '@/components/quizCategoriesCard'
import TestKnowledge from '@/components/categories/TestKnowledge'
import HowItWorks from '@/components/HowItWorks'
import categories from '@/constants/categories'

export default function QuizCategories() {
  const [searchTerm, setSearchTerm] = useState('')
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-4 text-foreground'>
          Quiz Categories
        </h1>
        <p className='text-foreground/70 text-base mb-6'>
          Browse all quiz categories and find quizzes that match your interests.
        </p>
        {/* Search Bar */}
        <div className='relative max-w-md'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 text-foreground/70 w-5 h-5' />
          <Input
            type='text'
            placeholder='Search categories...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10 bg-background border-slate-700 text-foreground placeholder-foreground/70 focus:border-slate-600'
          />
        </div>
      </div>
      {/* Categories Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6'>
        {filteredCategories.map((category) => (
          <QuizCategoriesCard
            key={category.id}
            {...category}
            id={Number(category.id)}
          />
        ))}
      </div>
      {/* No Results */}
      {filteredCategories.length === 0 && (
        <div className='text-center py-12'>
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
