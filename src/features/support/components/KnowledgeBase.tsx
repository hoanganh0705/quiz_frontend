'use client'

import type React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/Input'
import { TextSkeleton } from '@/components/ui/loading-states/Skeletons'
import { Button } from '@/components/ui/Button'
import {
  Search,
  ArrowRight,
  BookOpen,
  User,
  CreditCard,
  PlusCircle,
  Trophy,
  Shield,
  Settings,
} from 'lucide-react'
import type { ArticleIconName } from '@/features/support/types/articles'
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
  settings: Settings,
}

type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; articles: SupportArticle[] }
  | { kind: 'error'; error: Error };

/**
 * `KnowledgeBase` — searchable article grid.
 *
 * Data source is exclusively `getSupportArticles()`. If the backend
 * fails (network error, 5xx, etc.) the component surfaces an error
 * state with a retry button. There is **no** silent fallback to a
 * static fixture — that pattern was the same anti-pattern retired
 * in Phase 1 for the admin landing stats. If the backend isn't
 * reachable we say so.
 *
 * State management is intentionally a discriminated union rather
 * than the shared `useAsyncAction` helper so that the success / error
 * / loading / idle branches are exhaustive at the type level.
 */
export function KnowledgeBase({ category }: { category?: string }): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState('')
  const [state, setState] = useState<FetchState>({ kind: 'idle' })

  const fetchArticles = () => {
    setState({ kind: 'loading' })
    void getSupportArticles()
      .then((articles) => {
        setState({ kind: 'ok', articles })
      })
      .catch((error: unknown) => {
        setState({
          kind: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        })
      })
  }

  useEffect(() => {
    fetchArticles()
    // Intentional: fetch once on mount. `fetchArticles` is a stable
    // closure-local function (defined inline above) so we ignore
    // the eslint warning deliberately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRetry = () => {
    fetchArticles()
  }

  const displayArticles: SupportArticle[] = state.kind === 'ok' ? state.articles : []

  const filteredArticles = useMemo(() => {
    const byCategory =
      category && category !== 'all'
        ? displayArticles.filter(
            (a) => a.category.toLowerCase().replace(/\s+/g, '-') === category,
          )
        : displayArticles

    if (!searchQuery.trim()) return byCategory

    const query = searchQuery.toLowerCase()
    return byCategory.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        a.excerpt?.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query),
    )
  }, [displayArticles, category, searchQuery])

  const isLoading = state.kind === 'loading' || state.kind === 'idle'
  const error = state.kind === 'error' ? state.error : null

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
        <div
          className='text-center py-12 space-y-4'
          role='alert'
          data-testid='kb-error'
        >
          <p className='text-destructive text-sm font-medium'>
            Failed to load articles. Please try again.
          </p>
          <Button
            type='button'
            variant='outline'
            onClick={handleRetry}
            data-testid='kb-retry'
          >
            Retry
          </Button>
        </div>
      )}

      {state.kind === 'ok' && filteredArticles.length > 0 && (
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

      {state.kind === 'ok' && filteredArticles.length === 0 && (
        <div className='text-center py-12'>
          <p className='text-foreground-secondary'>
            No articles found matching your search.
          </p>
        </div>
      )}
    </div>
  )
}
