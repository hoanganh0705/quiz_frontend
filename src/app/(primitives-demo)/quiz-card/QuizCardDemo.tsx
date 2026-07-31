'use client'

/**
 * Client component for the Story 3.1 primitives demo.
 *
 * Source tickets: TKT-3.1.B2, TKT-3.1.C6, TKT-3.1.E4.
 *
 * Renders three stacked sections (QuizCard grid, CategoryCard row,
 * TagPill cluster) using the real primitives from
 * `@/components/primitives`. A skeleton/resolved toggle drives all
 * three sections simultaneously. The page issues zero network
 * requests; mock data is colocated below.
 */

import { useState } from 'react'

import {
  CategoryCard,
  CategoryCardGrid,
  QuizCardGrid,
  TagPill
} from '@/components/primitives'
import type {
  CategoryResponseDto,
  QuizListItemDto,
  TagResponseDto
} from '@/lib/api/generated/schemas'

const mockQuizzes: QuizListItemDto[] = Array.from({ length: 12 }, (_, i) => ({
  quizId: `0192f4d8-0000-7000-8000-${String(i + 1).padStart(12, '0')}`,
  creatorId: null,
  title: `Sample quiz number ${i + 1} — a moderately long title for clamp testing`,
  description:
    i % 2 === 0
      ? 'A short description for testing the collapsed-body-row edge case.'
      : null,
  slug: `sample-quiz-${i + 1}`,
  requirements: null,
  imageUrl: i % 3 === 0 ? null : `https://picsum.photos/seed/${i + 1}/640/360`,
  categoryId: null,
  isFeatured: i % 4 === 0,
  isHidden: false,
  isVerified: true,
  publishedVersionId: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z'
}))

const mockCategories: CategoryResponseDto[] = Array.from({ length: 8 }, (_, i) => ({
  categoryId: `0192f4d8-0000-7000-8000-${String(i + 1).padStart(12, '0')}`,
  name: `Category ${i + 1}`,
  description:
    i % 2 === 0
      ? 'A short description for testing the collapsed-body-row edge case.'
      : null,
  slug: `category-${i + 1}`,
  imageUrl: i % 3 === 0 ? null : `https://picsum.photos/seed/cat-${i + 1}/640/480`,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z'
}))

const mockTags: TagResponseDto[] = Array.from({ length: 18 }, (_, i) => ({
  tagId: `0192f4d8-0000-7000-8000-${String(i + 1).padStart(12, '0')}`,
  name: `tag-${i + 1}`,
  slug: `tag-${i + 1}`,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z'
}))

export function QuizCardDemo() {
  const [mode, setMode] = useState<'skeleton' | 'resolved'>('skeleton')

  return (
    <section aria-labelledby='demo-controls' className='space-y-12'>
      <div className='flex items-center gap-3' id='demo-controls'>
        <span className='text-sm font-medium'>Render all sections:</span>
        <div className='inline-flex rounded-md border bg-background p-1'>
          <button
            type='button'
            onClick={() => setMode('skeleton')}
            aria-pressed={mode === 'skeleton'}
            className='rounded-sm px-3 py-1 text-sm aria-pressed:bg-accent aria-pressed:text-accent-foreground'
          >
            Skeleton
          </button>
          <button
            type='button'
            onClick={() => setMode('resolved')}
            aria-pressed={mode === 'resolved'}
            className='rounded-sm px-3 py-1 text-sm aria-pressed:bg-accent aria-pressed:text-accent-foreground'
          >
            Resolved
          </button>
        </div>
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-semibold'>QuizCard grid</h2>
        <QuizCardGrid
          items={mode === 'resolved' ? mockQuizzes : []}
          skeletonCount={mode === 'skeleton' ? 12 : 0}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-semibold'>CategoryCard grid</h2>
        <CategoryCardGrid
          items={mode === 'resolved' ? mockCategories : []}
          skeletonCount={mode === 'skeleton' ? 8 : 0}
        />
      </div>

      <div className='space-y-3'>
        <h2 className='text-lg font-semibold'>TagPill cluster</h2>
        <div
          className='flex flex-wrap gap-2 rounded-lg border bg-card p-4'
          data-testid='tag-pill-cluster'
        >
          {mode === 'resolved' ? (
            mockTags.map((tag) => (
              <TagPill key={tag.tagId} tag={tag} variant='clickable' />
            ))
          ) : (
            mockTags.map((_, i) => (
              <span
                key={i}
                className='inline-block h-5 w-16 animate-pulse rounded-full bg-muted'
                aria-hidden='true'
              />
            ))
          )}
        </div>
      </div>

      <p className='text-xs text-muted-foreground'>
        All three primitives (<code>&lt;QuizCard /&gt;</code>,{' '}
        <code>&lt;CategoryCard /&gt;</code>, <code>&lt;TagPill /&gt;</code>) are
        wired in. Toggle above switches skeleton ↔ resolved across all sections
        simultaneously.
      </p>
    </section>
  )
}

// Re-export CategoryCard so the page header can mention it.
export { CategoryCard }