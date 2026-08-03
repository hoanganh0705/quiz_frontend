/**
 * `lib/forms/presets/__tests__/index.spec.ts` — locks the form-preset
 * contracts.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source ticket: TKT-4.2.D1.
 *
 * Coverage contract:
 *
 *   - `quizCreateFormSchema` accepts a valid sample and rejects
 *     invalid ones (over-length title, bad slug, missing initialVersion).
 *   - `versionEditFormSchema` accepts a partial payload and rejects
 *     unknown keys (`.strict()`).
 *   - `questionFormSchema` accepts a valid sample and rejects bad
 *     bounds (over-length questionText, empty option value).
 *   - `bulkQuestionsFormSchema` enforces the 1–50 row bounds.
 *   - `reviewFormSchema` enforces the 1–5 rating bounds.
 *   - `commentFormSchema` enforces the 1–2000 body bound and the
 *     `parentCommentId` UUID constraint.
 *   - The shared `initialQuizVersionFormSchema` enforces the
 *     numeric bounds.
 *   - The `quizCreateFormSchema.shape.initialVersion` shape matches
 *     the documented sub-schema (cross-preset structural test).
 */

import { describe, expect, it } from 'vitest';

import {
  bulkQuestionsFormSchema,
  commentFormSchema,
  initialQuizVersionFormSchema,
  questionFormSchema,
  quizAnswerOptionFormSchema,
  quizCreateFormSchema,
  quizQuestionFormSchema,
  reviewFormSchema,
  versionEditFormSchema,
} from '../index';

