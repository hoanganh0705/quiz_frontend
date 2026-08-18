

import { describe, expect, it, vi } from 'vitest';

import type { ScopedMutator } from 'swr';

import {
invalidateReviewById,
invalidateReviewReportsList,
publicReviewsKeyMatcher,
reviewKey,
reviewReportsKeyMatcher,
} from '../review-moderation-cache-keys';

function makeMutate(): ScopedMutator {
const fn = vi.fn(() => Promise.resolve([]));
return fn as unknown as ScopedMutator;
}

describe('review-moderation-cache-keys — stable keys', () => {
it('reviewKey() returns the documented tuple shape', () => {
expect(reviewKey('review-1')).toEqual([
'admin',
'review-moderation',
'review',
'review-1',
    ]);
  });

it('reviewKey() is deterministic — equal inputs produce equal keys', () => {
expect(reviewKey('review-1')).toEqual(reviewKey('review-1'));
  });

it('reviewKey() discriminates by id', () => {
expect(reviewKey('review-1')).not.toEqual(reviewKey('review-2'));
  });

it('reviewReportsKeyMatcher matches the documented admin list keys', () => {
expect(
reviewReportsKeyMatcher(['admin', 'review-reports', 'list', 'pending']),
    ).toBe(true);
expect(
reviewReportsKeyMatcher(['admin', 'review-reports', 'list', 'resolved']),
    ).toBe(true);
  });
});

describe('review-moderation-cache-keys — invalidateReviewReportsList', () => {
it('invokes mutate with the queue matcher', async () => {
const mutate = makeMutate();
await invalidateReviewReportsList(mutate);
expect(mutate).toHaveBeenCalledTimes(1);
expect(mutate).toHaveBeenCalledWith(reviewReportsKeyMatcher);
  });

it('returns the mutate result', async () => {
const expected = ['resolved'];
const mutate = vi.fn(() => Promise.resolve(expected)) as unknown as ScopedMutator;
const result = await invalidateReviewReportsList(mutate);
expect(result).toBe(expected);
  });
});

describe('review-moderation-cache-keys — invalidateReviewById', () => {
it('invokes mutate against the per-review key and the public matcher', async () => {
const mutate = makeMutate();
await invalidateReviewById('review-1', mutate);
expect(mutate).toHaveBeenCalledTimes(2);
expect(mutate).toHaveBeenNthCalledWith(1, [
'admin',
'review-moderation',
'review',
'review-1',
    ]);
expect(mutate).toHaveBeenNthCalledWith(2, publicReviewsKeyMatcher);
  });

it('does not invoke mutate when reviewId is empty', async () => {
const mutate = makeMutate();
await invalidateReviewById('', mutate);
expect(mutate).not.toHaveBeenCalled();
  });

it('returns an empty array when reviewId is empty', async () => {
const mutate = makeMutate();
const result = await invalidateReviewById('', mutate);
expect(result).toEqual([]);
  });

it('returns an empty array when reviewId is not a string', async () => {
const mutate = makeMutate();
const result = await invalidateReviewById(
null as unknown as string,
mutate,
    );
expect(result).toEqual([]);
expect(mutate).not.toHaveBeenCalled();
  });
});

describe('review-moderation-cache-keys — publicReviewsKeyMatcher', () => {
it('matches the public quiz review list', () => {
expect(publicReviewsKeyMatcher(['reviews', 'quiz', 'q-1', []])).toBe(true);
expect(
publicReviewsKeyMatcher(['reviews', 'quiz', 'q-1', ['p2', 20]]),
    ).toBe(true);
  });

it('matches the authenticated my-review key', () => {
expect(publicReviewsKeyMatcher(['reviews', 'my', 'q-1', 'sess'])).toBe(true);
  });

it('matches the eligibility key', () => {
expect(
publicReviewsKeyMatcher(['reviews', 'eligibility', 'q-1', 'sess']),
    ).toBe(true);
  });

it('does not match admin-scoped review-moderation keys', () => {
expect(publicReviewsKeyMatcher(['admin', 'review-reports', 'list', 'pending'])).toBe(
false,
    );
expect(publicReviewsKeyMatcher(['admin', 'review-moderation', 'review', 'r-1'])).toBe(
false,
    );
  });

it('does not match non-review keys', () => {
expect(publicReviewsKeyMatcher(['tags', 'directory'])).toBe(false);
expect(publicReviewsKeyMatcher(['bookmarks', 'list'])).toBe(false);
expect(publicReviewsKeyMatcher(['comments', 'quiz', 'q-1'])).toBe(false);
  });

it('does not match strings, null, undefined, or non-arrays', () => {
expect(publicReviewsKeyMatcher('reviews')).toBe(false);
expect(publicReviewsKeyMatcher(null)).toBe(false);
expect(publicReviewsKeyMatcher(undefined)).toBe(false);
expect(publicReviewsKeyMatcher({})).toBe(false);
expect(publicReviewsKeyMatcher(42)).toBe(false);
  });

it('does not match an unknown second segment', () => {
expect(publicReviewsKeyMatcher(['reviews', 'unknown'])).toBe(false);
expect(publicReviewsKeyMatcher(['reviews'])).toBe(false);
expect(publicReviewsKeyMatcher([])).toBe(false);
  });
});

describe('review-moderation-cache-keys — exports surface', () => {
it('exposes the documented helper functions', async () => {
const mod = await import('../review-moderation-cache-keys');
expect(typeof mod.reviewKey).toBe('function');
expect(typeof mod.invalidateReviewReportsList).toBe('function');
expect(typeof mod.invalidateReviewById).toBe('function');
expect(typeof mod.publicReviewsKeyMatcher).toBe('function');
expect(typeof mod.reviewReportsKeyMatcher).toBe('function');
  });
});
