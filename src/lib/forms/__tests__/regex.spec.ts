/**
 * `regex.ts` — locks the contract for the tag-slug regex.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source ticket: TKT-4.2.A5.
 *
 * Coverage contract:
 *
 *   (1) `TAG_SLUG_REGEX.test` accepts the documented fixtures.
 *   (2) `TAG_SLUG_REGEX.test` rejects the documented anti-fixtures.
 *   (3) `isValidTagSlug` is a thin wrapper over `TAG_SLUG_REGEX.test`.
 *   (4) `tagSlugSchema` rejects the same anti-fixtures the regex rejects.
 *   (5) The regex source string is byte-equal to the `@pattern`
 *       annotation in the generated `createQuizDto.slug` field. This is
 *       the cross-cutting invariant — if the backend changes the
 *       pattern, the diff appears in this test.
 *
 * Tests are pure: no React, no DOM, no mocks.
 */

import { describe, expect, it } from 'vitest';

import {
  TAG_SLUG_REGEX,
  isValidTagSlug,
  tagSlugSchema,
} from '../regex';

describe('forms/regex — TAG_SLUG_REGEX fixture matrix', () => {
  const accepted: ReadonlyArray<string> = ['foo', 'foo-bar', 'a', '1', 'a1', 'a-1-b', 'foo-bar-baz'];

  const rejected: ReadonlyArray<string> = [
    'Foo',        // uppercase
    'foo--bar',   // double hyphen
    '-foo',       // leading hyphen
    'foo-',       // trailing hyphen
    'foo bar',    // whitespace
    'foo_bar',    // underscore
    '',           // empty
    'foo.bar',    // period
    'foo/bar',    // slash
    'FOO',        // all-caps
  ];

  for (const value of accepted) {
    it(`accepts ${JSON.stringify(value)}`, () => {
      expect(TAG_SLUG_REGEX.test(value)).toBe(true);
    });
  }

  for (const value of rejected) {
    it(`rejects ${JSON.stringify(value)}`, () => {
      expect(TAG_SLUG_REGEX.test(value)).toBe(false);
    });
  }
});

describe('forms/regex — isValidTagSlug wrapper', () => {
  it('returns true for accepted values', () => {
    expect(isValidTagSlug('foo')).toBe(true);
    expect(isValidTagSlug('foo-bar')).toBe(true);
  });

  it('returns false for rejected values', () => {
    expect(isValidTagSlug('Foo')).toBe(false);
    expect(isValidTagSlug('foo--bar')).toBe(false);
  });
});

describe('forms/regex — tagSlugSchema', () => {
  it('parses accepted values', () => {
    expect(tagSlugSchema.parse('foo')).toBe('foo');
    expect(tagSlugSchema.parse('foo-bar')).toBe('foo-bar');
  });

  it('rejects rejected values with the centralised copy', () => {
    const result = tagSlugSchema.safeParse('Foo');
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? '';
      expect(message).toContain('lowercase alphanumeric');
    }
  });

  it('rejects an empty string', () => {
    expect(tagSlugSchema.safeParse('').success).toBe(false);
  });
});

describe('forms/regex — byte-equal parity with createQuizDto.slug @pattern', () => {
  it('TAG_SLUG_REGEX.source matches the @pattern annotation', async () => {
    // Read the generated schema's text to verify the `@pattern`
    // annotation is byte-equal to the regex source. Dynamic import is
    // unsafe because `CreateQuizDto` is a TS-only interface (no
    // runtime export), so we read the file via `fs` instead.
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const schemaPath = fileURLToPath(
      new URL(
        '../../api/generated/schemas/createQuizDto.ts',
        import.meta.url
      )
    );
    const source = readFileSync(schemaPath, 'utf8');
    expect(source).toContain('@pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$');
    expect(TAG_SLUG_REGEX.source).toBe('^[a-z0-9]+(?:-[a-z0-9]+)*$');
  });
});