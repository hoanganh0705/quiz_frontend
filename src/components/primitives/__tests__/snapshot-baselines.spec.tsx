/**
 * Vitest snapshot baselines for the Story 3.1 primitives.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.F3.
 *
 * Each `toMatchSnapshot()` call captures the rendered HTML of the
 * primitive at a specific variant. Snapshots are committed on first
 * run and act as the baseline for any future visual regression
 * detection. If a primitive's HTML changes (intentional or
 * accidental), the next run will report a diff and require a
 * deliberate `-u` flag to update.
 *
 * `next/link` is mocked because jsdom does not provide a Next runtime.
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    children: React.ReactNode
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}))

import { render } from '@testing-library/react'

import { QuizCard } from '../QuizCard/QuizCard'
import { QuizCardSkeleton } from '../QuizCard/QuizCardSkeleton'
import { TagPill } from '../TagPill/TagPill'
import { CategoryCard } from '../CategoryCard/CategoryCard'
import { CategoryCardSkeleton } from '../CategoryCard/CategoryCardSkeleton'
import {
  mockCategoryResponseDto,
  mockQuizListItemDto,
  mockTagResponseDto
} from './render-helpers'

function snapshotHTML(node: HTMLElement): string {
  // Strip data-vitest-* attributes that vitest may inject.
  return node.innerHTML
    .replace(/data-vitest-[^=]+="[^"]*"/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('Snapshot baselines — QuizCard', () => {
  it('resolved with image, verified+featured, with description and difficulty', () => {
    const { container } = render(
      <QuizCard
        quiz={mockQuizListItemDto({
          title: 'A friendly quiz',
          imageUrl: 'https://example.test/img.jpg',
          isFeatured: true,
          isVerified: true,
          description: 'A short description.',
          publishedVersion: {
            quizVersionId: '0192f4d8-2222-7000-8000-000000000000',
            quizId: '0192f4d8-1111-7000-8000-000000000000',
            versionNumber: 1,
            status: 'PUBLISHED',
            difficulty: 'MEDIUM',
            durationMs: 90_000,
            passingScorePercent: 60,
            rewardXp: 100,
            createdAt: '2026-07-01T00:00:00.000Z',
            publishedAt: '2026-07-01T00:00:00.000Z',
            archivedAt: null,
            updatedAt: '2026-07-01T00:00:00.000Z'
          }
        })}
        bookmarkSlot={null}
      />
    )
    expect(snapshotHTML(container)).toMatchSnapshot()
  })

  it('resolved without image (initials fallback)', () => {
    const { container } = render(
      <QuizCard
        quiz={mockQuizListItemDto({
          title: 'No image quiz',
          imageUrl: null
        })}
        bookmarkSlot={null}
      />
    )
    expect(snapshotHTML(container)).toMatchSnapshot()
  })
})

describe('Snapshot baselines — QuizCardSkeleton', () => {
  it('default', () => {
    const { container } = render(<QuizCardSkeleton />)
    expect(snapshotHTML(container)).toMatchSnapshot()
  })
})

describe('Snapshot baselines — TagPill', () => {
  it('default variant', () => {
    const { container } = render(
      <TagPill tag={mockTagResponseDto({ name: 'algebra', slug: 'algebra' })} />
    )
    expect(snapshotHTML(container)).toMatchSnapshot()
  })

  it('clickable variant', () => {
    const { container } = render(
      <TagPill
        tag={mockTagResponseDto({ name: 'history', slug: 'history' })}
        variant='clickable'
      />
    )
    expect(snapshotHTML(container)).toMatchSnapshot()
  })
})

describe('Snapshot baselines — CategoryCard', () => {
  it('resolved with image', () => {
    const { container } = render(
      <CategoryCard
        category={mockCategoryResponseDto({
          name: 'Mathematics',
          imageUrl: 'https://example.test/cat.jpg'
        })}
      />
    )
    expect(snapshotHTML(container)).toMatchSnapshot()
  })

  it('resolved without image (initials fallback)', () => {
    const { container } = render(
      <CategoryCard
        category={mockCategoryResponseDto({
          name: 'No image category',
          imageUrl: null
        })}
      />
    )
    expect(snapshotHTML(container)).toMatchSnapshot()
  })
})

describe('Snapshot baselines — CategoryCardSkeleton', () => {
  it('default', () => {
    const { container } = render(<CategoryCardSkeleton />)
    expect(snapshotHTML(container)).toMatchSnapshot()
  })
})