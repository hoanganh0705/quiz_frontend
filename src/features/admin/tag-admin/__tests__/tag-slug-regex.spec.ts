/**
 * `features/admin/tag-admin/__tests__/tag-slug-regex.spec.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.B2.
 *
 * Validates:
 *   1. Re-export parity — TAG_SLUG_REGEX and isValidTagSlug match the
 *      Phase 3 source exactly.
 *   2. deriveTagSlug transformation correctness.
 *   3. Every derived slug satisfies isValidTagSlug.
 */

import { describe, expect, it } from 'vitest';

import {
  TAG_SLUG_REGEX,
  isValidTagSlug,
  deriveTagSlug,
} from '../tag-slug-regex';

// ─── Phase 3 source parity ───────────────────────────────────────────────────────

describe('re-export parity — TAG_SLUG_REGEX', () => {
  it('is defined as a RegExp', () => {
    expect(TAG_SLUG_REGEX).toBeInstanceOf(RegExp);
  });

  it('matches the canonical Phase 3 pattern', () => {
    expect(TAG_SLUG_REGEX.source).toBe('^[a-z0-9]+(?:-[a-z0-9]+)*$');
  });

  it('accepts a simple lowercase word', () => {
    expect(TAG_SLUG_REGEX.test('javascript')).toBe(true);
  });

  it('accepts kebab-case', () => {
    expect(TAG_SLUG_REGEX.test('web-development')).toBe(true);
  });

  it('rejects uppercase', () => {
    expect(TAG_SLUG_REGEX.test('JavaScript')).toBe(false);
  });

  it('rejects leading hyphens', () => {
    expect(TAG_SLUG_REGEX.test('-javascript')).toBe(false);
  });

  it('rejects trailing hyphens', () => {
    expect(TAG_SLUG_REGEX.test('javascript-')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(TAG_SLUG_REGEX.test('web development')).toBe(false);
  });

  it('rejects underscores', () => {
    expect(TAG_SLUG_REGEX.test('web_development')).toBe(false);
  });

  it('rejects dots', () => {
    expect(TAG_SLUG_REGEX.test('node.js')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(TAG_SLUG_REGEX.test('')).toBe(false);
  });

  it('rejects single char digit', () => {
    expect(TAG_SLUG_REGEX.test('5')).toBe(true);
  });
});

describe('re-export parity — isValidTagSlug', () => {
  it('returns true for valid lowercase slug', () => {
    expect(isValidTagSlug('hello-world')).toBe(true);
  });

  it('returns false for uppercase', () => {
    expect(isValidTagSlug('Hello-World')).toBe(false);
  });

  it('returns false for spaces', () => {
    expect(isValidTagSlug('hello world')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidTagSlug('')).toBe(false);
  });
});

// ─── deriveTagSlug ─────────────────────────────────────────────────────────────

describe('deriveTagSlug — basic transformations', () => {
  it('lowercases input', () => {
    expect(deriveTagSlug('JAVASCRIPT')).toBe('javascript');
  });

  it('replaces spaces with hyphens', () => {
    expect(deriveTagSlug('Hello World')).toBe('hello-world');
  });

  it('replaces underscores with hyphens', () => {
    expect(deriveTagSlug('hello_world')).toBe('hello-world');
  });

  it('collapses multiple spaces into one hyphen', () => {
    expect(deriveTagSlug('Hello   World')).toBe('hello-world');
  });

  it('collapses consecutive hyphens', () => {
    expect(deriveTagSlug('Hello---World')).toBe('hello-world');
  });

  it('trims leading hyphens', () => {
    expect(deriveTagSlug('  Hello')).toBe('hello');
  });

  it('trims trailing hyphens', () => {
    expect(deriveTagSlug('Hello  ')).toBe('hello');
  });
});

describe('deriveTagSlug — ticket acceptance criteria', () => {
  it("deriveTagSlug('Hello World') returns 'hello-world'", () => {
    expect(deriveTagSlug('Hello World')).toBe('hello-world');
  });

  it("deriveTagSlug('  Trim & Lower   ') returns 'trim-lower'", () => {
    expect(deriveTagSlug('  Trim & Lower   ')).toBe('trim-lower');
  });

  it("deriveTagSlug('Café Latté') handles diacritics", () => {
    // 'é' (U+00E9, precomposed) NFD-normalises to
    // 'e' (U+0065) + combining acute (U+0301).
    // Our [\u0300-\u036f] range strips the combining acute.
    // The base 'e' is retained, but the accent is lost.
    // 'Café Latté' → NFD → 'Café Latté' (accent combining)
    //   → strip accents → 'Café Latt' (no acute)
    //   → lowercase → 'café latt' → 'cafe-latte'
    expect(deriveTagSlug('Café Latté')).toBe('cafe-latte');
  });
});

describe('deriveTagSlug — unicode and diacritics', () => {
  it('handles German umlaut ü', () => {
    expect(deriveTagSlug('München')).toBe('munchen');
  });

  it('handles Spanish ñ', () => {
    expect(deriveTagSlug('Español')).toBe('espanol');
  });

  it('handles mixed diacritics', () => {
    expect(deriveTagSlug('naïve résumé')).toBe('naive-resume');
  });

  it('handles CJK characters (stripped)', () => {
    expect(deriveTagSlug('日本語')).toBe('');
  });

  it('handles emoji (stripped)', () => {
    expect(deriveTagSlug('react🚀')).toBe('react');
  });
});

describe('deriveTagSlug — edge cases', () => {
  it('returns empty string for whitespace-only input', () => {
    expect(deriveTagSlug('   ')).toBe('');
  });

  it('handles single character', () => {
    expect(deriveTagSlug('A')).toBe('a');
  });

  it('handles alphanumeric with dots', () => {
    expect(deriveTagSlug('node.js')).toBe('nodejs');
  });

  it('handles parentheses', () => {
    expect(deriveTagSlug('C++ (plus)')).toBe('c-plus');
  });

  it('handles numbers in name', () => {
    expect(deriveTagSlug('HTML5 Basics')).toBe('html5-basics');
  });

  it('handles mixed separators', () => {
    expect(deriveTagSlug('foo_bar-baz qux')).toBe('foo-bar-baz-qux');
  });
});

describe('deriveTagSlug — every output satisfies isValidTagSlug', () => {
  const cases = [
    'Hello World',
    '  Trim & Lower   ',
    'Café Latté',
    'JavaScript',
    'web-development',
    'python-3-11',
    '  spaces  around  ',
    'UPPERCASE',
    'München',
    'Español',
    'naïve résumé',
    'HTML5 Basics',
    'node.js',
    'react🚀',
    'C++ (plus)',
    'foo_bar-baz',
  ];

  cases.forEach((name) => {
    it(`'${name}' → '${deriveTagSlug(name)}' satisfies isValidTagSlug`, () => {
      const slug = deriveTagSlug(name);
      expect(isValidTagSlug(slug)).toBe(true);
    });
  });
});
