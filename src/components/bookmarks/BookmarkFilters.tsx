'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { BookmarkFilter, BookmarkSortOption } from '@/types/bookmarks'
import { Search, SlidersHorizontal } from 'lucide-react'

interface BookmarkFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  filter: BookmarkFilter
  onFilterChange: (value: BookmarkFilter) => void
  sortBy: BookmarkSortOption
  onSortChange: (value: BookmarkSortOption) => void
}

export default function BookmarkFilters({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  sortBy,
  onSortChange
}: BookmarkFiltersProps) {
  const filters: { value: BookmarkFilter; label: string }[] = [
    { value: 'all', label: 'All Bookmarks' },
    { value: 'recent', label: 'Recently Added' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ]

  const sortOptions: { value: BookmarkSortOption; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'difficulty', label: 'Difficulty' }
  ]

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
        {filters.map((f) => (
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
          {sortOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
