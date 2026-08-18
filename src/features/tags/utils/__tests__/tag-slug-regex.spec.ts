

import { describe, expect, it } from 'vitest'

import { TAG_SLUG_REGEX, isValidTagSlug } from '../tag-slug-regex'

describe('tag-slug-regex — TAG_SLUG_REGEX source', () => {
it('is anchored to the canonical kebab-case regex', () => {

expect(TAG_SLUG_REGEX.source).toBe('^[a-z0-9]+(?:-[a-z0-9]+)*$')
  })

it('has no flags (no `i`, `u`, `m`, etc.)', () => {
expect(TAG_SLUG_REGEX.flags).toBe('')
  })
})

describe('tag-slug-regex — isValidTagSlug accepts valid inputs', () => {
const valid: readonly string[] = [
'tag',
'tag-2',
'a-b-c',
'123',
'abc123def',
'a-1-b-2',
'a1b2c3',
'0',
'a',
  ]

it.each(valid)('returns true for %j', (slug) => {
expect(isValidTagSlug(slug)).toBe(true)
  })
})

describe('tag-slug-regex — isValidTagSlug rejects invalid inputs', () => {
const invalid: readonly string[] = [
'Hello',
'Hello World',
'hello_world',
'hello--world',
'hello-',
'-hello',
'hello.world',
'héllo',
'',
'hello world',
'hello\nworld',
'hello\tworld',
'javascript!',
'Tag',
'TAG', // all uppercase
  ]

it.each(invalid)('returns false for %j', (slug) => {
expect(isValidTagSlug(slug)).toBe(false)
  })
})

describe('tag-slug-regex — empty-string border', () => {
it('returns false for an empty string (the filter input supports the initial empty state without flashing the helper)', () => {
expect(isValidTagSlug('')).toBe(false)
  })
})
