'use client'

import { memo } from 'react' // rerender-memo
import { Button } from '@/components/ui/button'
// Fix barrel imports (bundle-barrel-imports)
import { Select } from '@/components/ui/select'
import { SelectContent } from '@/components/ui/select'
import { SelectItem } from '@/components/ui/select'
import { SelectTrigger } from '@/components/ui/select'
import { SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { BookmarkFilter, BookmarkSortOption } from '@/types/bookmarks'
import { Search, SlidersHorizontal } from 'lucide-react'

// Hoist static data outside component (rendering-hoist-jsx)
const FILTERS: { value: BookmarkFilter; label: string }[] = [
  { value: 'all', label: 'All Bookmarks' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
] as const

const SORT_OPTIONS: { value: BookmarkSortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
  { value: 'difficulty', label: 'Difficulty' }
] as const

interface BookmarkFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  filter: BookmarkFilter
  onFilterChange: (value: BookmarkFilter) => void
  sortBy: BookmarkSortOption
  onSortChange: (value: BookmarkSortOption) => void
}

// Use memo to prevent unnecessary re-renders (rerender-memo)
const BookmarkFilters = memo(function BookmarkFilters({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  sortBy,
  onSortChange
}: BookmarkFiltersProps) {
  return (
    <div className='flex flex-col sm:flex-row gap-3 mb-6'>
      {/* Search */}
      <div className='relative flex-1'>
        <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder='Search bookmarks...'
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className='pl-9'
        />
      </div>

      {/* Quick Filters */}
      <div className='flex gap-2 flex-wrap'>
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? 'default' : 'outline'}
            size='sm'
            onClick={() => onFilterChange(f.value)}
            className={
              filter === f.value
                ? 'bg-default hover:bg-default-hover text-white'
                : ''
            }
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Sort */}
      <Select
        value={sortBy}
        onValueChange={(v) => onSortChange(v as BookmarkSortOption)}
      >
        <SelectTrigger className='w-40'>
          <SlidersHorizontal className='mr-2 h-4 w-4' />
          <SelectValue placeholder='Sort by' />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
})

export default BookmarkFilters
