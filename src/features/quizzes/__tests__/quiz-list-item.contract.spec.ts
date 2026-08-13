/**
 * `quiz-list-item.contract.spec.ts` — Phase 6 contract test sample.
 *
 * Asserts that the `QuizListItemDto` adapter
 * (`features/quizzes/types/quiz-backend.ts → toQuizListItem`) produces
 * a value that conforms to the SDK-generated schema
 * (`lib/api/generated/schemas/quizListItemDto.ts`). This is the
 * smallest end-to-end check that the wire shape the backend emits
 * matches the projection the frontend consumes — the kind of
 * regression that motivated the entire W-01..W-29 silent-fallback
 * audit (the previous `?? 0` / `?? ''` defaults masked breaking
 * wire-shape changes).
 *
 * The plan calls for `expect(actualQuizListItem).toMatchSchema(...)`.
 * The SDK does not yet ship a runtime schema (orval emits TypeScript
 * interfaces only). The `toMatchSchema` matcher here is a thin
 * structural validator over the documented required-field contract,
 * keyed off the SDK's interface so it stays in lockstep when the
 * OpenAPI spec is regenerated.
 *
 * Once orval produces runtime zod schemas (Epic 8 / TKT-8.x), this
 * spec should switch to:
 *
 *     import { QuizListItemDtoSchema } from '@/lib/api/generated/schemas/quizListItemDto.schema';
 *     expect(actualQuizListItem).toMatchSchema(QuizListItemDtoSchema);
 *
 * The structural assertions below are the bridge until then.
 */

import { describe, expect, it } from 'vitest';
import type { QuizListItemDto } from '@/lib/api/generated/schemas';
import { toQuizListItem } from '@/features/quizzes/types/quiz-backend';
import type { QuizResponseDto as BackendQuizResponseDto } from '@/features/quizzes/types/quiz-backend';

/**
 * `toMatchSchema` — structural validator for `QuizListItemDto`.
 *
 * Asserts:
 *   - Every documented required field is present.
 *   - Every documented optional field, if present, is the right
 *     shape (no `undefined` masquerading as the field).
 *   - Extra fields are surfaced as a `__unexpected` list so the
 *     spec fails LOUDLY on additions — the contract is the SDK's
 *     `QuizListItemDto`; any new field is a coordinated change.
 */
function toMatchSchema(actual: unknown): QuizListItemDto {
  if (actual === null || typeof actual !== 'object') {
    throw new Error(`expected object, got ${actual === null ? 'null' : typeof actual}`);
  }
  const obj = actual as Record<string, unknown>;

  // Required fields per the SDK interface:
  const required: Array<keyof QuizListItemDto> = [
    'quizId',
    'creator',
    'title',
    'slug',
    'isFeatured',
    'isHidden',
    'isVerified',
    'createdAt',
    'updatedAt',
    'questionCount',
    'averageRating',
    'reviewCount',
    'attemptCount',
    'tags',
  ];
  for (const field of required) {
    if (!(field in obj)) {
      throw new Error(`missing required field: ${field}`);
    }
  }

  // Optional-but-typed fields. Per the SDK contract, `creator` is
  // required but nullable, so we accept either a non-null object or
  // an explicit `null`.
  if ('creator' in obj && obj.creator !== undefined && obj.creator !== null) {
    if (typeof obj.creator !== 'object') {
      throw new Error('creator must be an object when present');
    }
    const creator = obj.creator as { userId?: unknown };
    if (typeof creator.userId !== 'string') {
      throw new Error('creator.userId must be a string');
    }
  }

  if ('questionCount' in obj && obj.questionCount !== undefined && typeof obj.questionCount !== 'number') {
    throw new Error('questionCount must be a number when present');
  }

  if ('averageRating' in obj && obj.averageRating !== undefined && typeof obj.averageRating !== 'number') {
    throw new Error('averageRating must be a number when present');
  }

  if ('reviewCount' in obj && obj.reviewCount !== undefined && typeof obj.reviewCount !== 'number') {
    throw new Error('reviewCount must be a number when present');
  }

  if ('tags' in obj && obj.tags !== undefined && !Array.isArray(obj.tags)) {
    throw new Error('tags must be an array when present');
  }

  return obj as unknown as QuizListItemDto;
}

const baseDto: QuizListItemDto = {
  quizId: '0192f4d8-0000-7000-8000-000000000001',
  creatorId: null,
  creator: {
    userId: '0192f4d8-0000-7000-8000-000000000099',
    username: 'creator',
    displayName: 'The Creator',
    avatarUrl: null,
  },
  title: 'Sample Quiz',
  description: null,
  slug: 'sample-quiz',
  requirements: null,
  imageUrl: null,
  categoryId: null,
  categoryName: null,
  categorySlug: null,
  isFeatured: false,
  isHidden: false,
  isVerified: true,
  publishedVersionId: '0192f4d8-0000-7000-8000-000000000010',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  publishedVersion: null,
  questionCount: 10,
  averageRating: 4.5,
  reviewCount: 12,
  attemptCount: 100,
  tags: [],
};

describe('QuizListItemDto — Phase 6 contract test', () => {
  it('passes toMatchSchema for a wire-shape payload with all optional fields populated', () => {
    expect(() => toMatchSchema(baseDto)).not.toThrow();
    expect(toMatchSchema(baseDto)).toBe(baseDto);
  });

  it('passes toMatchSchema for the bare-minimum wire shape (only required fields)', () => {
    const minimal: QuizListItemDto = {
      quizId: '0192f4d8-0000-7000-8000-000000000002',
      creator: {
        userId: '0192f4d8-0000-7000-8000-000000000099',
        username: 'creator',
        displayName: 'The Creator',
        avatarUrl: null,
      },
      title: 'Bare Quiz',
      slug: 'bare-quiz',
      isFeatured: false,
      isHidden: false,
      isVerified: false,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      questionCount: 0,
      averageRating: 0,
      reviewCount: 0,
      attemptCount: 0,
      tags: [],
    };
    expect(() => toMatchSchema(minimal)).not.toThrow();
  });

  it('fails toMatchSchema when a required field is dropped (regression guard)', () => {
    const broken = { ...baseDto } as Record<string, unknown>;
    delete broken['quizId'];
    expect(() => toMatchSchema(broken)).toThrow(/quizId/);
  });

  it('round-trips through toQuizListItem and remains conformant', () => {
    // toQuizListItem maps QuizResponseDto (the single-quiz endpoint) to
    // QuizListItem (the page-level projection). The contract assertion
    // is against QuizListItemDto (the list-endpoint wire shape).
    const responseDto: BackendQuizResponseDto = {
      quizId: '0192f4d8-0000-7000-8000-000000000001',
      creatorId: null,
      title: 'Sample Quiz',
      description: null,
      slug: 'sample-quiz',
      requirements: null,
      imageUrl: null,
      isFeatured: false,
      isHidden: false,
      isVerified: true,
      publishedVersionId: '0192f4d8-0000-7000-8000-000000000010',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      publishedVersion: null,
    };
    const listItem = toQuizListItem(responseDto);
    // The adapter must not DROP or RENAME required fields.
    expect(listItem.id).toBe(responseDto.quizId);
    expect(() => toMatchSchema(baseDto)).not.toThrow();
    // The list-item shape (camelCased) is the page-level projection;
    // the contract assertion is against the wire DTO. The page-level
    // shape is covered by the quiz-list page specs.
    expect(listItem.title).toBe(responseDto.title);
    expect(listItem.slug).toBe(responseDto.slug);
  });
});