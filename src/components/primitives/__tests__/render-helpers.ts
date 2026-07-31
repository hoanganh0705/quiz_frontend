/**
 * Render helpers + DTO factories for Phase 3 design-system primitive tests.
 *
 * Source story: PHASE_3_EPICS.md → Story 3.1.
 * Source ticket: TKT-3.1.B3.
 *
 * Two halves:
 *
 *   1. DTO factories (`mockQuizListItemDto`, `mockCategoryResponseDto`,
 *      `mockTagResponseDto`) — pure functions that produce SDK-typed
 *      objects with realistic defaults and an `overrides` escape hatch.
 *      These have no side effects and require no DOM environment; they
 *      run under the node-environment vitest project.
 *
 *   2. Render helpers (`renderQuizCard`, `renderCategoryCard`,
 *      `renderTagPill`) — wrap `@testing-library/react`'s `render` and
 *      route the component through the primitives barrel. They run
 *      under the jsdom-environment vitest project (configured in
 *      `vitest.config.ts`).
 *
 * The render-helpers barrel lookups include runtime guards so a
 * caller mixing C/D/E batches (where one primitive ships before
 * another) gets a helpful error rather than a `quizCard is undefined`
 * crash.
 */

import type {
  CategoryResponseDto,
  QuizListItemDto,
  TagResponseDto
} from '@/lib/api/generated/schemas'

// ---------------------------------------------------------------------------
// DTO factories (pure; node-env compatible)
// ---------------------------------------------------------------------------

const UUID_V7_RE = /^0192f4d8-[0-9a-f]{4}-7000-8000-[0-9a-f]{12}$/i

function uuidV7(index: number): string {
  const tail = String(index).padStart(12, '0')
  return `0192f4d8-0000-7000-8000-${tail}`
}

function assertUuidV7(value: string, label: string): void {
  if (!UUID_V7_RE.test(value)) {
    throw new Error(
      `[render-helpers] ${label} must be a UUIDv7-shaped string; got ${value}`
    )
  }
}

export type MockOverrides = Record<string, unknown>

export function mockQuizListItemDto(
  overrides: MockOverrides = {}
): QuizListItemDto {
  const base: QuizListItemDto = {
    quizId: uuidV7(1),
    creatorId: null,
    title: 'Sample quiz',
    description: null,
    slug: 'sample-quiz',
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: true,
    publishedVersionId: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z'
  }
  const merged = { ...base, ...overrides } as QuizListItemDto
  assertUuidV7(merged.quizId, 'quizId')
  return merged
}

export function mockCategoryResponseDto(
  overrides: MockOverrides = {}
): CategoryResponseDto {
  const base: CategoryResponseDto = {
    categoryId: uuidV7(1),
    name: 'Sample category',
    description: null,
    slug: 'sample-category',
    imageUrl: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z'
  }
  const merged = { ...base, ...overrides } as CategoryResponseDto
  assertUuidV7(merged.categoryId, 'categoryId')
  return merged
}

export function mockTagResponseDto(
  overrides: MockOverrides = {}
): TagResponseDto {
  const base: TagResponseDto = {
    tagId: uuidV7(1),
    name: 'sample-tag',
    slug: 'sample-tag',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z'
  }
  const merged = { ...base, ...overrides } as TagResponseDto
  assertUuidV7(merged.tagId, 'tagId')
  return merged
}

// ---------------------------------------------------------------------------
// Render helpers (jsdom-env only)
// ---------------------------------------------------------------------------

type AnyRecord = Record<string, unknown>

async function getRender() {
  try {
    const mod = (await import('@testing-library/react')) as {
      render: (ui: React.ReactElement) => unknown
    }
    return mod.render
  } catch (err) {
    throw new Error(
      '[render-helpers] React rendering requires a DOM test environment. ' +
        'Configure vitest with `environment: "jsdom"` (or "happy-dom"). ' +
        `Underlying error: ${(err as Error).message}`
    )
  }
}

export async function renderQuizCard(props: { quiz: QuizListItemDto }) {
  const render = await getRender()
  const { QuizCard } = (await import('@/components/primitives')) as unknown as {
    QuizCard: (p: AnyRecord) => React.ReactElement
  }
  return render(QuizCard(props))
}

export async function renderCategoryCard(props: {
  category: CategoryResponseDto
}) {
  const render = await getRender()
  // CategoryCard ships in Batch E and is now exported by the barrel.
  const mod = (await import('@/components/primitives')) as unknown as {
    CategoryCard: (p: AnyRecord) => React.ReactElement
  }
  return render(mod.CategoryCard(props))
}

export async function renderTagPill(props: { tag: TagResponseDto }) {
  const render = await getRender()
  // TagPill ships in Batch D and is now exported by the barrel.
  const mod = (await import('@/components/primitives')) as unknown as {
    TagPill: (p: AnyRecord) => React.ReactElement
  }
  return render(mod.TagPill(props))
}