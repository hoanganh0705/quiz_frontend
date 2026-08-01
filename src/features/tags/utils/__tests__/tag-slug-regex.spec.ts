/**
 * `tag-slug-regex` contract tests.
 *
 * Source epic: Epic 3.4 — Tag browse + detail (read-only).
 * Source ticket: TKT-3.4.F1.
 *
 * Locks the regex source + the `isValidTagSlug` contract so the
 * defensive client-side filter validation (TKT-3.4.C1) cannot
 * silently regress to a permissive regex. The regex is the single
 * source of truth mirrored against the backend's slug pipe — see
 * `tag-slug-regex.ts` for the drift note.
 */

import { describe, expect, it } from 'vitest'

import { TAG_SLUG_REGEX, isValidTagSlug } from '../tag-slug-regex'

describe('tag-slug-regex — TAG_SLUG_REGEX source', () => {
  it('is anchored to the canonical kebab-case regex', () => {
    // The regex MUST be `^[a-z0-9]+(?:-[a-z0-9]+)*$` — no flags,
    // no Unicode mode, no looser anchors. A future change here
    // must be a deliberate, code-reviewed decision.
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
    'Hello', // uppercase
    'Hello World', // uppercase + space
    'hello_world', // underscore
    'hello--world', // double dash
    'hello-', // trailing dash
    '-hello', // leading dash
    'hello.world', // dot
    'héllo', // non-ASCII / combining mark
    '', // empty string (filter input's empty state)
    'hello world', // space inside
    'hello\nworld', // newline
    'hello\tworld', // tab
    'javascript!', // punctuation
    'Tag', // single uppercase letter
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
