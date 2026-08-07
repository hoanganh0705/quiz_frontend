/**
 * `is-cursor-page.spec.ts` — runtime guards for cursor / offset
 * page shapes.
 *
 * Source epic:   Epic 3.2 + TKT-7.5 cleanup, Phase 5 / P0-20.
 */

import { describe, expect, it } from 'vitest';

import {
  isCursorPage,
  isOffsetPage,
  isAnyCursorLikePage,
  assertPageShape,
} from './is-cursor-page';

describe('isCursorPage — strict guard', () => {
  it('accepts a well-formed cursor page', () => {
    const page = {
      items: [{ id: 'a' }, { id: 'b' }],
      nextCursor: 'cursor-1',
      hasNextPage: true,
      limit: 20,
    };
    expect(isCursorPage(page)).toBe(true);
  });

  it('accepts a cursor page with null nextCursor', () => {
    const page = {
      items: [],
      nextCursor: null,
      hasNextPage: false,
      limit: 20,
    };
    expect(isCursorPage(page)).toBe(true);
  });

  it('rejects null', () => {
    expect(isCursorPage(null)).toBe(false);
  });

  it('rejects primitives', () => {
    expect(isCursorPage(42)).toBe(false);
    expect(isCursorPage('hello')).toBe(false);
    expect(isCursorPage(true)).toBe(false);
  });

  it('rejects an object with a non-array items', () => {
    const page = {
      items: 'not-an-array',
      nextCursor: 'x',
      hasNextPage: true,
      limit: 20,
    };
    expect(isCursorPage(page)).toBe(false);
  });

  it('rejects an object with a non-string non-null nextCursor', () => {
    const page = {
      items: [],
      nextCursor: 42,
      hasNextPage: true,
      limit: 20,
    };
    expect(isCursorPage(page)).toBe(false);
  });

  it('rejects an object with a non-boolean hasNextPage', () => {
    const page = {
      items: [],
      nextCursor: 'x',
      hasNextPage: 'yes',
      limit: 20,
    };
    expect(isCursorPage(page)).toBe(false);
  });

  it('rejects an object with a non-finite limit', () => {
    const page = {
      items: [],
      nextCursor: 'x',
      hasNextPage: true,
      limit: NaN,
    };
    expect(isCursorPage(page)).toBe(false);
  });

  it('rejects an object with a negative limit', () => {
    const page = {
      items: [],
      nextCursor: 'x',
      hasNextPage: true,
      limit: -1,
    };
    expect(isCursorPage(page)).toBe(false);
  });

  it('rejects an axios interceptor wrapper that happens to carry a nextCursor', () => {
    // The previous `hasOwnProperty` check would have accepted this;
    // the strict guard rejects it because items is not an array.
    const wrapper = {
      data: { items: [], nextCursor: 'x', hasNextPage: true, limit: 20 },
      meta: { requestId: 'req-1' },
    };
    expect(isCursorPage(wrapper)).toBe(false);
  });
});

describe('isOffsetPage — strict guard', () => {
  it('accepts a well-formed offset page', () => {
    const page = {
      items: [{ id: 'a' }],
      page: 2,
      total: 100,
      hasMore: true,
      limit: 20,
    };
    expect(isOffsetPage(page)).toBe(true);
  });

  it('rejects an object with a non-integer page', () => {
    const page = {
      items: [],
      page: 1.5,
      total: 0,
      hasMore: false,
      limit: 20,
    };
    expect(isOffsetPage(page)).toBe(false);
  });

  it('rejects an object with a zero page (1-indexed)', () => {
    const page = {
      items: [],
      page: 0,
      total: 0,
      hasMore: false,
      limit: 20,
    };
    expect(isOffsetPage(page)).toBe(false);
  });

  it('rejects an object with a negative total', () => {
    const page = {
      items: [],
      page: 1,
      total: -1,
      hasMore: false,
      limit: 20,
    };
    expect(isOffsetPage(page)).toBe(false);
  });

  it('rejects an object with a non-boolean hasMore', () => {
    const page = {
      items: [],
      page: 1,
      total: 0,
      hasMore: 'yes',
      limit: 20,
    };
    expect(isOffsetPage(page)).toBe(false);
  });
});

describe('isAnyCursorLikePage', () => {
  it('accepts a cursor page', () => {
    expect(
      isAnyCursorLikePage({
        items: [],
        nextCursor: 'x',
        hasNextPage: true,
        limit: 20,
      }),
    ).toBe(true);
  });

  it('accepts an offset page', () => {
    expect(
      isAnyCursorLikePage({
        items: [],
        page: 1,
        total: 0,
        hasMore: false,
        limit: 20,
      }),
    ).toBe(true);
  });

  it('rejects neither', () => {
    expect(isAnyCursorLikePage({ items: [], foo: 'bar' })).toBe(false);
    expect(isAnyCursorLikePage(null)).toBe(false);
    expect(isAnyCursorLikePage(42)).toBe(false);
  });
});

describe('assertPageShape', () => {
  it('returns a cursor page when paginationKind=cursor', () => {
    const page = {
      items: [{ id: 'a' }],
      nextCursor: 'x',
      hasNextPage: true,
      limit: 20,
    };
    expect(assertPageShape(page, 'cursor')).toBe(page);
  });

  it('returns an offset page when paginationKind=offset', () => {
    const page = {
      items: [{ id: 'a' }],
      page: 1,
      total: 1,
      hasMore: false,
      limit: 20,
    };
    expect(assertPageShape(page, 'offset')).toBe(page);
  });

  it('throws a descriptive TypeError on a mismatched shape', () => {
    expect(() => assertPageShape({ foo: 'bar' }, 'cursor')).toThrow(
      /\[useCursorPaginated\]/,
    );
  });

  it('throws on null', () => {
    expect(() => assertPageShape(null, 'cursor')).toThrow(
      /\[useCursorPaginated\]/,
    );
  });
});