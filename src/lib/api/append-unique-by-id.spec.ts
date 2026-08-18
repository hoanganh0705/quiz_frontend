

import { describe, expect, it } from 'vitest'

import { appendUniqueById } from './append-unique-by-id'

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
{ id: 'a', extra: 2 },
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

out.push({ id: 'c' })
out.length = 0

expect(JSON.stringify(prev)).toBe(prevSnapshot)
expect(JSON.stringify(next)).toBe(nextSnapshot)

expect(out).not.toBe(prev)
expect(out).not.toBe(next)
  })
})
