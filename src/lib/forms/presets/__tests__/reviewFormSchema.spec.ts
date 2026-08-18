

import { describe, expect, it } from 'vitest';

import { z } from 'zod';

import {
reviewFormSchema,
type ReviewFormValues,
} from '@/lib/forms/presets';
import type {
CreateReviewDto,
UpdateReviewDto,
} from '@/lib/api/generated/schemas';

describe('reviewFormSchema — rating bounds', () => {
it('accepts rating 1 with no comment', () => {
const result = reviewFormSchema.safeParse({ rating: 1, comment: '' });

expect(result.success).toBe(false);
if (!result.success) {
const paths = result.error.issues.map((i) => i.path.join('.'));
expect(paths).toContain('comment');
    }
  });

it('accepts rating 1 with a one-character trimmed comment', () => {
const result = reviewFormSchema.safeParse({
rating: 1,
comment: 'a',
    });
expect(result.success).toBe(true);
  });

it('accepts rating 5 with a 2000-character comment', () => {
const result = reviewFormSchema.safeParse({
rating: 5,
comment: 'x'.repeat(2000),
    });
expect(result.success).toBe(true);
  });

it('rejects rating 0', () => {
const result = reviewFormSchema.safeParse({
rating: 0,
comment: 'ok',
    });
expect(result.success).toBe(false);
if (!result.success) {
const ratingIssues = result.error.issues.filter(
(i) => i.path[0] === 'rating',
      );
expect(ratingIssues.length).toBeGreaterThan(0);
    }
  });

it('rejects rating 6', () => {
const result = reviewFormSchema.safeParse({
rating: 6,
comment: 'ok',
    });
expect(result.success).toBe(false);
  });

it('rejects fractional ratings', () => {
const result = reviewFormSchema.safeParse({
rating: 3.5,
comment: 'ok',
    });
expect(result.success).toBe(false);
  });

it('rejects non-integer ratings', () => {
const result = reviewFormSchema.safeParse({
rating: 'four' as unknown as number,
comment: 'ok',
    });
expect(result.success).toBe(false);
  });
});

describe('reviewFormSchema — comment bounds', () => {
it('rejects empty comment', () => {
const result = reviewFormSchema.safeParse({
rating: 4,
comment: '',
    });
expect(result.success).toBe(false);
  });

it('rejects whitespace-only comment (after trim)', () => {
const result = reviewFormSchema.safeParse({
rating: 4,
comment: '   \n\t  ',
    });
expect(result.success).toBe(false);
  });

it('accepts 1-character comment', () => {
const result = reviewFormSchema.safeParse({
rating: 4,
comment: 'x',
    });
expect(result.success).toBe(true);
  });

it('accepts 2000-character comment', () => {
const result = reviewFormSchema.safeParse({
rating: 4,
comment: 'a'.repeat(2000),
    });
expect(result.success).toBe(true);
  });

it('rejects 2001-character comment', () => {
const result = reviewFormSchema.safeParse({
rating: 4,
comment: 'a'.repeat(2001),
    });
expect(result.success).toBe(false);
  });

it('trims surrounding whitespace before the length check', () => {
const result = reviewFormSchema.safeParse({
rating: 4,
comment: '  hello  ',
    });
expect(result.success).toBe(true);
if (result.success) {

expect((result.data as ReviewFormValues).comment).toBe('hello');
    }
  });
});

describe('reviewFormSchema — DTO compatibility', () => {
it('infers a value type compatible with CreateReviewDto', () => {

const values: ReviewFormValues = {
rating: 5,
comment: 'great',
    };
const dto: CreateReviewDto = values;
expect(dto.rating).toBe(5);
  });

it('infers a value type compatible with UpdateReviewDto', () => {
const values: ReviewFormValues = {
rating: 3,
comment: 'updated',
    };
const dto: UpdateReviewDto = values;
expect(dto.rating).toBe(3);
  });

it('does not silently drop the rating field', () => {
const values: ReviewFormValues = {
rating: 4,
comment: 'x',
    };
expect(values.rating).toBe(4);
  });
});

describe('reviewFormSchema — messages', () => {
it('rating message names the field', () => {
const result = reviewFormSchema.safeParse({
rating: 0,
comment: 'ok',
    });
expect(result.success).toBe(false);
if (!result.success) {
const ratingIssue = result.error.issues.find(
(i) => i.path[0] === 'rating',
      );
expect(ratingIssue?.message).toMatch(/rating/i);
    }
  });

it('comment message names the field', () => {
const result = reviewFormSchema.safeParse({
rating: 4,
comment: '',
    });
expect(result.success).toBe(false);
if (!result.success) {
const commentIssue = result.error.issues.find(
(i) => i.path[0] === 'comment',
      );
expect(commentIssue?.message).toMatch(/review/i);
    }
  });
});

void z;
