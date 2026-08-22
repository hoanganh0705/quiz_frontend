/**
 * `<CategoryHeader />` — the detail page's header.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.C3.
 *
 * Renders the category's title, description, and optional quizCount
 * (formatted via `formatQuizCount`).
 *
 * ## Wire-shape drift (Epic 3.3 A1 §3)
 *
 * The `CategoryResponseDto` does NOT carry `quizCount` at the top level.
 * The component accepts it as an optional prop so the caller (D3) can
 * supply it when the analytics endpoint
 * (`categoryControllerGetCategoryAnalytics`) is consulted. If the prop
 * is absent, the header simply omits the quiz-count row — the title
 * and description still render.
 *
 * ## Server-renderable
 *
 * The component is a pure prop-driven renderer. No `'use client'`
 * directive; the parent page (D3) is the client component because
 * it consumes the SWR hooks.
 */

import { formatQuizCount } from '@/features/categories/utils/format-quiz-count'

export interface CategoryHeaderProps {
  /** The category's display name. */
  title: string
  /** The category's description (optional). */
  description?: string | null
  /**
   * The number of quizzes in the category. When supplied, rendered
   * alongside the title using `formatQuizCount(n)`. Optional —
   * omitted from the markup when not provided.
   */
  quizCount?: number
  /** Locale for `formatQuizCount`. Defaults to `en-US`. */
  locale?: string
}

export function CategoryHeader({
  title,
  description,
  quizCount,
  locale = 'en-US',
}: CategoryHeaderProps): React.ReactElement {
  return (
    <header className='mb-8' data-testid='category-header'>
      <div className='flex items-baseline gap-3'>
        <h1 className='text-3xl font-bold text-foreground'>{title}</h1>
        {typeof quizCount === 'number' ? (
          <span
            className='text-sm text-muted-foreground tabular-nums'
            data-testid='category-header-quiz-count'
          >
            {formatQuizCount(quizCount, locale)} quizzes
          </span>
        ) : null}
      </div>

      {description ? (
        <p className='mt-3 text-base text-foreground-secondary'>{description}</p>
      ) : null}
    </header>
  )
}
