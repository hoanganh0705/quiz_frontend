'use client'

import type React from 'react'
import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { TextSkeleton } from '@/components/ui/loading-states/Skeletons'
import {
  Search,
  ArrowRight,
  BookOpen,
  User,
  CreditCard,
  PlusCircle,
  Trophy,
  Shield,
  Settings
} from 'lucide-react'
import { articles as staticArticles } from '@/features/support/constants/articles'
import type { ArticleIconName } from '@/features/support/types/articles'
import { useAsyncAction } from '@/shared/hooks'
import { getSupportArticles } from '@/features/support/api'
import type { SupportArticle } from '@/features/support/api'

const iconMap: Record<
  ArticleIconName,
  React.ComponentType<{ className?: string }>
> = {
  'book-open': BookOpen,
  user: User,
  'credit-card': CreditCard,
  'plus-circle': PlusCircle,
  trophy: Trophy,
  shield: Shield,
  settings: Settings
}

export function KnowledgeBase({ category }: { category?: string }) {
  const [searchQuery, setSearchQuery] = useState('')

  const { execute: loadArticles, isLoading, error } = useAsyncAction(async () => {
    return await getSupportArticles()
  })

  const [articles, setArticles] = useState<SupportArticle[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  if (!dataLoaded && !isLoading && !error) {
    loadArticles().then((result) => {
      if (result) {
        setArticles(result)
        setDataLoaded(true)
      } else {
        setArticles(staticArticles as unknown as SupportArticle[])
        setDataLoaded(true)
      }
    })
  }

  const displayArticles = dataLoaded ? articles : staticArticles as unknown as SupportArticle[]

  const filteredArticles = useMemo(() => {
    const byCategory = category && category !== 'all'
      ? displayArticles.filter(
          (a) => a.category.toLowerCase().replace(/\s+/g, '-') === category
        )
      : displayArticles

    if (!searchQuery.trim()) return byCategory

    const query = searchQuery.toLowerCase()
    return byCategory.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.excerpt?.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query)
    )
  }, [displayArticles, category, searchQuery])

  return (
    <div className='space-y-6 bg-transparent border border-border rounded-lg p-8'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <h2 className='text-2xl font-bold text-foreground'>
          All Categories Knowledge Base
        </h2>
        <div className='relative w-full sm:w-80'>
          <label htmlFor='kb-search' className='sr-only'>
            Search articles
          </label>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-secondary h-4 w-4' />
          <Input
            id='kb-search'
            aria-label='Search articles'
            placeholder='Search articles...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-10 bg-transparent border border-border text-foreground placeholder:text-muted-foreground'
          />
        </div>
      </div>

      {isLoading && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className='border border-border rounded-lg p-6 space-y-3'>
              <div className='flex items-center gap-2'>
                <TextSkeleton lines={1} className='w-20' />
                <TextSkeleton lines={1} className='w-16' />
              </div>
              <TextSkeleton lines={2} />
              <TextSkeleton lines={1} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className='text-center py-12'>
          <p className='text-destructive text-sm font-medium'>
            Failed to load articles. Please try again.
          </p>
        </div>
      )}

      {!isLoading && !error && filteredArticles.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {filteredArticles.map((article) => {
            const IconComponent = iconMap[article.icon as ArticleIconName] ?? BookOpen
            const readTime = article.readTime ?? '5 min read'
            return (
              <div
                key={article.id}
                className='group p-6 hover:bg-brand hover:border-brand transition-colors cursor-pointer border border-border rounded-lg'
              >
                <div className='flex items-center justify-between mb-4'>
                  <div className='flex items-center gap-2'>
                    <IconComponent className='h-4 w-4 text-foreground' />
                    <span className='text-xs text-foreground px-1 py-0.5 border border-border rounded-md'>
                      {article.category}
                    </span>
                  </div>
                  <span className='text-sm text-foreground-secondary'>
                    {readTime}
                  </span>
                </div>
                <h3 className='text-lg font-semibold text-foreground mb-2'>
                  {article.title}
                </h3>
                <p className='text-foreground-secondary text-sm mb-4'>
                  {article.excerpt ?? article.content ?? ''}
                </p>
                <div className='flex items-center text-foreground group-hover:text-brand-hover dark:group-hover:text-foreground transition-colors'>
                  <span className='text-sm font-medium'>Read article</span>
                  <ArrowRight className='h-4 w-4 ml-1' />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!isLoading && !error && filteredArticles.length === 0 && (
        <div className='text-center py-12'>
          <p className='text-foreground-secondary'>
            No articles found matching your search.
          </p>
        </div>
      )}
    </div>
  )
}
