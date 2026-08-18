

import { describe, expect, it } from 'vitest';

import type { BookmarkCollection } from '@/features/bookmarks/types';
import {
DEFAULT_COLLECTION_NAME,
selectDefaultCollectionId,
} from '@/features/bookmarks/hooks/use-default-collection-id';

function makeCollection(
collectionId: string,
name: string,
createdAt: string,
): BookmarkCollection {
return {
collectionId,
id: collectionId,
userId: '0192f4d8-0000-7000-8000-000000000002',
name,
description: null,
color: null,
quizCount: 0,
createdAt,
updatedAt: createdAt,
  };
}

describe('selectDefaultCollectionId — empty input', () => {
it('(a) returns null for an empty input array', () => {
expect(selectDefaultCollectionId([])).toBeNull();
  });
});

describe('selectDefaultCollectionId — single collection', () => {
it('(b) returns that collectionId when only one is present', () => {
const only = makeCollection(
'0192f4d8-0000-7000-8000-000000000010',
'Science',
'2026-07-01T00:00:00.000Z',
    );
expect(selectDefaultCollectionId([only])).toBe(
'0192f4d8-0000-7000-8000-000000000010',
    );
  });
});

describe('selectDefaultCollectionId — multiple collections', () => {
it('(c1) returns the earliest createdAt when no Favourites match', () => {
const oldest = makeCollection(
'0192f4d8-0000-7000-8000-000000000010',
'Science',
'2026-05-01T00:00:00.000Z',
    );
const middle = makeCollection(
'0192f4d8-0000-7000-8000-000000000020',
'History',
'2026-06-01T00:00:00.000Z',
    );
const newest = makeCollection(
'0192f4d8-0000-7000-8000-000000000030',
'Math',
'2026-07-01T00:00:00.000Z',
    );
expect(selectDefaultCollectionId([middle, newest, oldest])).toBe(
'0192f4d8-0000-7000-8000-000000000010',
    );
  });

it('(c2) handles an unsorted input array', () => {
const a = makeCollection(
'0192f4d8-0000-7000-8000-000000000010',
'Science',
'2026-05-01T00:00:00.000Z',
    );
const b = makeCollection(
'0192f4d8-0000-7000-8000-000000000020',
'History',
'2026-06-01T00:00:00.000Z',
    );

expect(selectDefaultCollectionId([b, a])).toBe(
'0192f4d8-0000-7000-8000-000000000010',
    );
  });
});

describe('selectDefaultCollectionId — Favourites preference', () => {
it('(d1) Favourites wins regardless of createdAt order', () => {
const older = makeCollection(
'0192f4d8-0000-7000-8000-000000000010',
'Science',
'2026-05-01T00:00:00.000Z',
    );
const newer = makeCollection(
'0192f4d8-0000-7000-8000-000000000020',
'Favourites',
'2026-07-01T00:00:00.000Z',
    );
expect(selectDefaultCollectionId([older, newer])).toBe(
'0192f4d8-0000-7000-8000-000000000020',
    );
  });

it('(d2) case-insensitive Favourites match', () => {
const older = makeCollection(
'0192f4d8-0000-7000-8000-000000000010',
'Science',
'2026-05-01T00:00:00.000Z',
    );
const upper = makeCollection(
'0192f4d8-0000-7000-8000-000000000020',
'FAVOURITES',
'2026-07-01T00:00:00.000Z',
    );
const mixed = makeCollection(
'0192f4d8-0000-7000-8000-000000000030',
'fAvOuRiTeS',
'2026-07-02T00:00:00.000Z',
    );
expect(selectDefaultCollectionId([older, upper, mixed])).toBe(
'0192f4d8-0000-7000-8000-000000000020',
    );
  });

it('(d3) the FIRST Favourites match in iteration order wins', () => {
const first = makeCollection(
'0192f4d8-0000-7000-8000-000000000010',
'Favourites',
'2026-07-01T00:00:00.000Z',
    );
const second = makeCollection(
'0192f4d8-0000-7000-8000-000000000020',
'favourites',
'2026-05-01T00:00:00.000Z',
    );
expect(selectDefaultCollectionId([first, second])).toBe(
'0192f4d8-0000-7000-8000-000000000010',
    );
  });
});

describe('selectDefaultCollectionId — createdAt tie-break', () => {
it('(e) breaks ties on createdAt by collectionId ascending', () => {
const sameTime = '2026-07-01T00:00:00.000Z';
const a = makeCollection(
'0192f4d8-0000-7000-8000-000000000030',
'History',
sameTime,
    );
const b = makeCollection(
'0192f4d8-0000-7000-8000-000000000010',
'Science',
sameTime,
    );
const c = makeCollection(
'0192f4d8-0000-7000-8000-000000000020',
'Math',
sameTime,
    );
expect(selectDefaultCollectionId([a, b, c])).toBe(
'0192f4d8-0000-7000-8000-000000000010',
    );
  });
});

describe('selectDefaultCollectionId — immutability', () => {
it('(f) does NOT mutate the input array', () => {
const a = makeCollection(
'0192f4d8-0000-7000-8000-000000000030',
'History',
'2026-07-01T00:00:00.000Z',
    );
const b = makeCollection(
'0192f4d8-0000-7000-8000-000000000010',
'Science',
'2026-05-01T00:00:00.000Z',
    );
const input: readonly BookmarkCollection[] = [a, b];
const snapshot = JSON.parse(JSON.stringify(input));

selectDefaultCollectionId(input);

expect(input).toEqual(snapshot);
  });
});

describe('selectDefaultCollectionId — constant', () => {
it('(g) exposes the canonical Favourites default name', () => {
expect(DEFAULT_COLLECTION_NAME).toBe('Favourites');
  });
});
