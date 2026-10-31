'use client'

import { useEffect, useMemo, useRef } from 'react'

import { ApiError } from '@/lib/api'
import { logger } from '@/shared/log'
import { cn } from '@/shared/utils/merge-class-names'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useCategoriesRanked } from '@/features/categories/hooks/useCategoriesRanked'

export const HOME_CATEGORY_FILTER_ALL = '__all__'

export interface CategoryOption {
  categoryId: string
  name: string
  rank?: number
}

export interface HomeCategoryFilterProps {
  value: string | undefined
  onChange: (next: string | undefined) => void
  className?: string
  ariaLabel?: string
  fallbackCategories?: readonly CategoryOption[]
}

export function HomeCategoryFilter({
  value,
  onChange,
  className,
  ariaLabel,
  fallbackCategories,
}: HomeCategoryFilterProps): React.ReactElement {
  const { categories, isLoading, error } = useCategoriesRanked({
    limit: 100,
  })

  const lastReportedErrorRef = useRef<ApiError | null>(null)
  useEffect(() => {
    if (error && error !== lastReportedErrorRef.current) {
      lastReportedErrorRef.current = error
      logger.error(
        'quizzes.home-category-filter',
        'useCategoriesRanked failed',
        error,
      )
    }
    if (!error && lastReportedErrorRef.current) {
      lastReportedErrorRef.current = null
    }
  }, [error])

  const orderedCategories = useMemo(() => {
    if (categories && categories.length > 0) {
      return [...categories].sort((a, b) => a.rank - b.rank)
    }
    if (fallbackCategories && fallbackCategories.length > 0) {
      return [...fallbackCategories].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    }
    return []
  }, [categories, fallbackCategories])

  if (error && orderedCategories.length === 0) {
    return (
      <span
        className={cn(
          "inline-flex h-9 items-center rounded-full border border-border/80 bg-background/80 px-3.5 py-1 text-xs text-muted-foreground",
          className,
        )}
        data-testid='home-category-filter'
        data-state='error'
        aria-label={ariaLabel}
      >
        All categories
      </span>
    )
  }

  if (isLoading && orderedCategories.length === 0) {
    return (
      <Select
        value={value ?? HOME_CATEGORY_FILTER_ALL}
        disabled
        onValueChange={() => {
          /* disabled — no-op */
        }}
      >
        <SelectTrigger
          className={cn(
            "h-9 min-w-[145px] rounded-full border border-border/80 bg-background/80 px-3.5 py-1 text-xs sm:text-sm font-medium hover:bg-main-hover transition-colors shadow-2xs",
            className,
          )}
          aria-label={ariaLabel}
          data-testid='home-category-filter-trigger'
          data-state='loading'
        >
          <SelectValue placeholder='Loading categories…' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={HOME_CATEGORY_FILTER_ALL}>
            All categories
          </SelectItem>
        </SelectContent>
      </Select>
    )
  }

  return (
    <Select
      value={value ?? HOME_CATEGORY_FILTER_ALL}
      onValueChange={(next) => {
        onChange(next === HOME_CATEGORY_FILTER_ALL ? undefined : next)
      }}
    >
      <SelectTrigger
        className={cn(
          "h-9 min-w-[145px] rounded-full border border-border/80 bg-background/80 px-3.5 py-1 text-xs sm:text-sm font-medium hover:bg-main-hover transition-colors shadow-2xs",
          className,
        )}
        aria-label={ariaLabel}
        data-testid='home-category-filter-trigger'
        data-state='resolved'
      >
        <SelectValue placeholder='All categories' />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={HOME_CATEGORY_FILTER_ALL}>
          All categories
        </SelectItem>
        {orderedCategories.map((category) => (
          <SelectItem
            key={category.categoryId}
            value={category.categoryId}
          >
            {category.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
