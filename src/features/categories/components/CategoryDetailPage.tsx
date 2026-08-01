'use client'

/**
 * `<CategoryDetailPage />` — the `/categories/[idOrSlug]` route's
 * main composition.
 *
 * Source epic: Epic 3.3 — Category browse + detail (read-only).
 * Source ticket: TKT-3.3.D3.
 *
 * Wires:
 *   - `useCategory(idOrSlug)` (B3) for the header data
 *   - `useCategoryQuizzes(idOrSlug, params)` (B4) for the quiz grid
 *   - `<CategoryHeader />` (C3) above the grid
 *   - `<CategoryQuizGrid />` (D1) below the header
 *
 * State contract:
 *
 * | Hook state                                | Render                                            |
 * | ----------------------------------------- | ------------------------------------------------- |
 * | `isLoading`                               | Header skeleton + 12-card grid skeleton.          |
 * | `notFound: true` (404)                    | Inline 404 block (no header, no grid).            |
 * | `error.status >= 500`                     | Inline error message + retry button.              |
 * | resolved                                  | Header + `<CategoryQuizGrid />`.                 |
 *
 * ## 404 path
 *
 * The page renders an inline 404 block (matching the existing
 * `app/not-found.tsx` visual) instead of calling `next/navigation`'s
 * `notFound()`. The page is a client component (it consumes the SWR
 * hooks), so the file-based 404 mechanism (intended for server
 * components) is not appropriate here. The visual matches the app's
 * existing 404 surface so the user experience is consistent.
 *
 * ## Loading path
 *
 * The header skeleton mirrors the resolved header's height; the grid
 * skeleton uses 12 cards (the same count as `<CategoryQuizGrid />`).
 * CLS = 0 once items arrive.
 */

import { CategoryHeader } from './CategoryHeader'
import { CategoryQuizGrid } from './CategoryQuizGrid'
import { useCategory } from '@/features/categories/hooks'
import { Button } from '@/components/ui/Button'
import { mutate } from 'swr'
import Link from 'next/link'
import { Home, Search } from 'lucide-react'

export interface CategoryDetailPageProps {
  idOrSlug: string
}

export function CategoryDetailPage({
  idOrSlug,
}: CategoryDetailPageProps): React.ReactElement {
  const { category, isLoading, error, notFound } = useCategory(idOrSlug)

  // 404 — inline 404 block (matches the app's not-found.tsx style).
  if (notFound) {
    return (
      <div
        className='min-h-screen bg-background flex items-center justify-center p-4'
        data-testid='category-detail-page-not-found'
      >
        <div className='max-w-md w-full text-center'>
          <div className='mb-8'>
            <h1 className='text-8xl font-bold text-default mb-2'>404</h1>
            <div className='w-16 h-1 bg-default mx-auto rounded-full' />
          </div>
          <h2 className='text-2xl font-bold text-foreground mb-2'>
            Category Not Found
          </h2>
          <p className='text-foreground/70 mb-8'>
            The category you&apos;re looking for doesn&apos;t exist or has
            been removed.
          </p>
          <div className='flex flex-col sm:flex-row gap-3 justify-center'>
            <Button
              asChild
              className='bg-default hover:bg-default-hover text-white'
            >
              <Link href='/'>
                <Home className='w-4 h-4 mr-2' />
                Go Home
              </Link>
            </Button>
            <Button
              asChild
              variant='outline'
              className='border-border text-primary'
            >
              <Link href='/categories'>
                <Search className='w-4 h-4 mr-2' />
                Browse Categories
              </Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 5xx — generic error message + retry button.
  if (error && error.status >= 500) {
    return (
      <div
        className='min-h-screen bg-background flex items-center justify-center p-4'
        data-testid='category-detail-page-server-error'
      >
        <div className='max-w-md w-full text-center'>
          <h2 className='text-2xl font-bold text-foreground mb-2'>
            Something went wrong
          </h2>
          <p className='text-foreground/70 mb-6'>
            We couldn&apos;t load this category. Please try again.
          </p>
          <Button
            variant='outline'
            onClick={() => void mutate(['category', idOrSlug])}
            data-testid='category-detail-page-retry'
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  // Loading — header skeleton + grid skeleton. CLS = 0.
  if (isLoading || !category) {
    return (
      <div
        className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
        data-testid='category-detail-page-loading'
      >
        <CategoryHeader title=' ' description={null} />
        <CategoryQuizGrid idOrSlug={idOrSlug} skeletonCount={12} />
      </div>
    )
  }

  // Resolved — breadcrumb + header + grid.
  return (
    <div
      className='min-h-screen text-foreground p-4 md:p-8 lg:p-12'
      data-testid='category-detail-page'
    >
      <nav
        aria-label='Breadcrumb'
        className='mb-4 text-sm text-muted-foreground'
        data-testid='category-detail-page-breadcrumb'
      >
        <ol className='flex flex-wrap items-center gap-1'>
          <li>
            <Link href='/' className='hover:text-foreground hover:underline'>
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
            {/*
             * The breadcrumb target uses `category.slug` from the
             * response — the canonical slug — not the original
             * `:idOrSlug` route param. When the user navigates to
             * `/categories/<id>` (a UUIDv7 id), the breadcrumb still
             * links to `/categories/<category.slug>` (the canonical
             * slug).
             *
             * Source: Story 3.3 line 349 edge case.
             */}
            <Link
              href={`/categories/${category.slug}`}
              className='hover:text-foreground hover:underline'
            >
              {category.name}
            </Link>
          </li>
        </ol>
      </nav>
      <CategoryHeader
        title={category.name}
        description={category.description}
      />
      <CategoryQuizGrid idOrSlug={idOrSlug} />
    </div>
  )
}
