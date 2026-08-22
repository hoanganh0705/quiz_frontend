'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { TextSkeleton } from '@/components/ui/loading-states/Skeletons'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/Accordion'
import { useAsyncAction } from '@/shared/hooks'
import { getFAQs } from '@/features/support/api'
import type { FAQCategory } from '@/features/support/api'

const CATEGORY_ID_MAP: Record<string, string> = {
  all: '',
  general: 'general',
  account: 'account',
  billing: 'billing',
  'quiz-creation': 'quiz-creation',
  tournaments: 'tournaments',
  privacy: 'privacy',
  technical: 'technical'
}

export function FAQSection({ category }: { category?: string }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<FAQCategory[]>([])

  const { execute: loadFAQs, isLoading, error } = useAsyncAction(async () => {
    return await getFAQs()
  })

  useEffect(() => {
    if (categories.length === 0 && !isLoading && !error) {
      loadFAQs().then((result) => {
        if (result) setCategories(result)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredFaqs = useMemo(() => {
    const targetCategory = CATEGORY_ID_MAP[category ?? 'all'] ?? ''

    const byCategory = targetCategory
      ? categories.filter((c) => c.id === targetCategory).flatMap((c) => c.faqs)
      : categories.flatMap((c) => c.faqs)

    if (!searchQuery.trim()) return byCategory

    const query = searchQuery.toLowerCase()
    return byCategory.filter(
      (faq) =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
    )
  }, [categories, category, searchQuery])

  return (
    <div className='bg-transparent border border-border rounded-lg p-8'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8'>
        <h2 className='text-2xl font-bold'>Frequently Asked Questions</h2>
        <div className='relative w-full sm:w-80'>
          <label htmlFor='faq-search' className='sr-only'>
            Search FAQs
          </label>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-secondary w-5 h-5' />
          <Input
            id='faq-search'
            aria-label='Search FAQs'
            placeholder='Search FAQs...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10 text-foreground placeholder-foreground/70'
          />
        </div>
      </div>

      {isLoading && (
        <div className='space-y-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='border border-border rounded-lg p-6 space-y-3'>
              <TextSkeleton lines={1} />
              <TextSkeleton lines={2} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className='text-center py-12'>
          <p className='text-destructive text-sm font-medium'>
            Failed to load FAQs. Please try again.
          </p>
        </div>
      )}

      {!isLoading && !error && filteredFaqs.length > 0 && (
        <Accordion type='single' collapsible className='space-y-4'>
          {filteredFaqs.map((faq) => (
            <AccordionItem
              key={faq.id}
              value={faq.id}
              className='bg-transparent rounded-lg border border-border'
            >
              <AccordionTrigger className='px-6 py-4 text-left hover:underline'>
                <span className='text-foreground font-medium'>
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className='px-6 pb-4 text-foreground-secondary'>
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {!isLoading && !error && filteredFaqs.length === 0 && (
        <div className='text-center py-12'>
          <p className='text-foreground-secondary'>
            No FAQs found matching your search.
          </p>
        </div>
      )}
    </div>
  )
}
