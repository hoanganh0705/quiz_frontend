'use client'

import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, RotateCcw } from 'lucide-react'
import type {
  QuizHistoryFilters,
  DateRangeFilter,
  SortOption,
  QuizResultStatus
} from '@/types/quizHistory'

interface HistoryFiltersProps {
  filters: QuizHistoryFilters
  onFilterChange: (filters: Partial<QuizHistoryFilters>) => void
  onReset: () => void
  categories: string[]
}

export const HistoryFiltersBar = memo(function HistoryFiltersBar({
  filters,
  onFilterChange,
  onReset,
  categories
}: HistoryFiltersProps) {
  return (
    <Card className='bg-background border border-gray-300 dark:border-slate-700'>
      <CardContent className='p-4'>
        <div className='flex flex-col gap-4'>
          {/* Search */}
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search quizzes by title or tag...'
              value={filters.search}
              onChange={(e) => onFilterChange({ search: e.target.value })}
              className='pl-10 bg-background'
            />
          </div>

          {/* Filter row */}
          <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
            {/* Date range */}
            <Select
              value={filters.dateRange}
              onValueChange={(v) =>
                onFilterChange({ dateRange: v as DateRangeFilter })
              }
            >
              <SelectTrigger className='bg-background'>
                <SelectValue placeholder='Date range' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Time</SelectItem>
                <SelectItem value='today'>Today</SelectItem>
                <SelectItem value='week'>This Week</SelectItem>
                <SelectItem value='month'>This Month</SelectItem>
                <SelectItem value='3months'>Last 3 Months</SelectItem>
                <SelectItem value='year'>This Year</SelectItem>
              </SelectContent>
            </Select>

            {/* Category */}
            <Select
              value={filters.category}
              onValueChange={(v) => onFilterChange({ category: v })}
            >
              <SelectTrigger className='bg-background'>
                <SelectValue placeholder='Category' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Result status */}
            <Select
              value={filters.status}
              onValueChange={(v) =>
                onFilterChange({ status: v as QuizResultStatus | 'all' })
              }
            >
              <SelectTrigger className='bg-background'>
                <SelectValue placeholder='Result' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Results</SelectItem>
                <SelectItem value='passed'>Passed</SelectItem>
                <SelectItem value='failed'>Failed</SelectItem>
                <SelectItem value='abandoned'>Abandoned</SelectItem>
              </SelectContent>
            </Select>

            {/* Difficulty */}
            <Select
              value={filters.difficulty}
              onValueChange={(v) =>
                onFilterChange({
                  difficulty: v as 'Easy' | 'Medium' | 'Hard' | 'all'
                })
              }
            >
              <SelectTrigger className='bg-background'>
                <SelectValue placeholder='Difficulty' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Difficulties</SelectItem>
                <SelectItem value='Easy'>Easy</SelectItem>
                <SelectItem value='Medium'>Medium</SelectItem>
                <SelectItem value='Hard'>Hard</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={filters.sort}
              onValueChange={(v) => onFilterChange({ sort: v as SortOption })}
            >
              <SelectTrigger className='bg-background'>
                <SelectValue placeholder='Sort by' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='newest'>Newest First</SelectItem>
                <SelectItem value='oldest'>Oldest First</SelectItem>
                <SelectItem value='highest-score'>Highest Score</SelectItem>
                <SelectItem value='lowest-score'>Lowest Score</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active filters & reset */}
          <div className='flex items-center justify-between'>
            <p className='text-xs text-muted-foreground'>
              Showing filtered results
            </p>
            <Button
              variant='ghost'
              size='sm'
              onClick={onReset}
              className='text-xs gap-1.5'
            >
              <RotateCcw className='h-3 w-3' />
              Reset Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
