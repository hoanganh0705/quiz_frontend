/**
 * `HomePopularRail.population.spec.ts` — locks the
 * `popularQuizItemToQuizListItem` projection contract.
 *
 * Source epic: Story 3.7 — Featured / trending / popular rails on `/`.
 * Source ticket: TKT-3.7.C5.
 *
 * Same four cases as the trending projection spec, applied to the
 * popular DTO. See `HomeTrendingRail.population.spec.ts` for the
 * detailed contract — the popular projection follows the same
 * conventions verbatim.
 */

import { describe, expect, it } from 'vitest'

import type { PopularQuizItemDto } from '@/lib/api/generated/schemas'

import { popularQuizItemToQuizListItem } from '@/features/quizzes/components/HomePopularRail'

function makePopularItem(
  overrides: Partial<PopularQuizItemDto> = {},
): PopularQuizItemDto {
  return {
    rank: 1,
    quizId: '0192f4d8-0000-7000-8000-000000000001',
    // `creatorId` is a union type on the wire; we use a plain string
    // here. The projection casts to `string | null`.
    creatorId: 'creator-1' as unknown as PopularQuizItemDto['creatorId'],
    title: 'Sample popular',
    slug: 'sample-popular',
    imageUrl: 'https://example.com/image.jpg',
    popularityScore: 87.5,
    totalAttempts: 250,
    averageRating: 4.6,
    bookmarkCount: 9,
    ...overrides,
  }
}

describe('popularQuizItemToQuizListItem — maps shared fields verbatim', () => {
  it('(a) maps quizId → quizId, title → title, slug → slug, imageUrl → imageUrl', () => {
    const input = makePopularItem()
    const out = popularQuizItemToQuizListItem(input)
    expect(out.quizId).toBe(input.quizId)
    expect(out.title).toBe(input.title)
    expect(out.slug).toBe(input.slug)
    expect(out.imageUrl).toBe(input.imageUrl)
  })
})

describe('popularQuizItemToQuizListItem — null imageUrl propagation', () => {
  it('(b) propagates imageUrl: null as imageUrl: null', () => {
    const input = makePopularItem({ imageUrl: null })
    const out = popularQuizItemToQuizListItem(input)
    expect(out.imageUrl).toBeNull()
  })
})

describe('popularQuizItemToQuizListItem — safe defaults for unused fields', () => {
  it('(c) fills description, categoryId, isFeatured, isHidden, isVerified, publishedVersionId, publishedVersion, createdAt, updatedAt with documented defaults', () => {
    const input = makePopularItem()
    const out = popularQuizItemToQuizListItem(input)

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

describe('popularQuizItemToQuizListItem — does NOT mutate the input DTO', () => {
  it('(d) the input object is untouched after projection', () => {
    const input = makePopularItem()
    const snapshot = JSON.parse(JSON.stringify(input)) as PopularQuizItemDto
    popularQuizItemToQuizListItem(input)
    expect(input).toEqual(snapshot)
  })
})
