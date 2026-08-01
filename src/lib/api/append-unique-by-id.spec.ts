/**
 * `appendUniqueById` contract suite.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive (`useCursorPaginated`).
 * Source story:  PHASE_3_EPICS.md → Story 3.2, line 214.
 * Source ticket: TKT-3.2.B2.
 *
 * Locks the six documented behaviours of the helper so `useCursorPaginated`'s
 * `loadMore` path has a verified primitive to call. A future regression in
 * the helper (e.g. accidental mutation, or losing first-occurrence ordering)
 * will fail one of these cases immediately.
 *
 * The file is picked up by the `node` vitest project (no DOM required).
 */

import { describe, expect, it } from 'vitest'

import { appendUniqueById } from './append-unique-by-id'

// A small `T` shape with an `extra` field exercises the generic structural
// typing — the helper must preserve the extra field on returned items.
type Item = { id: string; extra?: number }

describe('appendUniqueById', () => {
  it('case a: next is fully new — output is prev + next in order', () => {
    const prev: Item[] = [{ id: 'a' }]
    const next: Item[] = [{ id: 'b' }, { id: 'c' }]
    const out = appendUniqueById(prev, next)
    expect(out).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  })

  it('case b: next has partial overlap — overlapping items are dropped', () => {
    const prev: Item[] = [{ id: 'a' }, { id: 'b' }]
    const next: Item[] = [{ id: 'b' }, { id: 'c' }]
    const out = appendUniqueById(prev, next)
    expect(out).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
  })

  it('case c: next is fully overlapping — output equals prev', () => {
    const prev: Item[] = [{ id: 'a' }, { id: 'b' }]
    const next: Item[] = [{ id: 'a' }, { id: 'b' }]
    const out = appendUniqueById(prev, next)
    expect(out).toEqual([{ id: 'a' }, { id: 'b' }])
  })

  it('case d: next has internal duplicates — only the first occurrence is kept', () => {
    const prev: Item[] = []
    const next: Item[] = [
      { id: 'a', extra: 1 },
      { id: 'a', extra: 2 }, // duplicate id; should be dropped
      { id: 'b', extra: 3 }
    ]
    const out = appendUniqueById(prev, next)
    expect(out).toEqual([
      { id: 'a', extra: 1 },
      { id: 'b', extra: 3 }
    ])
  })

  it('case e: both inputs empty — output is []', () => {
    const out = appendUniqueById<Item>([], [])
    expect(out).toEqual([])
  })

  it('case f: inputs are not mutated', () => {
    const prev: Item[] = [{ id: 'a' }]
    const next: Item[] = [{ id: 'b' }, { id: 'a' }]
    const prevSnapshot = JSON.stringify(prev)
    const nextSnapshot = JSON.stringify(next)

    const out = appendUniqueById(prev, next)

    // The returned array is a new reference; mutating it must not affect inputs.
    out.push({ id: 'c' })
    out.length = 0

    // Inputs are unchanged.
    expect(JSON.stringify(prev)).toBe(prevSnapshot)
    expect(JSON.stringify(next)).toBe(nextSnapshot)
    // And the inputs themselves are not the same reference as the output.
    expect(out).not.toBe(prev)
    expect(out).not.toBe(next)
  })
})
