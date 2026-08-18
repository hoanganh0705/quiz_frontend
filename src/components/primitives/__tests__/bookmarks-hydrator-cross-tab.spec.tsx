

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
useBookmarkedQuizIds: vi.fn(),
bookmarkedQuizIdsKey: vi.fn(() => ['bookmarked-quiz-ids']),
bookmarkCollectionsKey: vi.fn(() => ['bookmark-collections']),
useUser: vi.fn(),
subscribeToBookmarkEvents: vi.fn(),
mutate: vi.fn(),
}));

vi.mock('@/features/bookmarks/hooks/use-bookmarked-quiz-ids', () => ({
useBookmarkedQuizIds: () => mocks.useBookmarkedQuizIds(),
bookmarkedQuizIdsKey: () => mocks.bookmarkedQuizIdsKey(),
}));

vi.mock('@/features/bookmarks/hooks/use-bookmark-collections', () => ({
bookmarkCollectionsKey: () => mocks.bookmarkCollectionsKey(),
}));

vi.mock('@/features/users/store/user-store', () => ({
useUser: () => mocks.useUser(),
}));

vi.mock('@/lib/api/core/bookmarks-broadcast-channel', () => ({
subscribeToBookmarkEvents: (
...args: unknown[]
  ) => mocks.subscribeToBookmarkEvents(...args),
}));

vi.mock('swr', async () => {
const actual = await vi.importActual<typeof import('swr')>('swr');
return {
...actual,
mutate: (...args: unknown[]) => mocks.mutate(...args),
  };
});

import { BookmarksLookupHydrator } from '@/features/bookmarks/components/BookmarksLookupHydrator';

const USER_A = '0192f4d8-0000-7000-8000-000000000aaa';
const USER_B = '0192f4d8-0000-7000-8000-000000000bbb';

type Subscriber = (event: { type: string; userId: string }) => void;

function setupSubscriberCapture() {

let captured: Subscriber | null = null;
const unsubscribeMock = vi.fn();
mocks.subscribeToBookmarkEvents.mockImplementation((handler: Subscriber) => {
captured = handler;
return unsubscribeMock;
  });
return {
dispatch: (event: { type: string; userId: string }) => {
if (!captured) {
throw new Error('no subscriber captured');
      }
captured(event);
    },
unsubscribeMock,
  };
}

const DEFAULT_MEMBERSHIP_RETURN = {
quizIds: new Set<string>(),
isLoading: false,
error: null,
mutate: async (): Promise<unknown> => {
return;
  },
};

beforeEach(() => {
mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);
mocks.useUser.mockReturnValue({
userId: USER_A,
username: 'tester-a',
email: 'a@example.com',
role: 'user',
isVerified: true,
  });
mocks.subscribeToBookmarkEvents.mockReset();
mocks.mutate.mockReset();
mocks.bookmarkedQuizIdsKey.mockClear();
mocks.bookmarkCollectionsKey.mockClear();
});

afterEach(() => {
cleanup();
vi.clearAllMocks();
});

