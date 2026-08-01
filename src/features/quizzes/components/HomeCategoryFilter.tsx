'use client'

/**
 * `<HomeCategoryFilter />` — single-category dropdown slot primitive
 * for the trending + popular rails on the home page.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.B2.
 *
 * The primitive is narrower than the global `<FilterBar />` slot from
 * Story 3.5 C3: it picks ONE category (or "All categories") per rail,
 * driven by the per-rail `useHomeCategoryStore` slice
 * (`trendingCategoryId` / `popularCategoryId`).
 *
 * Each rail (TKT-3.7.C5 / TKT-3.7.C6) supplies its own `value` /
 * `onChange` from the store — the primitive does NOT know which
 * field it controls. That keeps the primitive reusable across the
 * two rails without coupling the slot to the store layout.
 *
 * ## Three states
 *
 * - **resolved.** `useCategoriesRanked` returned a non-empty list.
 *   Render a `<Select />` with the "All categories" affordance +
 *   every category as an option.
 * - **loading.** `useCategoriesRanked.isLoading === true`. Render a
 *   disabled `<Select />` with the placeholder copy "Loading
 *   categories…". The rail's loading skeleton handles the rest of
 *   the rail — this slot only signals that the dropdown is
 *   currently inert.
 * - **error.** `useCategoriesRanked.error !== null`. Render a static,
 *   non-interactive label "All categories" (no dropdown — the rail's
 *   error state surfaces the inline retry). The error is logged via
 *   `console.error` so developer tooling can pick it up; the rail's
 *   error UI surfaces the actual retry. We deliberately do NOT
 *   silently swallow the error.
 */

import { useEffect, useMemo, useRef } from 'react'

import { ApiError } from '@/lib/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useCategoriesRanked } from '@/features/categories/hooks/useCategoriesRanked'

/**
 * Discriminator used in the `<Select />` value to represent the
 * "All categories" affordance. The empty string is the canonical
 * mapping back to `undefined` (Story 3.5 C3 uses the same convention).
 */
export const HOME_CATEGORY_FILTER_ALL = ''

export interface HomeCategoryFilterProps {
  /**
   * Currently selected categoryId. `undefined` means "All categories".
   */
  value: string | undefined
  /**
   * Called when the user picks a category. `undefined` means the
   * user picked "All categories".
   */
  onChange: (next: string | undefined) => void
  className?: string
  /**
   * Optional accessible label for the select trigger. When omitted,
   * the trigger falls back to the visible placeholder copy.
   */
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

  // Stable error log — only fires when the error transition happens,
  // not on every render. Per cross-story contract rule #3 the
  // component must surface ApiError to console.error; we hold a
  // ref to the last reported error so we don't spam the console.
  const lastReportedErrorRef = useRef<ApiError | null>(null)
  useEffect(() => {
    if (error && error !== lastReportedErrorRef.current) {
      lastReportedErrorRef.current = error
      console.error(
        '[HomeCategoryFilter] useCategoriesRanked failed:',
        error,
      )
    }
    if (!error && lastReportedErrorRef.current) {
      lastReportedErrorRef.current = null
    }
  }, [error])

  // Stable ordering — the ranked endpoint already orders by `rank`,
  // but a defensive sort here keeps the order stable if the
  // backend ever drops the rank field.
  const orderedCategories = useMemo(
    () => [...categories].sort((a, b) => a.rank - b.rank),
    [categories],
  )

  // Error state — no dropdown, just a static label.
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

  // Loading state — disabled select with placeholder copy.
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

  // Resolved state — populated dropdown.
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
