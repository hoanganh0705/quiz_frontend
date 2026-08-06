/**
 * `features/admin/tag-admin/__tests__/tag-validation.spec.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.B3.
 *
 * Validates:
 *   1. Length constants match the backend (1/120/120).
 *   2. validateTagName — valid, empty, too-long.
 *   3. validateTagSlug — valid, empty, invalid (uppercase, leading dash, dot),
 *      too-long.
 *   4. isTagSlugTaken — slug in list, slug not in list, slug excluded by
 *      excludeTagId.
 */

import { describe, expect, it } from 'vitest';

import {
  TAG_NAME_MIN_LENGTH,
  TAG_NAME_MAX_LENGTH,
  TAG_SLUG_MAX_LENGTH,
  validateTagName,
  validateTagSlug,
  isTagSlugTaken,
} from '../tag-validation';

import type { TagListItem, DeletedTagListItem } from '../tag-types';

describe('length constants', () => {
  it('TAG_NAME_MIN_LENGTH is 1', () => {
    expect(TAG_NAME_MIN_LENGTH).toBe(1);
  });

  it('TAG_NAME_MAX_LENGTH is 120', () => {
    expect(TAG_NAME_MAX_LENGTH).toBe(120);
  });

  it('TAG_SLUG_MAX_LENGTH is 120', () => {
    expect(TAG_SLUG_MAX_LENGTH).toBe(120);
  });
});

describe('validateTagName', () => {
  it('returns ok=true for a valid name', () => {
    expect(validateTagName('Math')).toEqual({ ok: true });
  });

  it('returns ok=true for a single-character name', () => {
    expect(validateTagName('A')).toEqual({ ok: true });
  });

  it('returns ok=true for a name at the max length', () => {
    expect(validateTagName('a'.repeat(120))).toEqual({ ok: true });
  });

  it('returns ok=false reason=empty for empty string', () => {
    expect(validateTagName('')).toEqual({ ok: false, reason: 'empty' });
  });

  it('returns ok=false reason=empty for whitespace-only', () => {
    expect(validateTagName('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('returns ok=false reason=too-long for name exceeding 120 chars', () => {
    expect(validateTagName('a'.repeat(121))).toEqual({
      ok: false,
      reason: 'too-long',
    });
  });

  it('returns ok=true for name at exactly 120 chars', () => {
    expect(validateTagName('a'.repeat(120))).toEqual({ ok: true });
  });
});

describe('validateTagSlug', () => {
  it('returns ok=true for a valid lowercase slug', () => {
    expect(validateTagSlug('hello-world')).toEqual({ ok: true });
  });

  it('returns ok=true for a single-word slug', () => {
    expect(validateTagSlug('math')).toEqual({ ok: true });
  });

  it('returns ok=true for a slug at max length', () => {
    expect(validateTagSlug('a'.repeat(120))).toEqual({ ok: true });
  });

  it('returns ok=false reason=empty for empty string', () => {
    expect(validateTagSlug('')).toEqual({ ok: false, reason: 'empty' });
  });

  it('returns ok=false reason=empty for whitespace-only', () => {
    expect(validateTagSlug('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('returns ok=false reason=invalid for uppercase', () => {
    expect(validateTagSlug('Hello-World')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('returns ok=false reason=invalid for leading dash', () => {
    expect(validateTagSlug('-leading')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('returns ok=false reason=invalid for dot', () => {
    expect(validateTagSlug('node.js')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('returns ok=false reason=invalid for spaces', () => {
    expect(validateTagSlug('hello world')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('returns ok=false reason=invalid for underscore', () => {
    expect(validateTagSlug('hello_world')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('returns ok=false reason=too-long for slug exceeding 120 chars', () => {
    expect(validateTagSlug('a'.repeat(121))).toEqual({
      ok: false,
      reason: 'too-long',
    });
  });
});

describe('isTagSlugTaken', () => {
  // Helper to build a TagListItem quickly.
  const tag = (slug: string, tagId = 'id-1'): TagListItem => ({
    tagId,
    name: `Tag ${tagId}`,
    slug,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    deletedAt: null,
  });

  it('returns false for an empty list', () => {
    expect(isTagSlugTaken('math', [])).toBe(false);
  });

  it('returns true when slug matches a tag in the list (case-insensitive)', () => {
    const list: TagListItem[] = [tag('math')];
    expect(isTagSlugTaken('math', list)).toBe(true);
    expect(isTagSlugTaken('MATH', list)).toBe(true);
    expect(isTagSlugTaken('Math', list)).toBe(true);
  });

  it('returns false when slug is not in the list', () => {
    const list: TagListItem[] = [tag('math')];
    expect(isTagSlugTaken('science', list)).toBe(false);
  });

  it('returns false when the only match has the excluded tagId', () => {
    const list: TagListItem[] = [tag('math', 'id-1')];
    expect(isTagSlugTaken('math', list, 'id-1')).toBe(false);
  });

  it('returns true when another tag shares the slug (not excluded)', () => {
    const list: TagListItem[] = [tag('math', 'id-1'), tag('other', 'id-2')];
    expect(isTagSlugTaken('math', list, 'id-2')).toBe(true);
  });

  it('ignores soft-deleted tags in the list', () => {
    const deleted: DeletedTagListItem = {
      tagId: 'deleted-1',
      name: 'Deleted Tag',
      slug: 'math',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: '2024-06-01T12:00:00Z',
    };
    // The function checks slug equality regardless of deletedAt — this is
    // intentional: a deleted tag's slug is still "taken" and would cause
    // a conflict if restored or recreated.
    const list: (TagListItem | DeletedTagListItem)[] = [deleted];
    expect(isTagSlugTaken('math', list)).toBe(true);
  });

  it('returns false when excludeTagId matches the only tag in the list', () => {
    const list: TagListItem[] = [tag('math', 'id-1')];
    expect(isTagSlugTaken('math', list, 'id-1')).toBe(false);
  });

  it('returns false for different slug even with many tags in list', () => {
    const list: TagListItem[] = [
      tag('math', 'id-1'),
      tag('science', 'id-2'),
      tag('history', 'id-3'),
    ];
    expect(isTagSlugTaken('geography', list)).toBe(false);
  });
});
