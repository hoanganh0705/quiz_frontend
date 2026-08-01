/**
 * `<CategoryHeader />` — the detail page's header.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.C3.
 *
 * Renders the category's title, description, optional quizCount
 * (formatted via `formatQuizCount`), and optional parent breadcrumb.
 *
 * ## Wire-shape drift (Epic 3.3 A1 §3)
 *
 * The `CategoryResponseDto` does NOT carry `quizCount` or a `parent`
 * field at the top level. The component accepts them as optional
 * props so the caller (D3) can supply them when the analytics
 * endpoint (`categoryControllerGetCategoryAnalytics`) is consulted
 * or when a future endpoint exposes the parent. If the props are
 * absent, the header simply omits the quiz-count row and the
 * parent-breadcrumb row — the title + description still render.
 *
 * ## Server-renderable
 *
 * The component is a pure prop-driven renderer. No `'use client'`
 * directive; the parent page (D3) is the client component because
 * it consumes the SWR hooks.
 *
 * ## Parent breadcrumb
 *
 * When `parent` is supplied, the header renders a `Home / Categories /
 * <parent.name>` breadcrumb where `<parent.name>` links to
 * `/categories/<parent.slug>`. The `Home` link is `/`, the
 * `Categories` link is `/categories`.
 */

import Link from 'next/link'

import { formatQuizCount } from '@/features/categories/utils/format-quiz-count'

export interface CategoryHeaderParent {
  name: string
  slug: string
}

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
  /**
   * The parent category's name + slug. When supplied, rendered as
   * a `Home / Categories / <parent.name>` breadcrumb. Optional.
   */
  parent?: CategoryHeaderParent
  /** Locale for `formatQuizCount`. Defaults to `en-US`. */
  locale?: string
}

export function CategoryHeader({
  title,
  description,
  quizCount,
  parent,
  locale = 'en-US',
}: CategoryHeaderProps): React.ReactElement {
  return (
    <header className='mb-8' data-testid='category-header'>
      {parent ? (
        <nav
          aria-label='Breadcrumb'
          className='mb-3 text-sm text-muted-foreground'
        >
          <ol className='flex flex-wrap items-center gap-1'>
            <li>
              <Link
                href='/'
                className='hover:text-foreground hover:underline'
              >
                Home
              </Link>
            </li>
            <li aria-hidden='true'>/</li>
            <li>
              <Link
                href='/categories'
                className='hover:text-foreground hover:underline'
              >
                Categories
              </Link>
            </li>
            <li aria-hidden='true'>/</li>
            <li>
              <Link
                href={`/categories/${parent.slug}`}
                className='hover:text-foreground hover:underline'
              >
                {parent.name}
              </Link>
            </li>
          </ol>
        </nav>
      ) : null}

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
        <p className='mt-3 text-base text-foreground/70'>{description}</p>
      ) : null}
    </header>
  )
}
