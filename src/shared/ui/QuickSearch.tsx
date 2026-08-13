'use client'

import { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Search, ArrowRight, FileText, Layers, Keyboard } from 'lucide-react'
import { sidebarItems } from '@/shared/layout'
import { listCategories } from '@/features/categories/services'
import { listQuizzes } from '@/features/quizzes/services/quizzes.service'
import type {
  CategoryResponseDto,
  QuizListItemDto,
} from '@/lib/api/generated/schemas'
import { useKeyboardShortcut } from '@/shared/hooks/use-keyboard-shortcut'
import { useLocalStorage } from '@/shared/hooks/use-local-storage'
import { logger } from '@/shared/log'

interface SearchResult {
  id: string
  title: string
  subtitle: string
  href: string
  type: 'page' | 'category' | 'quiz'
  icon: string
}

const ResultItem = memo(function ResultItem({
  result,
  isActive,
  onSelect,
  onHover
}: {
  result: SearchResult
  isActive: boolean
  onSelect: (href: string, title: string) => void
  onHover: () => void
}) {
  const typeIcon = {
    page: (
      <ArrowRight className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
    ),
    category: (
      <Layers className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
    ),
    quiz: <FileText className='h-4 w-4 text-muted-foreground' aria-hidden='true' />
  }

  return (
    <button
      type='button'
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
        isActive
          ? 'bg-primary/10 dark:bg-primary/20 text-foreground'
          : 'text-foreground/80 hover:bg-muted'
      }`}
      onClick={() => onSelect(result.href, result.title)}
      onMouseEnter={onHover}
      role='option'
      aria-selected={isActive}
    >
      <span className='text-lg shrink-0' aria-hidden='true'>
        {result.icon}
      </span>
      <div className='flex-1 min-w-0'>
        <div className='text-sm font-medium truncate'>{result.title}</div>
        <div className='text-xs text-muted-foreground truncate'>
          {result.subtitle}
        </div>
      </div>
      {typeIcon[result.type]}
    </button>
  )
})

export function QuickSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [categories, setCategories] = useState<CategoryResponseDto[]>([])
  const [quizzes, setQuizzes] = useState<QuizListItemDto[]>([])
  const [recentQueries, setRecentQueries] = useLocalStorage<string[]>(
    'quick_search_recent',
    []
  )
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [categoriesData, quizzesData] = await Promise.all([
          listCategories({ limit: 50 }),
          listQuizzes({ limit: 100 }),
        ])
        // Both endpoints return a `{ data: T[], meta: ... }` envelope
        // (see the comment in `app/(public)/page.tsx`). We fall back to
        // `[]` when `data` is missing so the search surface renders an
        // empty state instead of crashing on `categories.filter(...)`.
        setCategories(
          Array.isArray(categoriesData?.data) ? categoriesData.data : []
        )
        setQuizzes(Array.isArray(quizzesData?.data) ? quizzesData.data : [])
      } catch (error) {
        logger.error('shared.quick-search', 'Failed to fetch search data', error)
      }
    }
    fetchData()
  }, [])

  // Register Cmd/Ctrl + K shortcut
  useKeyboardShortcut(
    'k',
    useCallback(() => setOpen((prev) => !prev), []),
    { meta: true }
  )

  // Build searchable items
  const allItems = useMemo<SearchResult[]>(() => {
    const pages: SearchResult[] = sidebarItems.map((item) => ({
      id: `page-${item.href}`,
      title: item.label,
      subtitle: `Go to ${item.label}`,
      href: item.href,
      type: 'page' as const,
      icon: '📄'
    }))

    const cats: SearchResult[] = categories
      .filter((c) => c.slug)
      .map((cat) => ({
        id: `cat-${cat.categoryId}`,
        title: cat.name,
        subtitle: cat.description ?? 'Browse this category',
        href: `/categories/${cat.slug}`,
        type: 'category' as const,
        icon: '📂'
      }))

    const quizItems: SearchResult[] = quizzes.map((quiz) => ({
      id: `quiz-${quiz.quizId}`,
      title: quiz.title,
      subtitle: quiz.description ?? quiz.title,
      href: `/quizzes/${quiz.slug}`,
      type: 'quiz' as const,
      icon: '📝'
    }))

    const shortcuts: SearchResult[] = [
      {
        id: 'shortcuts-help',
        title: 'Keyboard Shortcuts',
        subtitle: 'View all keyboard shortcuts',
        href: '#shortcuts',
        type: 'page' as const,
        icon: '⌨️'
      }
    ]

    return [...pages, ...cats, ...quizItems, ...shortcuts]
  }, [categories, quizzes])

  // Filter results based on query
  const results = useMemo(() => {
    if (!query.trim()) {
      const defaultItems = allItems.filter(
        (item) => item.type === 'page' || item.id === 'shortcuts-help'
      )

      const recentItems = recentQueries
        .map((recentQuery) =>
          allItems.find(
            (item) => item.title.toLowerCase() === recentQuery.toLowerCase()
          )
        )
        .filter((item): item is SearchResult => Boolean(item))

      // Dedupe across the recent + default union. Recents are matched by
      // title against `allItems`, so any recent whose title matches a page
      // (e.g. "Home", "Quiz History") will collide with the same entry in
      // `defaultItems` unless we coalesce here. Without this dedupe React
      // logs "Encountered two children with the same key, `page-/<href>`"
      // on the first render after a sidebar item is added to recents.
      const seenIds = new Set<string>()
      return [...recentItems, ...defaultItems]
        .filter((item) => {
          if (seenIds.has(item.id)) return false
          seenIds.add(item.id)
          return true
        })
        .slice(0, 10)
    }

    const lowerQuery = query.toLowerCase()

    const scoreItem = (item: SearchResult) => {
      const title = item.title.toLowerCase()
      const subtitle = item.subtitle.toLowerCase()

      if (title === lowerQuery) return 5
      if (title.startsWith(lowerQuery)) return 4
      if (title.includes(lowerQuery)) return 3
      if (subtitle.startsWith(lowerQuery)) return 2
      if (subtitle.includes(lowerQuery)) return 1
      return 0
    }

    return allItems
      .map((item) => ({ item, score: scoreItem(item) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item)
      .slice(0, 10)
  }, [query, allItems, recentQueries])

  const clampedActiveIndex = useMemo(() => {
    if (results.length === 0) return 0
    return Math.min(activeIndex, results.length - 1)
  }, [activeIndex, results.length])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [])

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeElement = listRef.current.querySelector(
        '[aria-selected="true"]'
      )
      activeElement?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const handleSelect = useCallback(
    (href: string, selectedTitle?: string) => {
      if (selectedTitle) {
        setRecentQueries((prev) =>
          [
            selectedTitle,
            ...prev.filter(
              (recentTitle) =>
                recentTitle.toLowerCase() !== selectedTitle.toLowerCase()
            )
          ].slice(0, 5)
        )
      }

      setOpen(false)
      if (href === '#shortcuts') {
        window.dispatchEvent(new CustomEvent('open-shortcuts-modal'))
        return
      }
      router.push(href)
    },
    [router, setRecentQueries]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0))
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1))
          break
        case 'Enter':
          e.preventDefault()
          if (results[clampedActiveIndex]) {
            handleSelect(
              results[clampedActiveIndex].href,
              results[clampedActiveIndex].title
            )
          }
          break
      }
    },
    [results, clampedActiveIndex, handleSelect]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className='sm:max-w-lg p-0 gap-0 overflow-hidden'
        showCloseButton={false}
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className='sr-only'>Quick Search</DialogTitle>
        <DialogDescription className='sr-only'>
          Search across pages, quizzes, and categories. Use the arrow keys to
          navigate results and Enter to open the highlighted item.
        </DialogDescription>

        <div className='flex items-center gap-2 border-b border-border px-3'>
          <Search
            className='h-4 w-4 text-muted-foreground shrink-0'
            aria-hidden='true'
          />
          <Input
            ref={inputRef}
            type='text'
            placeholder='Search pages, quizzes, categories…'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className='border-0 shadow-none focus-visible:ring-0 h-11 text-sm placeholder:text-muted-foreground'
            aria-label='Quick search'
            aria-controls='quick-search-results'
            aria-activedescendant={
              results[clampedActiveIndex]
                ? `result-${results[clampedActiveIndex].id}`
                : undefined
            }
          />
          <kbd className='hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground'>
            ESC
          </kbd>
        </div>

        <div
          ref={listRef}
          id='quick-search-results'
          role='listbox'
          aria-label='Search results'
          className='max-h-72 overflow-y-auto p-2'
        >
          {results.length === 0 ? (
            <div className='py-8 text-center text-sm text-muted-foreground'>
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {['page', 'category', 'quiz'].map((type) => {
                const typeResults = results.filter((r) => r.type === type)
                if (typeResults.length === 0) return null
                const label =
                  type === 'page'
                    ? 'Pages'
                    : type === 'category'
                      ? 'Categories'
                      : 'Quizzes'
                return (
                  <div key={type}>
                    <div className='px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider'>
                      {label}
                    </div>
                    {typeResults.map((result) => {
                      const globalIndex = results.indexOf(result)
                      return (
                        <ResultItem
                          key={result.id}
                          result={result}
                          isActive={globalIndex === clampedActiveIndex}
                          onSelect={handleSelect}
                          onHover={() => setActiveIndex(globalIndex)}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </>
          )}
        </div>

        <div className='flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <span className='flex items-center gap-1'>
              <kbd className='rounded border border-border bg-muted px-1 py-0.5 text-[10px]'>
                ↑↓
              </kbd>
              navigate
            </span>
            <span className='flex items-center gap-1'>
              <kbd className='rounded border border-border bg-muted px-1 py-0.5 text-[10px]'>
                ↵
              </kbd>
              select
            </span>
            <span className='flex items-center gap-1'>
              <kbd className='rounded border border-border bg-muted px-1 py-0.5 text-[10px]'>
                esc
              </kbd>
              close
            </span>
          </div>
          <div className='flex items-center gap-1'>
            <Keyboard className='h-3 w-3' aria-hidden='true' />
            <span>Quick Search</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