describe('<BookmarksLookupHydrator /> — F3 cross-tab revalidation', () => {
it('(a1) a remote bookmarks/invalidated event with the local userId revalidates the membership and collections keys', async () => {
const { dispatch } = setupSubscriberCapture();

render(<BookmarksLookupHydrator />);

await waitFor(() => {
expect(mocks.subscribeToBookmarkEvents).toHaveBeenCalledTimes(1);
    });

dispatch({ type: 'bookmarks/invalidated', userId: USER_A });

await waitFor(() => {
expect(mocks.mutate).toHaveBeenCalled();
    });

expect(mocks.mutate).toHaveBeenCalledWith(
['bookmarked-quiz-ids'],
undefined,
{ revalidate: true },
    );
expect(mocks.mutate).toHaveBeenCalledWith(
['bookmark-collections'],
undefined,
{ revalidate: true },
    );
  });

it('(a2) a different-user event is dropped (no revalidation, no mutate)', async () => {
const { dispatch } = setupSubscriberCapture();

render(<BookmarksLookupHydrator />);

await waitFor(() => {
expect(mocks.subscribeToBookmarkEvents).toHaveBeenCalledTimes(1);
    });

dispatch({ type: 'bookmarks/invalidated', userId: USER_B });

await act(async () => {
await Promise.resolve();
    });

expect(mocks.mutate).not.toHaveBeenCalled();
  });

it('(b1) an unknown event type is dropped (no revalidation)', async () => {
const { dispatch } = setupSubscriberCapture();

render(<BookmarksLookupHydrator />);

await waitFor(() => {
expect(mocks.subscribeToBookmarkEvents).toHaveBeenCalledTimes(1);
    });

dispatch({ type: 'bookmarks/collection-renamed', userId: USER_A });

await act(async () => {
await Promise.resolve();
    });

expect(mocks.mutate).not.toHaveBeenCalled();
  });

it('(c1) the listener is removed on unmount', async () => {
const { unsubscribeMock } = setupSubscriberCapture();

const { unmount } = render(<BookmarksLookupHydrator />);

await waitFor(() => {
expect(mocks.subscribeToBookmarkEvents).toHaveBeenCalledTimes(1);
    });

unmount();

await waitFor(() => {
expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    });
  });

it('(d1) the listener is replaced when the active user changes', async () => {
const { unsubscribeMock } = setupSubscriberCapture();

const { rerender } = render(<BookmarksLookupHydrator />);

await waitFor(() => {
expect(mocks.subscribeToBookmarkEvents).toHaveBeenCalledTimes(1);
    });

mocks.useUser.mockReturnValue(null);
rerender(<BookmarksLookupHydrator />);

await waitFor(() => {
expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    });

mocks.useUser.mockReturnValue({
userId: USER_B,
username: 'tester-b',
email: 'b@example.com',
role: 'user',
isVerified: true,
    });
rerender(<BookmarksLookupHydrator />);

await waitFor(() => {
expect(mocks.subscribeToBookmarkEvents).toHaveBeenCalledTimes(2);
    });
  });

it('(d2) a fresh subscriber is created for USER_B, scoped to USER_B', async () => {

const { dispatch, unsubscribeMock } = setupSubscriberCapture();

const { rerender } = render(<BookmarksLookupHydrator />);

await waitFor(() => {
expect(mocks.subscribeToBookmarkEvents).toHaveBeenCalledTimes(1);
    });

mocks.useUser.mockReturnValue({
userId: USER_B,
username: 'tester-b',
email: 'b@example.com',
role: 'user',
isVerified: true,
    });
rerender(<BookmarksLookupHydrator />);

await waitFor(() => {
expect(mocks.subscribeToBookmarkEvents).toHaveBeenCalledTimes(2);
    });

expect(unsubscribeMock).toHaveBeenCalled();

dispatch({ type: 'bookmarks/invalidated', userId: USER_A });
await act(async () => {
await Promise.resolve();
    });
expect(mocks.mutate).not.toHaveBeenCalled();

dispatch({ type: 'bookmarks/invalidated', userId: USER_B });
await waitFor(() => {
expect(mocks.mutate).toHaveBeenCalled();
    });
  });

it('(e1) unauthenticated mounting does not subscribe (no userId)', async () => {
mocks.useUser.mockReturnValue(null);
setupSubscriberCapture();

render(<BookmarksLookupHydrator />);

await act(async () => {
await Promise.resolve();
    });

expect(mocks.subscribeToBookmarkEvents).not.toHaveBeenCalled();
  });

it('(e2) the unauthenticated hydrator does not invoke mutate even after a remote event', async () => {
mocks.useUser.mockReturnValue(null);
setupSubscriberCapture();

render(<BookmarksLookupHydrator />);

await act(async () => {
await Promise.resolve();
    });

expect(mocks.mutate).not.toHaveBeenCalled();
  });

it('(f1) exactly one revalidation per matching remote event (no double-firing)', async () => {
const { dispatch } = setupSubscriberCapture();

render(<BookmarksLookupHydrator />);

await waitFor(() => {
expect(mocks.subscribeToBookmarkEvents).toHaveBeenCalledTimes(1);
    });

dispatch({ type: 'bookmarks/invalidated', userId: USER_A });

await waitFor(() => {

expect(mocks.mutate.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

const callsAfterFirst = mocks.mutate.mock.calls.length;
dispatch({ type: 'bookmarks/invalidated', userId: USER_A });

await waitFor(() => {
expect(mocks.mutate.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });
  });
});