describe('lib/forms/presets', () => {
  describe('initialQuizVersionFormSchema', () => {
    it('accepts a valid sample', () => {
      const result = initialQuizVersionFormSchema.safeParse({
        difficulty: 'medium',
        durationMs: 600_000,
        passingScorePercent: 70,
        rewardXp: 100,
      });
      expect(result.success).toBe(true);
    });

    it('rejects durationMs < 1', () => {
      const result = initialQuizVersionFormSchema.safeParse({
        difficulty: 'medium',
        durationMs: 0,
        passingScorePercent: 70,
        rewardXp: 100,
      });
      expect(result.success).toBe(false);
    });

    it('rejects passingScorePercent > 100', () => {
      const result = initialQuizVersionFormSchema.safeParse({
        difficulty: 'medium',
        durationMs: 600_000,
        passingScorePercent: 150,
        rewardXp: 100,
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown difficulty values', () => {
      const result = initialQuizVersionFormSchema.safeParse({
        difficulty: 'extreme',
        durationMs: 600_000,
        passingScorePercent: 70,
        rewardXp: 100,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('quizCreateFormSchema', () => {
    const validSample = {
      title: 'World History 102',
      description: 'A thorough tour of post-war history.',
      slug: 'world-history-102',
      requirements: null,
      imageUrl: null,
      isFeatured: false,
      isHidden: false,
      categoryId: null,
      tagSlugs: ['world-history', '20th-century'],
      initialVersion: {
        difficulty: 'medium',
        durationMs: 600_000,
        passingScorePercent: 70,
        rewardXp: 100,
      },
      acknowledgements: true,
    };

    it('accepts a valid sample', () => {
      const result = quizCreateFormSchema.safeParse(validSample);
      expect(result.success).toBe(true);
    });

    it('rejects over-length titles', () => {
      const result = quizCreateFormSchema.safeParse({
        ...validSample,
        title: 'x'.repeat(256),
      });
      expect(result.success).toBe(false);
    });

    it('rejects bad slug patterns', () => {
      const result = quizCreateFormSchema.safeParse({
        ...validSample,
        slug: 'NOT-A-SLUG',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing initialVersion', () => {
      const { initialVersion, ...rest } = validSample;
      const result = quizCreateFormSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it('structural: initialVersion shape matches initialQuizVersionFormSchema.shape', () => {
      // The two shapes must agree on every key. (The preset uses
      // zod `nativeEnum` for difficulty while the inner uses the same;
      // both must produce a valid object.)
      const presetShape = quizCreateFormSchema.shape.initialVersion.shape;
      const subShape = initialQuizVersionFormSchema.shape;
      expect(Object.keys(presetShape).sort()).toEqual(
        Object.keys(subShape).sort()
      );
    });

    it('rejects more than 50 tag slugs', () => {
      const result = quizCreateFormSchema.safeParse({
        ...validSample,
        tagSlugs: Array.from({ length: 51 }, (_, i) => `tag-${i}`),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('versionEditFormSchema', () => {
    it('accepts an empty patch (no changes)', () => {
      const result = versionEditFormSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts a partial patch', () => {
      const result = versionEditFormSchema.safeParse({
        difficulty: 'hard',
        changeNote: 'Tighten the difficulty.',
      });
      expect(result.success).toBe(true);
    });

    it('rejects unknown keys (strict mode)', () => {
      const result = versionEditFormSchema.safeParse({
        difficulty: 'hard',
        unknownKey: 'oops',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('questionFormSchema', () => {
    const validQuestion = {
      position: 1,
      questionText: 'When did WWII end?',
      imageUrl: null,
      answerOptions: {
        position: 1,
        value: '1945',
        isCorrect: true,
      },
      questionType: 'single_choice' as const,
    };

    it('accepts a valid sample', () => {
      const result = questionFormSchema.safeParse(validQuestion);
      expect(result.success).toBe(true);
    });

    it('rejects over-length questionText', () => {
      const result = questionFormSchema.safeParse({
        ...validQuestion,
        questionText: 'x'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty answer option value', () => {
      const result = questionFormSchema.safeParse({
        ...validQuestion,
        answerOptions: { ...validQuestion.answerOptions, value: '' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown questionType values', () => {
      const result = questionFormSchema.safeParse({
        ...validQuestion,
        questionType: 'essay' as unknown as 'single_choice',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('quizAnswerOptionFormSchema', () => {
    it('accepts a valid option', () => {
      const result = quizAnswerOptionFormSchema.safeParse({
        position: 1,
        value: 'Berlin',
        isCorrect: false,
      });
      expect(result.success).toBe(true);
    });

    it('rejects over-length value', () => {
      const result = quizAnswerOptionFormSchema.safeParse({
        position: 1,
        value: 'x'.repeat(1001),
        isCorrect: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('quizQuestionFormSchema', () => {
    it('defaults questionType to single_choice when omitted', () => {
      const result = quizQuestionFormSchema.safeParse({
        position: 1,
        questionText: 'Why?',
        imageUrl: null,
        answerOptions: {
          position: 1,
          value: 'Because',
          isCorrect: true,
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.questionType).toBe('single_choice');
      }
    });
  });

  describe('bulkQuestionsFormSchema', () => {
    const validRow = {
      position: 1,
      questionText: 'Why?',
      imageUrl: null,
      answerOptions: {
        position: 1,
        value: 'Because',
        isCorrect: true,
      },
      questionType: 'single_choice' as const,
    };

    it('accepts a single-row payload', () => {
      const result = bulkQuestionsFormSchema.safeParse({ items: [validRow] });
      expect(result.success).toBe(true);
    });

    it('rejects an empty items array', () => {
      const result = bulkQuestionsFormSchema.safeParse({ items: [] });
      expect(result.success).toBe(false);
    });

    it('rejects > 50 rows', () => {
      const result = bulkQuestionsFormSchema.safeParse({
        items: Array.from({ length: 51 }, () => validRow),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('reviewFormSchema', () => {
    it('accepts a 5-star review with no comment', () => {
      const result = reviewFormSchema.safeParse({
        rating: 5,
        comment: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects rating > 5', () => {
      const result = reviewFormSchema.safeParse({ rating: 6 });
      expect(result.success).toBe(false);
    });

    it('rejects rating < 1', () => {
      const result = reviewFormSchema.safeParse({ rating: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects over-length comments', () => {
      const result = reviewFormSchema.safeParse({
        rating: 4,
        comment: 'x'.repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('commentFormSchema', () => {
    it('accepts a top-level comment', () => {
      const result = commentFormSchema.safeParse({ body: 'Hello world' });
      expect(result.success).toBe(true);
    });

    it('accepts a reply with a parentCommentId', () => {
      const result = commentFormSchema.safeParse({
        body: 'Reply',
        parentCommentId: '11111111-1111-4111-8111-111111111111',
      });
      expect(result.success).toBe(true);
    });

    it('rejects a non-UUID parentCommentId', () => {
      const result = commentFormSchema.safeParse({
        body: 'Reply',
        parentCommentId: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty body', () => {
      const result = commentFormSchema.safeParse({ body: '' });
      expect(result.success).toBe(false);
    });

    it('rejects over-length body', () => {
      const result = commentFormSchema.safeParse({ body: 'x'.repeat(2001) });
      expect(result.success).toBe(false);
    });
  });
});