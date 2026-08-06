/**
 * `features/admin/category-admin/__tests__/category-slug-regex.spec.ts`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.B2.
 *
 * Validates:
 *   1. Re-export parity — CATEGORY_SLUG_REGEX and isValidCategorySlug
 *      match the Phase 3 source exactly.
 *   2. deriveCategorySlug transformation correctness.
 *   3. Every derived slug satisfies isValidCategorySlug.
 *
 * Pure-TypeScript spec; runs in the node project (no jsdom required).
 */

import { describe, expect, it } from 'vitest';

import {
  CATEGORY_SLUG_REGEX,
  isValidCategorySlug,
  deriveCategorySlug,
} from '../category-slug-regex';

// ─── Phase 3 source parity ───────────────────────────────────────────────────────

describe('re-export parity — CATEGORY_SLUG_REGEX', () => {
  it('is defined as a RegExp', () => {
    expect(CATEGORY_SLUG_REGEX).toBeInstanceOf(RegExp);
  });

  it('matches the canonical Phase 3 pattern', () => {
    expect(CATEGORY_SLUG_REGEX.source).toBe('^[a-z0-9]+(?:-[a-z0-9]+)*$');
  });

  it('accepts a simple lowercase word', () => {
    expect(CATEGORY_SLUG_REGEX.test('science')).toBe(true);
  });

  it('accepts kebab-case', () => {
    expect(CATEGORY_SLUG_REGEX.test('natural-sciences')).toBe(true);
  });

  it('rejects uppercase', () => {
    expect(CATEGORY_SLUG_REGEX.test('Science')).toBe(false);
  });

  it('rejects leading hyphens', () => {
    expect(CATEGORY_SLUG_REGEX.test('-science')).toBe(false);
  });

  it('rejects trailing hyphens', () => {
    expect(CATEGORY_SLUG_REGEX.test('science-')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(CATEGORY_SLUG_REGEX.test('natural sciences')).toBe(false);
  });

  it('rejects underscores', () => {
    expect(CATEGORY_SLUG_REGEX.test('natural_sciences')).toBe(false);
  });

  it('rejects dots', () => {
    expect(CATEGORY_SLUG_REGEX.test('category.io')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(CATEGORY_SLUG_REGEX.test('')).toBe(false);
  });

  it('accepts a single digit character', () => {
    expect(CATEGORY_SLUG_REGEX.test('5')).toBe(true);
  });
});

describe('re-export parity — isValidCategorySlug', () => {
  it('returns true for valid lowercase slug', () => {
    expect(isValidCategorySlug('hello-world')).toBe(true);
  });

  it('returns false for uppercase', () => {
    expect(isValidCategorySlug('Hello-World')).toBe(false);
  });

  it('returns false for spaces', () => {
    expect(isValidCategorySlug('hello world')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidCategorySlug('')).toBe(false);
  });
});

// ─── deriveCategorySlug ─────────────────────────────────────────────────────────

describe('deriveCategorySlug — basic transformations', () => {
  it('lowercases input', () => {
    expect(deriveCategorySlug('SCIENCE')).toBe('science');
  });

  it('replaces spaces with hyphens', () => {
    expect(deriveCategorySlug('Hello World')).toBe('hello-world');
  });

  it('replaces underscores with hyphens', () => {
    expect(deriveCategorySlug('hello_world')).toBe('hello-world');
  });

  it('collapses multiple spaces into one hyphen', () => {
    expect(deriveCategorySlug('Hello   World')).toBe('hello-world');
  });

  it('collapses consecutive hyphens', () => {
    expect(deriveCategorySlug('Hello---World')).toBe('hello-world');
  });

  it('trims leading hyphens', () => {
    expect(deriveCategorySlug('  Hello')).toBe('hello');
  });

  it('trims trailing hyphens', () => {
    expect(deriveCategorySlug('Hello  ')).toBe('hello');
  });
});

describe('deriveCategorySlug — ticket acceptance criteria', () => {
  it("deriveCategorySlug('Hello World') returns 'hello-world'", () => {
    expect(deriveCategorySlug('Hello World')).toBe('hello-world');
  });

  it("deriveCategorySlug('  Trim & Lower   ') returns 'trim-lower'", () => {
    expect(deriveCategorySlug('  Trim & Lower   ')).toBe('trim-lower');
  });

  it("deriveCategorySlug('Café Latté') handles diacritics", () => {
    // 'é' (U+00E9, precomposed) NFD-normalises to
    // 'e' (U+0065) + combining acute (U+0301).
    // Our [\u0300-\u036f] range strips the combining acute.
    // The base 'e' is retained, but the accent is lost.
    expect(deriveCategorySlug('Café Latté')).toBe('cafe-latte');
  });
});

describe('deriveCategorySlug — unicode and diacritics', () => {
  it('handles German umlaut ü', () => {
    expect(deriveCategorySlug('München')).toBe('munchen');
  });

  it('handles Spanish ñ', () => {
    expect(deriveCategorySlug('Español')).toBe('espanol');
  });

  it('handles mixed diacritics', () => {
    expect(deriveCategorySlug('naïve résumé')).toBe('naive-resume');
  });

  it('handles CJK characters (stripped)', () => {
    expect(deriveCategorySlug('日本語')).toBe('');
  });

  it('handles emoji (stripped)', () => {
    expect(deriveCategorySlug('science🚀')).toBe('science');
  });
});

describe('deriveCategorySlug — edge cases', () => {
  it('returns empty string for whitespace-only input', () => {
    expect(deriveCategorySlug('   ')).toBe('');
  });

  it('handles single character', () => {
    expect(deriveCategorySlug('A')).toBe('a');
  });

  it('handles alphanumeric with dots', () => {
    expect(deriveCategorySlug('category.io')).toBe('categoryio');
  });

  it('handles parentheses', () => {
    expect(deriveCategorySlug('Math (Algebra)')).toBe('math-algebra');
  });

  it('handles numbers in name', () => {
    expect(deriveCategorySlug('Web 3.0 Basics')).toBe('web-30-basics');
  });

  it('handles mixed separators', () => {
    expect(deriveCategorySlug('foo_bar-baz qux')).toBe('foo-bar-baz-qux');
  });
});

describe('deriveCategorySlug — every output satisfies isValidCategorySlug', () => {
  const cases = [
    'Hello World',
    '  Trim & Lower   ',
    'Café Latté',
    'Science',
    'natural-sciences',
    'web-3-11',
    '  spaces  around  ',
    'UPPERCASE',
    'München',
    'Español',
    'naïve résumé',
    'Web 3.0 Basics',
    'category.io',
    'science🚀',
    'Math (Algebra)',
    'foo_bar-baz',
  ];

  cases.forEach((name) => {
    it(`'${name}' → '${deriveCategorySlug(name)}' satisfies isValidCategorySlug`, () => {
      const slug = deriveCategorySlug(name);
      expect(isValidCategorySlug(slug)).toBe(true);
    });
  });
});