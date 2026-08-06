/**
 * `features/admin/category-admin/__tests__/category-validation.spec.ts`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.B3.
 *
 * Unit tests for `category-validation.ts`. Covers all five validation
 * functions and the local slug uniqueness pre-check.
 */

import { describe, expect, it } from 'vitest';

import type { CategoryAdminListItem } from '../category-types';
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_IMAGE_URL_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NAME_MIN_LENGTH,
  CATEGORY_SLUG_MAX_LENGTH,
  isCategorySlugTaken,
  validateCategoryDescription,
  validateCategoryImageUrl,
  validateCategoryName,
  validateCategorySlug,
} from '../category-validation';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeActiveCategory(overrides: Partial<CategoryAdminListItem> = {}): CategoryAdminListItem {
  return {
    categoryId: 'cat-1',
    name: 'Mathematics',
    description: 'Math category',
    slug: 'mathematics',
    imageUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

// ─── Length constants ─────────────────────────────────────────────────────────

describe('length constants', () => {
  it('matches the backend constraints recorded in A1', () => {
    expect(CATEGORY_NAME_MIN_LENGTH).toBe(1);
    expect(CATEGORY_NAME_MAX_LENGTH).toBe(120);
    expect(CATEGORY_SLUG_MAX_LENGTH).toBe(120);
    expect(CATEGORY_DESCRIPTION_MAX_LENGTH).toBe(500);
    expect(CATEGORY_IMAGE_URL_MAX_LENGTH).toBe(2048);
  });
});

// ─── validateCategoryName ─────────────────────────────────────────────────────

describe('validateCategoryName', () => {
  it('returns ok: true for a normal name', () => {
    expect(validateCategoryName('Math')).toEqual({ ok: true });
  });

  it('returns ok: true at the maximum length', () => {
    const name = 'a'.repeat(CATEGORY_NAME_MAX_LENGTH);
    expect(validateCategoryName(name)).toEqual({ ok: true });
  });

  it('rejects an empty string', () => {
    expect(validateCategoryName('')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects whitespace-only input', () => {
    expect(validateCategoryName('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects a name longer than the max length', () => {
    const name = 'a'.repeat(CATEGORY_NAME_MAX_LENGTH + 1);
    expect(validateCategoryName(name)).toEqual({ ok: false, reason: 'too-long' });
  });
});

// ─── validateCategorySlug ─────────────────────────────────────────────────────

describe('validateCategorySlug', () => {
  it('returns ok: true for a valid lowercase slug', () => {
    expect(validateCategorySlug('hello-world')).toEqual({ ok: true });
  });

  it('returns ok: true for a slug of single characters', () => {
    expect(validateCategorySlug('a')).toEqual({ ok: true });
    expect(validateCategorySlug('1')).toEqual({ ok: true });
  });

  it('returns ok: true for a slug with multiple hyphens', () => {
    expect(validateCategorySlug('a-b-c-d')).toEqual({ ok: true });
  });

  it('returns ok: true at the maximum length', () => {
    const slug = 'a'.repeat(CATEGORY_SLUG_MAX_LENGTH);
    expect(validateCategorySlug(slug)).toEqual({ ok: true });
  });

  it('rejects an empty string', () => {
    expect(validateCategorySlug('')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects a slug with uppercase characters', () => {
    expect(validateCategorySlug('Hello-World')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects a slug with leading hyphens', () => {
    expect(validateCategorySlug('-hello-world')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects a slug with trailing hyphens', () => {
    expect(validateCategorySlug('hello-world-')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects a slug with consecutive hyphens', () => {
    expect(validateCategorySlug('hello--world')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects a slug with spaces', () => {
    expect(validateCategorySlug('hello world')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects a slug with special characters', () => {
    expect(validateCategorySlug('hello_world!')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('rejects a slug longer than the max length', () => {
    const slug = 'a'.repeat(CATEGORY_SLUG_MAX_LENGTH + 1);
    expect(validateCategorySlug(slug)).toEqual({ ok: false, reason: 'too-long' });
  });
});

// ─── validateCategoryDescription ──────────────────────────────────────────────

describe('validateCategoryDescription', () => {
  it('returns ok: true for null', () => {
    expect(validateCategoryDescription(null)).toEqual({ ok: true });
  });

  it('returns ok: true for an empty string', () => {
    expect(validateCategoryDescription('')).toEqual({ ok: true });
  });

  it('returns ok: true for a whitespace-only string (treated as empty)', () => {
    expect(validateCategoryDescription('   ')).toEqual({ ok: true });
  });

  it('returns ok: true for a normal description', () => {
    expect(validateCategoryDescription('A short description')).toEqual({ ok: true });
  });

  it('returns ok: true at the maximum length', () => {
    const description = 'a'.repeat(CATEGORY_DESCRIPTION_MAX_LENGTH);
    expect(validateCategoryDescription(description)).toEqual({ ok: true });
  });

  it('rejects a description longer than the max length', () => {
    const description = 'a'.repeat(CATEGORY_DESCRIPTION_MAX_LENGTH + 1);
    expect(validateCategoryDescription(description)).toEqual({
      ok: false,
      reason: 'too-long',
    });
  });
});

// ─── validateCategoryImageUrl ─────────────────────────────────────────────────

describe('validateCategoryImageUrl', () => {
  it('returns ok: true for null', () => {
    expect(validateCategoryImageUrl(null)).toEqual({ ok: true });
  });

  it('returns ok: true for an empty string', () => {
    expect(validateCategoryImageUrl('')).toEqual({ ok: true });
  });

  it('returns ok: true for a normal https URL', () => {
    expect(validateCategoryImageUrl('https://example.com/image.png')).toEqual({
      ok: true,
    });
  });

  it('returns ok: true for an http URL', () => {
    expect(validateCategoryImageUrl('http://example.com/image.png')).toEqual({
      ok: true,
    });
  });

  it('rejects an obviously malformed URL', () => {
    expect(validateCategoryImageUrl('not-a-url')).toEqual({
      ok: false,
      reason: 'invalid-url',
    });
  });

  it('rejects a URL with a non-http(s) protocol', () => {
    expect(validateCategoryImageUrl('ftp://example.com/image.png')).toEqual({
      ok: false,
      reason: 'invalid-url',
    });
    expect(validateCategoryImageUrl('javascript:alert(1)')).toEqual({
      ok: false,
      reason: 'invalid-url',
    });
  });

  it('rejects a URL longer than the max length', () => {
    const url = 'https://example.com/' + 'a'.repeat(CATEGORY_IMAGE_URL_MAX_LENGTH);
    expect(validateCategoryImageUrl(url)).toEqual({ ok: false, reason: 'too-long' });
  });
});

// ─── isCategorySlugTaken ──────────────────────────────────────────────────────

describe('isCategorySlugTaken', () => {
  const list: CategoryAdminListItem[] = [
    makeActiveCategory({ categoryId: 'cat-1', slug: 'mathematics' }),
    makeActiveCategory({ categoryId: 'cat-2', slug: 'science' }),
    makeActiveCategory({ categoryId: 'cat-3', slug: 'history' }),
  ];

  it('returns true when another row owns the slug', () => {
    expect(isCategorySlugTaken('science', list)).toBe(true);
  });

  it('compares case-insensitively', () => {
    expect(isCategorySlugTaken('SCIENCE', list)).toBe(true);
    expect(isCategorySlugTaken('Science', list)).toBe(true);
  });

  it('returns false when no row owns the slug', () => {
    expect(isCategorySlugTaken('philosophy', list)).toBe(false);
  });

  it('excludes the row being edited', () => {
    expect(isCategorySlugTaken('mathematics', list, 'cat-1')).toBe(false);
  });

  it('still flags a conflict when the exclusion id is not the owner', () => {
    expect(isCategorySlugTaken('mathematics', list, 'cat-99')).toBe(true);
  });

  it('returns true for a soft-deleted row with the same slug', () => {
    const listWithDeleted: CategoryAdminListItem[] = [
      ...list,
      {
        ...makeActiveCategory({ categoryId: 'cat-deleted', slug: 'archived' }),
        deletedAt: '2026-02-01T00:00:00.000Z',
      },
    ];
    expect(isCategorySlugTaken('archived', listWithDeleted)).toBe(true);
  });

  it('returns false for an empty list', () => {
    expect(isCategorySlugTaken('mathematics', [])).toBe(false);
  });
});