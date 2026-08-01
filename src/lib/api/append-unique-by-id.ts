/**
 * Concatenate two arrays of `{ id: string }` (or any `{ id }` shape) and
 * return a new array with duplicates removed by `id`, preserving
 * first-occurrence order.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive (`useCursorPaginated`).
 * Source story:  PHASE_3_EPICS.md → Story 3.2, line 214.
 * Source ticket: TKT-3.2.B1.
 *
 * Used inside `useCursorPaginated` (D1) to handle the rare case where a
 * cursor's next page overlaps with the previous page (e.g. after cache
 * invalidation between fetches, or when a list endpoint returns a
 * tail-item that the previous page also returned as its head-item).
 *
 * Semantics (locked by the B2 spec):
 *
 *   1. The output is always a new array. Neither `prev` nor `next` is
 *      mutated.
 *   2. Items in `prev` are always kept, in their original order.
 *   3. Items in `next` whose `id` is already in `prev` are dropped.
 *   4. Within `next`, an `id` that appears more than once is reduced to
 *      a single occurrence (the first).
 *   5. The output is a strict subset of `prev.concat(next)` in
 *      order, deduplicated by `id`.
 *
 * Generics:
 *
 *   The `id` field is constrained to `string` (the contract the hook
 *   depends on). Other fields on the item are preserved (the helper is
 *   structural; it does not deep-clone or transform items).
 *
 * Complexity:
 *
 *   O(prev.length + next.length). Uses a `Set<string>` of seen ids.
 *
 * @example
 *   const merged = appendUniqueById(
 *     [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
 *     [{ id: 'b', name: 'B-dup' }, { id: 'c', name: 'C' }]
 *   )
 *   // → [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }]
 */
export function appendUniqueById<T extends { id: string }>(
  prev: readonly T[],
  next: readonly T[]
): T[] {
  const seen = new Set<string>()
  const out: T[] = []

  for (const item of prev) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      out.push(item)
    }
  }

  for (const item of next) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      out.push(item)
    }
  }

  return out
}
