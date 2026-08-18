

import { describe, expect, it } from 'vitest';

import {
TAG_SLUG_REGEX,
isValidTagSlug,
tagSlugSchema,
} from '../regex';

describe('forms/regex — TAG_SLUG_REGEX fixture matrix', () => {
const accepted: ReadonlyArray<string> = ['foo', 'foo-bar', 'a', '1', 'a1', 'a-1-b', 'foo-bar-baz'];

const rejected: ReadonlyArray<string> = [
'Foo',
'foo--bar',
'-foo',
'foo-',
'foo bar',
'foo_bar',
'',
'foo.bar',
'foo/bar',
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