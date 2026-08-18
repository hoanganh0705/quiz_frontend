

import { describe, expect, it, vi } from 'vitest';

import type { ScopedMutator } from 'swr';

import {
commentKey,
commentReportsKeyMatcher,
commentThreadKeyMatcher,
invalidateCommentById,
invalidateCommentReportsList,
publicCommentsKeyMatcher,
} from '../comment-moderation-cache-keys';

function makeMutate(): ScopedMutator {
const fn = vi.fn(() => Promise.resolve([]));
return fn as unknown as ScopedMutator;
}

describe('comment-moderation-cache-keys — stable keys', () => {
it('commentKey() returns the documented tuple shape', () => {
expect(commentKey('comment-1')).toEqual([
'comments',
'byId',
'comment-1',
    ]);
  });

it('commentKey() is deterministic — equal inputs produce equal keys', () => {
expect(commentKey('comment-1')).toEqual(commentKey('comment-1'));
  });

it('commentKey() discriminates by id', () => {
expect(commentKey('comment-1')).not.toEqual(commentKey('comment-2'));
  });

it('commentReportsKeyMatcher matches the documented admin list keys', () => {
expect(
commentReportsKeyMatcher([
'admin',
'comment-reports',
'list',
'pending',
      ]),
    ).toBe(true);
expect(
commentReportsKeyMatcher([
'admin',
'comment-reports',
'list',
'resolved',
      ]),
    ).toBe(true);
  });
});

describe('comment-moderation-cache-keys — invalidateCommentReportsList', () => {
it('invokes mutate with the queue matcher', async () => {
const mutate = makeMutate();
await invalidateCommentReportsList(mutate);
expect(mutate).toHaveBeenCalledTimes(1);
expect(mutate).toHaveBeenCalledWith(commentReportsKeyMatcher);
  });

it('returns the mutate result', async () => {
const expected = ['resolved'];
const mutate = vi.fn(
() => Promise.resolve(expected),
    ) as unknown as ScopedMutator;
const result = await invalidateCommentReportsList(mutate);
expect(result).toBe(expected);
  });
});

describe('comment-moderation-cache-keys — invalidateCommentById', () => {
it('invokes mutate against the per-comment key and the public matcher', async () => {
const mutate = makeMutate();
await invalidateCommentById('comment-1', mutate);
expect(mutate).toHaveBeenCalledTimes(3);

expect(mutate).toHaveBeenNthCalledWith(
1,
expect.arrayContaining(['comments', 'byId', 'comment-1']),
    );

expect(mutate).toHaveBeenNthCalledWith(3, publicCommentsKeyMatcher);
  });

it('does not invoke mutate when commentId is empty', async () => {
const mutate = makeMutate();
await invalidateCommentById('', mutate);
expect(mutate).not.toHaveBeenCalled();
  });

it('does not invoke mutate when commentId is whitespace-only', async () => {
const mutate = makeMutate();
await invalidateCommentById('   ', mutate);
expect(mutate).not.toHaveBeenCalled();
  });

it('does not invoke mutate when commentId is non-string', async () => {
const mutate = makeMutate();

await invalidateCommentById(undefined as unknown as string, mutate);
expect(mutate).not.toHaveBeenCalled();
  });

it('returns an empty array when commentId is empty', async () => {
const mutate = makeMutate();
const result = await invalidateCommentById('', mutate);
expect(result).toEqual([]);
  });
});

describe('comment-moderation-cache-keys — public-comments matcher', () => {
it('matches the per-comment read key', () => {
expect(publicCommentsKeyMatcher(['comments', 'byId', 'comment-1'])).toBe(
true,
    );
  });

it('matches the thread listing key', () => {
expect(publicCommentsKeyMatcher(['comments', 'thread', 'thread-1'])).toBe(
true,
    );
  });

it('matches the per-quiz comment list key', () => {
expect(publicCommentsKeyMatcher(['comments', 'byQuiz', 'quiz-1'])).toBe(
true,
    );
  });

it('does not match a non-array key', () => {
expect(publicCommentsKeyMatcher('comments:byId:comment-1')).toBe(false);
expect(publicCommentsKeyMatcher(null)).toBe(false);
expect(publicCommentsKeyMatcher(undefined)).toBe(false);
expect(publicCommentsKeyMatcher({})).toBe(false);
  });

it('does not match a key in a different namespace', () => {
expect(publicCommentsKeyMatcher(['admin', 'comment-reports', 'list'])).toBe(
false,
    );
expect(publicCommentsKeyMatcher(['reviews', 'quiz', 'quiz-1'])).toBe(false);
  });
});

describe('comment-moderation-cache-keys — thread matcher', () => {
it('matches a thread key', () => {
expect(commentThreadKeyMatcher(['comments', 'thread', 'thread-1'])).toBe(
true,
    );
  });

it('does not match a byId key', () => {
expect(commentThreadKeyMatcher(['comments', 'byId', 'comment-1'])).toBe(
false,
    );
  });

it('does not match a non-array key', () => {
expect(commentThreadKeyMatcher('comments:thread:thread-1')).toBe(false);
  });
});

describe('comment-moderation-cache-keys — exports surface', () => {
it('exposes the documented helper functions', async () => {
const mod = await import('../comment-moderation-cache-keys');
expect(typeof mod.invalidateCommentReportsList).toBe('function');
expect(typeof mod.invalidateCommentById).toBe('function');
expect(typeof mod.publicCommentsKeyMatcher).toBe('function');
expect(typeof mod.commentThreadKeyMatcher).toBe('function');
expect(typeof mod.commentKey).toBe('function');
  });
});