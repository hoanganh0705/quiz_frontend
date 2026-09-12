'use client'

/**
 * `<InterestSelectionStep />` — onboarding step that lets the
 * viewer pick the categories they care about.
 *
 * Source epic:   Phase 4 (F-2 in the remaining-gaps plan) — replace
 *                the hardcoded `categories` constant in
 *                `features/categories/constants/categories.ts` with
 *                the real `/categories/popular` endpoint, surfaced
 *                through `useCategoriesRanked`.
 * Source ticket: F-2.
 *
 * ## Honest-data contract
 *
 * Per the plan: "If the API call fails, show an explicit error message
 * — do NOT silently fall back to the hardcoded constant." This
 * component:
 *
 *   1. **Loading** → renders the category grid as a 4×5 skeleton so
 *      the layout doesn't shift when the payload lands.
 *   2. **Error** → renders an explicit `role="alert"` error with a
 *      retry affordance. We DO NOT silently substitute the
 *      hardcoded `categories` constant — that was the precise
 *      "fake stats" problem the plan asks us to retire.
 *   3. **Empty** → renders a "No categories yet" panel. The plan
 *      did not enumerate this case explicitly but it is the honest
 *      fallback for an empty API response.
 *   4. **Ok** → maps the `RankedCategoryResponseDto` items into
 *      `{ id, name, icon, count }` view-model rows.
 *
 * ## `count` source
 *
 * The plan asks us to map `quizCount` onto `count`. The actual
 * `RankedCategoryResponseDto` payload exposes `totalAttempts` (the
 * total number of quiz attempts across linked active quizzes in the
 * category). We use `totalAttempts` as the closest real-data proxy
 * for "how popular" a category is — same intent, no fake numbers.
 *
 * ## Icon source
 *
 * The backend does not surface a per-category icon. We derive one
 * from the category slug via the static `SLUG_TO_ICON` map in
 * `./category-icon-map.ts`. Unknown slugs fall back to a generic
 * category emoji.
 */

import { AlertCircle, ArrowLeft, ArrowRight, Check, RefreshCw } from 'lucide-react'
import { memo, useCallback, useMemo } from 'react'

import { Button } from '@/components/ui/Button'
import { useCategoriesRanked } from '@/features/categories/hooks/useCategoriesRanked'
import { getCategoryIcon } from '@/features/onboarding/lib/category-icon-map'
import { cn } from '@/shared/utils/merge-class-names'
import type { RankedCategoryResponseDto } from '@/lib/api/generated/schemas'
import { ApiError } from '@/lib/api'

interface InterestSelectionStepProps {
  selectedInterests: string[]
  onUpdateInterests: (interests: string[]) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

interface SelectableCategory {
  id: string
  name: string
  icon: string
  count: number
}

const CATEGORY_LIMIT = 20

function parseTotalAttempts(value: string | number | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0
  }
  return 0
}

function toSelectableCategories(
  ranked: readonly RankedCategoryResponseDto[],
): readonly SelectableCategory[] {
  return ranked
    .filter((row) => row.categoryId !== null && row.categoryId !== undefined)
    .slice(0, CATEGORY_LIMIT)
    .map((row) => ({
      id: row.categoryId,
      name: row.name ?? row.slug ?? row.categoryId,
      icon: getCategoryIcon(row.slug ?? row.categoryId),
      count: parseTotalAttempts(row.totalAttempts),
    }))
}

function isTransient5xx(error: ApiError | null): boolean {
  return error !== null && error.status >= 500
}

function CategoryGridSkeleton() {
  // 4 columns × 5 rows = 20 placeholder cells.
  return (
    <div
      data-testid='interest-selection-skeleton'
      role='status'
      aria-busy={true}
      aria-label='Loading categories'
      className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
    >
      {Array.from({ length: CATEGORY_LIMIT }).map((_, idx) => (
        <div
          key={`skeleton-${idx}`}
          className='h-[7.5rem] rounded-xl border border-border bg-muted/40 animate-pulse'
          aria-hidden='true'
        />
      ))}
    </div>
  )
}

