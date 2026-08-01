/**
 * `HomeTrendingRail.population.spec.ts` — locks the
 * `trendingQuizItemToQuizListItem` projection contract.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.C5.
 *
 * Four cases per the ticket:
 *
 *   (a) Maps shared fields verbatim: `quizId` → `quizId`,
 *       `title` → `title`, `slug` → `slug`, `imageUrl` → `imageUrl`
 *       (when `imageUrl` is a non-null string).
 *   (b) Propagates `imageUrl: null` as `imageUrl: null` (no
 *       transformation — the `<QuizCard />` primitive's
 *       deterministic initials fallback handles the missing
 *       thumbnail case).
 *   (c) Fills the `QuizListItemDto`-only fields with the
 *       documented safe defaults.
 *   (d) Does NOT mutate the input DTO.
 */

import { describe, expect, it } from 'vitest'

import type { TrendingQuizItemDto } from '@/lib/api/generated/schemas'

import { trendingQuizItemToQuizListItem } from '@/features/quizzes/components/HomeTrendingRail'

function makeTrendingItem(
  overrides: Partial<TrendingQuizItemDto> = {},
): TrendingQuizItemDto {
  return {
    rank: 1,
    quizId: '0192f4d8-0000-7000-8000-000000000001',
    // `creatorId` is a union type on the wire; we use a plain string
    // here. The projection casts to `string | null`.
    creatorId: 'creator-1' as unknown as TrendingQuizItemDto['creatorId'],
    title: 'Sample trending',
    slug: 'sample-trending',
    imageUrl: 'https://example.com/image.jpg',
    trendingScore: 99.5,
    totalAttempts: 100,
    recentAttempts: 12,
    ...overrides,
  }
}

describe('trendingQuizItemToQuizListItem — maps shared fields verbatim', () => {
  it('(a) maps quizId → quizId, title → title, slug → slug, imageUrl → imageUrl', () => {
    const input = makeTrendingItem()
    const out = trendingQuizItemToQuizListItem(input)
    expect(out.quizId).toBe(input.quizId)
    expect(out.title).toBe(input.title)
    expect(out.slug).toBe(input.slug)
    expect(out.imageUrl).toBe(input.imageUrl)
  })
})

describe('trendingQuizItemToQuizListItem — null imageUrl propagation', () => {
  it('(b) propagates imageUrl: null as imageUrl: null', () => {
    const input = makeTrendingItem({ imageUrl: null })
    const out = trendingQuizItemToQuizListItem(input)
    expect(out.imageUrl).toBeNull()
  })
})

describe('trendingQuizItemToQuizListItem — safe defaults for unused fields', () => {
  it('(c) fills description, categoryId, isFeatured, isHidden, isVerified, publishedVersionId, publishedVersion, createdAt, updatedAt with documented defaults', () => {
    const input = makeTrendingItem()
    const out = trendingQuizItemToQuizListItem(input)

    expect(out.description).toBe('')
    expect(out.categoryId).toBe('')
    expect(out.isFeatured).toBe(false)
    expect(out.isHidden).toBe(false)
    expect(out.isVerified).toBe(false)
    expect(out.publishedVersionId).toBeUndefined()
    expect(out.publishedVersion).toBeUndefined()
    expect(out.createdAt).toBe('')
    expect(out.updatedAt).toBe('')
  })
})

describe('trendingQuizItemToQuizListItem — does NOT mutate the input DTO', () => {
  it('(d) the input object is untouched after projection', () => {
    const input = makeTrendingItem()
    const snapshot = JSON.parse(JSON.stringify(input)) as TrendingQuizItemDto
    trendingQuizItemToQuizListItem(input)
    expect(input).toEqual(snapshot)
  })
})
