/**
 * `selectDefaultCollectionId.spec.ts` — locks the deterministic
 * default-collection selector contract.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.B2.
 *
 * Cases per the ticket AC #1–5:
 *
 *   (a) Zero collections → `null`.
 *   (b) One collection → that collection's `collectionId`.
 *   (c) Multiple collections, no Favourites → earliest `createdAt`.
 *   (d) Mixed-case Favourites → wins over earlier `createdAt`.
 *   (e) Multiple collections with the same `createdAt` → tie-break
 *       by `collectionId` ascending (deterministic).
 *   (f) Unsorted input is handled correctly (the selector sorts
 *       its own copy).
 *   (g) The input array is NOT mutated.
 *
 * Test-environment notes: the file lives under
 * src/components/primitives/__tests__/ so vitest's `jsdom` project
 * picks it up. No DOM environment is needed (the selector is pure),
 * but the existing convention colocates hook-adjacent tests here.
 */

import { describe, expect, it } from 'vitest';

import type { BookmarkCollectionResponseDto } from '@/lib/api/generated/schemas';
import {
  DEFAULT_COLLECTION_NAME,
  selectDefaultCollectionId,
} from '@/features/bookmarks/hooks/use-default-collection-id';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collection(
  collectionId: string,
  name: string,
  createdAt: string,
): BookmarkCollectionResponseDto {
  return {
    collectionId,
    userId: '0192f4d8-0000-7000-8000-000000000002',
    name,
    description: null,
    quizCount: 0,
    createdAt,
    updatedAt: createdAt,
  };
}

// ---------------------------------------------------------------------------
// (a) Zero collections
// ---------------------------------------------------------------------------

describe('selectDefaultCollectionId — empty input', () => {
  it('(a) returns null for an empty input array', () => {
    expect(selectDefaultCollectionId([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// (b) One collection
// ---------------------------------------------------------------------------

describe('selectDefaultCollectionId — single collection', () => {
  it('(b) returns that collectionId when only one is present', () => {
    const only = collection(
      '0192f4d8-0000-7000-8000-000000000010',
      'Science',
      '2026-07-01T00:00:00.000Z',
    );
    expect(selectDefaultCollectionId([only])).toBe(
      '0192f4d8-0000-7000-8000-000000000010',
    );
  });
});

// ---------------------------------------------------------------------------
// (c) Multiple collections, no Favourites → earliest createdAt
// ---------------------------------------------------------------------------

describe('selectDefaultCollectionId — multiple collections', () => {
  it('(c1) returns the earliest createdAt when no Favourites match', () => {
    const oldest = collection(
      '0192f4d8-0000-7000-8000-000000000010',
      'Science',
      '2026-05-01T00:00:00.000Z',
    );
    const middle = collection(
      '0192f4d8-0000-7000-8000-000000000020',
      'History',
      '2026-06-01T00:00:00.000Z',
    );
    const newest = collection(
      '0192f4d8-0000-7000-8000-000000000030',
      'Math',
      '2026-07-01T00:00:00.000Z',
    );
    expect(selectDefaultCollectionId([middle, newest, oldest])).toBe(
      '0192f4d8-0000-7000-8000-000000000010',
    );
  });

  it('(c2) handles an unsorted input array', () => {
    const a = collection(
      '0192f4d8-0000-7000-8000-000000000010',
      'Science',
      '2026-05-01T00:00:00.000Z',
    );
    const b = collection(
      '0192f4d8-0000-7000-8000-000000000020',
      'History',
      '2026-06-01T00:00:00.000Z',
    );
    // Out of order on purpose.
    expect(selectDefaultCollectionId([b, a])).toBe(
      '0192f4d8-0000-7000-8000-000000000010',
    );
  });
});

// ---------------------------------------------------------------------------
// (d) Favourites (mixed-case) wins over earlier createdAt
// ---------------------------------------------------------------------------

describe('selectDefaultCollectionId — Favourites preference', () => {
  it('(d1) Favourites wins regardless of createdAt order', () => {
    const older = collection(
      '0192f4d8-0000-7000-8000-000000000010',
      'Science',
      '2026-05-01T00:00:00.000Z',
    );
    const newer = collection(
      '0192f4d8-0000-7000-8000-000000000020',
      'Favourites',
      '2026-07-01T00:00:00.000Z',
    );
    expect(selectDefaultCollectionId([older, newer])).toBe(
      '0192f4d8-0000-7000-8000-000000000020',
    );
  });

  it('(d2) case-insensitive Favourites match', () => {
    const older = collection(
      '0192f4d8-0000-7000-8000-000000000010',
      'Science',
      '2026-05-01T00:00:00.000Z',
    );
    const upper = collection(
      '0192f4d8-0000-7000-8000-000000000020',
      'FAVOURITES',
      '2026-07-01T00:00:00.000Z',
    );
    const mixed = collection(
      '0192f4d8-0000-7000-8000-000000000030',
      'fAvOuRiTeS',
      '2026-07-02T00:00:00.000Z',
    );
    expect(selectDefaultCollectionId([older, upper, mixed])).toBe(
      '0192f4d8-0000-7000-8000-000000000020',
    );
  });

  it('(d3) the FIRST Favourites match in iteration order wins', () => {
    const first = collection(
      '0192f4d8-0000-7000-8000-000000000010',
      'Favourites',
      '2026-07-01T00:00:00.000Z',
    );
    const second = collection(
      '0192f4d8-0000-7000-8000-000000000020',
      'favourites',
      '2026-05-01T00:00:00.000Z',
    );
    expect(selectDefaultCollectionId([first, second])).toBe(
      '0192f4d8-0000-7000-8000-000000000010',
    );
  });
});

// ---------------------------------------------------------------------------
// (e) Equal createdAt → tie-break by collectionId ascending
// ---------------------------------------------------------------------------

describe('selectDefaultCollectionId — createdAt tie-break', () => {
  it('(e) breaks ties on createdAt by collectionId ascending', () => {
    const sameTime = '2026-07-01T00:00:00.000Z';
    const a = collection(
      '0192f4d8-0000-7000-8000-000000000030',
      'History',
      sameTime,
    );
    const b = collection(
      '0192f4d8-0000-7000-8000-000000000010',
      'Science',
      sameTime,
    );
    const c = collection(
      '0192f4d8-0000-7000-8000-000000000020',
      'Math',
      sameTime,
    );
    expect(selectDefaultCollectionId([a, b, c])).toBe(
      '0192f4d8-0000-7000-8000-000000000010',
    );
  });
});

// ---------------------------------------------------------------------------
// (f) Immutability
// ---------------------------------------------------------------------------

describe('selectDefaultCollectionId — immutability', () => {
  it('(f) does NOT mutate the input array', () => {
    const a = collection(
      '0192f4d8-0000-7000-8000-000000000030',
      'History',
      '2026-07-01T00:00:00.000Z',
    );
    const b = collection(
      '0192f4d8-0000-7000-8000-000000000010',
      'Science',
      '2026-05-01T00:00:00.000Z',
    );
    const input = [a, b];
    const snapshot = JSON.parse(JSON.stringify(input)) as BookmarkCollectionResponseDto[];

    selectDefaultCollectionId(input);

    expect(input).toEqual(snapshot);
  });
});

// ---------------------------------------------------------------------------
// (g) Phase 3 default-collection name constant
// ---------------------------------------------------------------------------

describe('selectDefaultCollectionId — constant', () => {
  it('(g) exposes the canonical Favourites default name', () => {
    expect(DEFAULT_COLLECTION_NAME).toBe('Favourites');
  });
});