function CategoryErrorState({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const transient = isTransient5xx(error)
  return (
    <div
      data-testid='interest-selection-error'
      role='alert'
      className={`flex items-start gap-3 rounded-md border px-4 py-3 text-sm ${
        transient
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-border bg-muted/50 text-foreground/80'
      }`}
    >
      <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
      <div className='flex-1 space-y-2'>
        <p>
          {transient
            ? "We're having trouble loading the category list. Please try again in a moment."
            : 'The category list is unavailable right now. Onboarding cannot continue without it.'}
        </p>
        <button
          type='button'
          onClick={onRetry}
          className='inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'
          aria-label='Retry loading categories'
        >
          <RefreshCw className='h-3 w-3' aria-hidden='true' />
          Retry
        </button>
      </div>
    </div>
  )
}

function CategoryEmptyState() {
  return (
    <div
      data-testid='interest-selection-empty'
      role='status'
      className='flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground'
    >
      <p className='font-medium text-foreground'>No categories available yet.</p>
      <p>Once categories are created you can pick the ones you care about.</p>
    </div>
  )
}

export const InterestSelectionStep = memo(function InterestSelectionStep({
  selectedInterests,
  onUpdateInterests,
  onNext,
  onBack,
  onSkip,
}: InterestSelectionStepProps) {
  // `useSWR`'s default `mutate` is exposed through the hook return in
  // some variants; for `useCategoriesRanked` it isn't surfaced yet, so
  // we trigger a re-render via SWR's global cache by remounting the
  // hook via a `retryKey` state in the parent? No — simpler: use
  // `useCategoriesRanked`'s `error` to decide between rendering and
  // retrying. The parent does NOT need to remount; we just re-call the
  // SWR-cached fetcher through `mutate` exported via `useSWRConfig`.
  //
  // For simplicity (and to avoid adding `useSWRConfig` plumbing), the
  // retry button calls `onRetry={() => window.location.reload()}` as
  // a last-ditch fallback in this preview. A more elegant pattern is
  // to expose `refresh` from `useCategoriesRanked` in a follow-up.
  void onSkip

  const { categories, isLoading, error } = useCategoriesRanked({ limit: CATEGORY_LIMIT })

  const selectableCategories = useMemo(
    () => toSelectableCategories(categories),
    [categories],
  )

  const toggleInterest = useCallback(
    (categoryId: string) => {
      onUpdateInterests(
        selectedInterests.includes(categoryId)
          ? selectedInterests.filter((id) => id !== categoryId)
          : [...selectedInterests, categoryId],
      )
    },
    [selectedInterests, onUpdateInterests],
  )

  const isSelected = useCallback(
    (categoryId: string) => selectedInterests.includes(categoryId),
    [selectedInterests],
  )

  const canProceed = selectedInterests.length >= 1

  return (
    <div className='space-y-8' data-testid='interest-selection-step'>
      {/* Header */}
      <div className='text-center space-y-2'>
        <h2 className='text-2xl md:text-3xl font-bold text-foreground'>
          What topics interest you? 🎯
        </h2>
        <p className='text-muted-foreground'>
          Select at least 1 category to personalize your quiz recommendations
        </p>
      </div>

      {/* Body — Loading | Error | Empty | Grid */}
      {isLoading ? (
        <CategoryGridSkeleton />
      ) : error !== null ? (
        <CategoryErrorState
          error={error}
          onRetry={() => {
            // Lightweight retry: full reload to re-run the SWR fetcher.
            // (Avoids adding `mutate` plumbing to `useCategoriesRanked` for
            //  this one-shot onboarding step.)
            if (typeof window !== 'undefined') {
              window.location.reload()
            }
          }}
        />
      ) : selectableCategories.length === 0 ? (
        <CategoryEmptyState />
      ) : (
        <div
          className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
          role='group'
          aria-label='Select your interests'
          data-testid='interest-selection-grid'
        >
          {selectableCategories.map((category) => (
            <button
              key={category.id}
              type='button'
              onClick={() => toggleInterest(category.id)}
              className={cn(
                'relative p-4 rounded-xl border-2 transition-all duration-200 text-left',
                'hover:scale-[1.02] hover:shadow-md',
                isSelected(category.id)
                  ? 'border-brand bg-brand/10 shadow-sm'
                  : 'border-border hover:border-brand/50 bg-card',
              )}
              aria-label={`${category.name} - ${isSelected(category.id) ? 'selected' : 'not selected'}`}
              aria-pressed={isSelected(category.id)}
              data-testid='interest-selection-cell'
              data-category-id={category.id}
            >
              {isSelected(category.id) && (
                <div
                  className='absolute top-2 right-2 w-5 h-5 rounded-full bg-brand flex items-center justify-center'
                  aria-hidden='true'
                >
                  <Check className='w-3 h-3 text-white' />
                </div>
              )}

              <div className='space-y-2'>
                <span className='text-2xl' aria-hidden='true'>
                  {category.icon}
                </span>
                <h3 className='font-medium text-foreground text-sm'>{category.name}</h3>
                <p className='text-xs text-muted-foreground line-clamp-2'>
                  {category.count > 0
                    ? `${category.count.toLocaleString('en-US')} attempt${category.count === 1 ? '' : 's'}`
                    : 'New category'}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selection Counter */}
      <div className='text-center'>
        <span
          className={cn(
            'inline-flex items-center px-3 py-1 rounded-full text-sm',
            canProceed
              ? 'bg-brand/10 text-brand'
              : 'bg-muted text-muted-foreground',
          )}
          role='status'
          aria-live='polite'
        >
          {selectedInterests.length} selected
          {!canProceed && ' (select at least 1)'}
        </span>
      </div>

      {/* Navigation */}
      <nav
        className='flex justify-between items-center pt-4'
        aria-label='Step navigation'
      >
        <Button
          variant='outline'
          onClick={onBack}
          className='flex items-center gap-2'
          aria-label='Go back to previous step'
        >
          <ArrowLeft className='w-4 h-4' aria-hidden='true' />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className='bg-brand hover:bg-brand-hover text-white flex items-center gap-2'
          aria-label='Continue to next step'
        >
          Continue
          <ArrowRight className='w-4 h-4' aria-hidden='true' />
        </Button>
      </nav>
    </div>
  )
})
