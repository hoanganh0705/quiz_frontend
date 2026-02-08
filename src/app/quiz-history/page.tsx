'use client'

import { memo, useState, useMemo, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { quizHistoryEntries, quizHistoryStats } from '@/constants/quizHistory'
import type {
  QuizHistoryFilters,
  QuizHistoryEntry,
  DateRangeFilter
} from '@/types/quizHistory'
import {
  HistoryFiltersBar,
  HistoryHeader,
  HistoryStatsDashboard,
  HistoryTimeline
} from '@/components/quiz-history'

// ── Default filter state ───────────────────────────────────────────────────

const defaultFilters: QuizHistoryFilters = {
  dateRange: 'all',
  category: 'all',
  status: 'all',
  difficulty: 'all',
  sort: 'newest',
  search: ''
}

// ── Filter logic ───────────────────────────────────────────────────────────

function isWithinDateRange(date: string, range: DateRangeFilter): boolean {
  if (range === 'all') return true
  const d = new Date(date)
  const now = new Date()

  switch (range) {
    case 'today':
      return d.toDateString() === now.toDateString()
    case 'week': {
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return d >= weekAgo
    }
    case 'month': {
      const monthAgo = new Date(now)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return d >= monthAgo
    }
    case '3months': {
      const ago = new Date(now)
      ago.setMonth(ago.getMonth() - 3)
      return d >= ago
    }
    case 'year': {
      const yearAgo = new Date(now)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      return d >= yearAgo
    }
    default:
      return true
  }
}

function applyFilters(
  entries: QuizHistoryEntry[],
  filters: QuizHistoryFilters
): QuizHistoryEntry[] {
  let result = entries

  // Date range
  result = result.filter((e) =>
    isWithinDateRange(e.completedAt, filters.dateRange)
  )

  // Category
  if (filters.category !== 'all') {
    result = result.filter((e) => e.category === filters.category)
  }

  // Status
  if (filters.status !== 'all') {
    result = result.filter((e) => e.status === filters.status)
  }

  // Difficulty
  if (filters.difficulty !== 'all') {
    result = result.filter((e) => e.difficulty === filters.difficulty)
  }

  // Search
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (e) =>
        e.quizTitle.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)) ||
        e.category.toLowerCase().includes(q)
    )
  }

  // Sort
  result = [...result].sort((a, b) => {
    switch (filters.sort) {
      case 'newest':
        return (
          new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
        )
      case 'oldest':
        return (
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
        )
      case 'highest-score':
        return b.score - a.score
      case 'lowest-score':
        return a.score - b.score
      default:
        return 0
    }
  })

  return result
}

// ── Page Component ─────────────────────────────────────────────────────────

const QuizHistoryPage = memo(function QuizHistoryPage() {
  const [filters, setFilters] = useState<QuizHistoryFilters>(defaultFilters)

  const handleFilterChange = useCallback(
    (partial: Partial<QuizHistoryFilters>) => {
      setFilters((prev) => ({ ...prev, ...partial }))
    },
    []
  )

  const handleReset = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const filteredEntries = useMemo(
    () => applyFilters(quizHistoryEntries, filters),
    [filters]
  )

  const uniqueCategories = useMemo(
    () => Array.from(new Set(quizHistoryEntries.map((e) => e.category))).sort(),
    []
  )

  return (
    <div className='min-h-screen p-4 md:p-8 lg:p-12 space-y-6'>
      {/* Header with export */}
      <HistoryHeader
        totalEntries={quizHistoryEntries.length}
        filteredEntries={filteredEntries}
      />

      {/* Main content tabs */}
      <Tabs defaultValue='timeline' className='w-full'>
        <TabsList className='grid w-full grid-cols-2 bg-main max-w-md'>
          <TabsTrigger
            value='timeline'
            className='data-[state=active]:bg-default data-[state=active]:text-white'
          >
            Activity Timeline
          </TabsTrigger>
          <TabsTrigger
            value='statistics'
            className='data-[state=active]:bg-default data-[state=active]:text-white'
          >
            Statistics Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Timeline tab */}
        <TabsContent value='timeline' className='mt-6 space-y-4'>
          <HistoryFiltersBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
            categories={uniqueCategories}
          />
          <HistoryTimeline entries={filteredEntries} />
        </TabsContent>

        {/* Statistics tab */}
        <TabsContent value='statistics' className='mt-6'>
          <HistoryStatsDashboard stats={quizHistoryStats} />
        </TabsContent>
      </Tabs>
    </div>
  )
})

export default QuizHistoryPage
