'use client'

import { useEffect, useMemo, useRef } from 'react'

import { ApiError } from '@/lib/api'
import { logger } from '@/shared/log'
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from '@/components/ui/Select'
import { useCategoriesRanked } from '@/features/categories/hooks/useCategoriesRanked'

export const HOME_CATEGORY_FILTER_ALL = '__all__'

export interface HomeCategoryFilterProps {

value: string | undefined

onChange: (next: string | undefined) => void
className?: string

ariaLabel?: string
}

export function HomeCategoryFilter({
value,
onChange,
className,
ariaLabel,
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

const orderedCategories = useMemo(
() => [...categories].sort((a, b) => a.rank - b.rank),
[categories],
  )

if (error) {
return (
<span
className={className}
data-testid='home-category-filter'
data-state='error'
aria-label={ariaLabel}
      >
All categories
      </span>
    )
  }

if (isLoading) {
return (
<Select
value={value ?? HOME_CATEGORY_FILTER_ALL}
disabled
onValueChange={() => {
          /* disabled — no-op */
        }}
      >
<SelectTrigger
className={className}
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
className={className}
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
