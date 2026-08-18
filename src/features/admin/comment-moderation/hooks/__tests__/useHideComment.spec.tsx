

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

const mockAddCommentModerationBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin/admin_live_sentry', () => ({
addCommentModerationBreadcrumb: (...args: unknown[]) =>
mockAddCommentModerationBreadcrumb(...args),
}));

const mockBroadcastCommentModerationInvalidate = vi.hoisted(() => vi.fn());

vi.mock(
'../../cache/comment-moderation-cross-tab',
() => ({
broadcastCommentModerationInvalidate: (
...args: Parameters<typeof mockBroadcastCommentModerationInvalidate>
    ) => mockBroadcastCommentModerationInvalidate(...args),
  }),
);

const mockHideComment = vi.hoisted(() => vi.fn());
const mockRestoreComment = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/services/comment-moderation.service', () => ({
hideComment: (...args: unknown[]) => mockHideComment(...args),
restoreComment: (...args: unknown[]) => mockRestoreComment(...args),
}));

const mockGlobalMutate = vi.hoisted(() => vi.fn((...args: unknown[]) => Promise.resolve(undefined)));

vi.mock('swr', async () => {
const actual = await vi.importActual<typeof import('swr')>('swr');
return {
...actual,
mutate: (...args: unknown[]) => mockGlobalMutate(...args),
  };
});

function makeApiError(
code: string,
status: number,
requestId = 'req-1',
): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: code,
config: undefined,
request: undefined,
response: {
status,
data: {
status,
detail: code,
title: code,
extensions: { code, requestId },
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

afterEach(() => {
vi.clearAllMocks();
mockHideComment.mockReset();
mockRestoreComment.mockReset();
mockAddCommentModerationBreadcrumb.mockReset();
mockBroadcastCommentModerationInvalidate.mockReset();
mockGlobalMutate.mockReset();
mockGlobalMutate.mockResolvedValue(undefined);
});

beforeEach(() => {
mockHideComment.mockReset();
mockRestoreComment.mockReset();
mockAddCommentModerationBreadcrumb.mockReset();
mockBroadcastCommentModerationInvalidate.mockReset();
mockGlobalMutate.mockReset();
mockGlobalMutate.mockResolvedValue(undefined);
});

function renderUseHideComment() {
return renderHook(() => useHideComment(), {
wrapper: ({ children }) => (
<SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    ),
  });
}

function renderUseRestoreComment() {
return renderHook(() => useRestoreComment(), {
wrapper: ({ children }) => (
<SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
    ),
  });
}

import { useHideComment, useRestoreComment } from '../useHideComment';

describe('TKT-7.6.C3 — useHideComment: happy path', () => {
it('dispatches hideComment with the comment id', async () => {
mockHideComment.mockResolvedValueOnce({ commentId: 'c-1', hidden: true });

const { result } = renderUseHideComment();

let payload: unknown = null;
await act(async () => {
payload = await result.current.hide('c-1');
    });

expect(payload).toEqual({ commentId: 'c-1', hidden: true });
expect(mockHideComment).toHaveBeenCalledWith('c-1', {});
expect(mockHideComment).toHaveBeenCalledTimes(1);
  });

it('emits started + success breadcrumbs with the documented breadcrumbAction', async () => {
mockHideComment.mockResolvedValueOnce({ commentId: 'c-1', hidden: true });

const { result } = renderUseHideComment();

await act(async () => {
await result.current.hide('c-1');
    });

const startCall = mockAddCommentModerationBreadcrumb.mock.calls.find(
(args) => (args[0] as { status: string }).status === 'started',
    );
const successCall = mockAddCommentModerationBreadcrumb.mock.calls.find(
(args) => (args[0] as { status: string }).status === 'success',
    );

expect(startCall).toBeDefined();
expect(successCall).toBeDefined();

const startPayload = startCall?.[0] as Record<string, unknown>;
const successPayload = successCall?.[0] as Record<string, unknown>;
expect(startPayload.action).toBe('b.admin.comment_moderation.hide');
expect(startPayload.route).toBe('admin-comment-moderation.hide_comment');
expect(startPayload.targetId).toBe('c-1');
expect(successPayload.action).toBe('b.admin.comment_moderation.hide');
  });

it('success invalidates the comment-reports queue, the per-id read, and all comments:* keys', async () => {
mockHideComment.mockResolvedValueOnce({ commentId: 'c-1', hidden: true });

const { result } = renderUseHideComment();

await act(async () => {
await result.current.hide('c-1');
    });

expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
const [predicate] = mockGlobalMutate.mock.calls[0] ?? [];
expect(typeof predicate).toBe('function');

const fn = predicate as (key: readonly unknown[]) => boolean;
expect(fn(['admin', 'comment-reports', 'list', 'pending'])).toBe(true);
expect(fn(['admin', 'comment-reports', 'list', 'resolved'])).toBe(true);
expect(fn(['comments', 'byId', 'c-1'])).toBe(true);
expect(fn(['comments', 'thread', 't-1'])).toBe(true);
expect(fn(['comments', 'byQuiz', 'q-1'])).toBe(true);
expect(fn(['admin', 'review-reports', 'list'])).toBe(false);
  });

it('dedupes concurrent calls: the second call returns the in-flight Promise', async () => {
let resolveHide: (value: unknown) => void = () => {
      // Replaced below.
    };
mockHideComment.mockImplementationOnce(
() =>
new Promise((resolve) => {
resolveHide = resolve;
        }),
    );

const { result } = renderUseHideComment();

let first: Promise<unknown> = Promise.resolve();
let second: Promise<unknown> = Promise.resolve();
act(() => {
first = result.current.hide('c-1');
second = result.current.hide('c-1');
    });

await act(async () => {
resolveHide({ commentId: 'c-1', hidden: true });
await first;
await second;
    });

expect(mockHideComment).toHaveBeenCalledTimes(1);
  });
});

describe('TKT-7.6.C3 — useHideComment: error classification', () => {
it('COMMENT_ALREADY_HIDDEN surfaces as already-hidden and revalidates the cache', async () => {
const apiError = makeApiError('COMMENT_ALREADY_HIDDEN', 409, 'req-h');
mockHideComment.mockRejectedValue(apiError);

const { result } = renderUseHideComment();

await act(async () => {
try {
await result.current.hide('c-1');
      } catch {
        // Expected.
      }
    });

expect(result.current.lastOutcome?.kind).toBe('already-hidden');
expect(result.current.error?.code).toBe('COMMENT_ALREADY_HIDDEN');
expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
  });

it('COMMENT_NOT_FOUND surfaces as not-found', async () => {
const apiError = makeApiError('COMMENT_NOT_FOUND', 404, 'req-nf');
mockHideComment.mockRejectedValue(apiError);

const { result } = renderUseHideComment();

await act(async () => {
try {
await result.current.hide('c-1');
      } catch {
        // Expected.
      }
    });

expect(result.current.lastOutcome?.kind).toBe('not-found');
expect(result.current.error?.code).toBe('COMMENT_NOT_FOUND');
  });

it('GLOBAL_FORBIDDEN surfaces as forbidden', async () => {
const apiError = makeApiError('GLOBAL_FORBIDDEN', 403, 'req-fb');
mockHideComment.mockRejectedValue(apiError);

const { result } = renderUseHideComment();

await act(async () => {
try {
await result.current.hide('c-1');
      } catch {
        // Expected.
      }
    });

expect(result.current.lastOutcome?.kind).toBe('forbidden');
expect(result.current.error?.code).toBe('GLOBAL_FORBIDDEN');
  });

it('unknown errors (non-ApiError) are wrapped into an ApiError with code "UnknownError"', async () => {
mockHideComment.mockRejectedValueOnce(new Error('boom'));

const { result } = renderUseHideComment();

await act(async () => {
try {
await result.current.hide('c-1');
      } catch {
        // Expected.
      }
    });

expect(result.current.error).toBeInstanceOf(ApiError);
expect(result.current.error?.code).toBe('UnknownError');
expect(result.current.lastOutcome?.kind).toBe('reverted');
  });

it('failure emits a "failure" breadcrumb with code, requestId, correlationId', async () => {
const apiError = makeApiError('COMMENT_ALREADY_HIDDEN', 409, 'req-77');
mockHideComment.mockRejectedValue(apiError);

const { result } = renderUseHideComment();

await act(async () => {
try {
await result.current.hide('c-1');
      } catch {
        // Expected.
      }
    });

const failureCall = mockAddCommentModerationBreadcrumb.mock.calls.find(
(args) => (args[0] as { status: string }).status === 'failure',
    );

expect(failureCall).toBeDefined();
const payload = failureCall?.[0] as Record<string, unknown>;
expect(payload.action).toBe('b.admin.comment_moderation.hide');
expect(payload.code).toBe('COMMENT_ALREADY_HIDDEN');
expect(payload.requestId).toBe('req-77');
  });
});

describe('TKT-7.6.C3 — useHideComment: housekeeping', () => {
it('reset() clears state', async () => {
mockHideComment.mockRejectedValueOnce(makeApiError('GLOBAL_FORBIDDEN', 403));
const { result } = renderUseHideComment();

await act(async () => {
try {
await result.current.hide('c-1');
      } catch {
        // Expected.
      }
    });

expect(result.current.error).not.toBeNull();

act(() => {
result.current.reset();
    });

expect(result.current.error).toBeNull();
expect(result.current.lastOutcome).toBeNull();
expect(result.current.audit.beforeCommentId).toBeNull();
expect(result.current.audit.afterCommentId).toBeNull();
  });
});

describe('TKT-7.6.C3 — useRestoreComment: happy path', () => {
it('dispatches restoreComment with the comment id', async () => {
mockRestoreComment.mockResolvedValueOnce({ commentId: 'c-1', hidden: false });

const { result } = renderUseRestoreComment();

let payload: unknown = null;
await act(async () => {
payload = await result.current.restore('c-1');
    });

expect(payload).toEqual({ commentId: 'c-1', hidden: false });
expect(mockRestoreComment).toHaveBeenCalledWith('c-1', {});
expect(mockRestoreComment).toHaveBeenCalledTimes(1);
  });

it('emits started + success breadcrumbs with the documented breadcrumbAction', async () => {
mockRestoreComment.mockResolvedValueOnce({ commentId: 'c-1', hidden: false });

const { result } = renderUseRestoreComment();

await act(async () => {
await result.current.restore('c-1');
    });

const startCall = mockAddCommentModerationBreadcrumb.mock.calls.find(
(args) => (args[0] as { status: string }).status === 'started',
    );
const successCall = mockAddCommentModerationBreadcrumb.mock.calls.find(
(args) => (args[0] as { status: string }).status === 'success',
    );

expect(startCall).toBeDefined();
expect(successCall).toBeDefined();

const startPayload = startCall?.[0] as Record<string, unknown>;
const successPayload = successCall?.[0] as Record<string, unknown>;
expect(startPayload.action).toBe('b.admin.comment_moderation.restore');
expect(startPayload.route).toBe('admin-comment-moderation.restore_comment');
expect(successPayload.action).toBe('b.admin.comment_moderation.restore');
  });

it('success invalidates the comment-reports queue, the per-id read, and all comments:* keys', async () => {
mockRestoreComment.mockResolvedValueOnce({ commentId: 'c-1', hidden: false });

const { result } = renderUseRestoreComment();

await act(async () => {
await result.current.restore('c-1');
    });

expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
const [predicate] = mockGlobalMutate.mock.calls[0] ?? [];
expect(typeof predicate).toBe('function');

const fn = predicate as (key: readonly unknown[]) => boolean;
expect(fn(['admin', 'comment-reports', 'list', 'pending'])).toBe(true);
expect(fn(['comments', 'byId', 'c-1'])).toBe(true);
expect(fn(['comments', 'thread', 't-1'])).toBe(true);
  });
});

describe('TKT-7.6.C3 — useRestoreComment: error classification', () => {
it('COMMENT_NOT_HIDDEN surfaces as not-hidden and revalidates the cache', async () => {
const apiError = makeApiError('COMMENT_NOT_HIDDEN', 409, 'req-nh');
mockRestoreComment.mockRejectedValue(apiError);

const { result } = renderUseRestoreComment();

await act(async () => {
try {
await result.current.restore('c-1');
      } catch {
        // Expected.
      }
    });

expect(result.current.lastOutcome?.kind).toBe('not-hidden');
expect(result.current.error?.code).toBe('COMMENT_NOT_HIDDEN');
expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
  });

it('COMMENT_NOT_FOUND surfaces as not-found', async () => {
const apiError = makeApiError('COMMENT_NOT_FOUND', 404, 'req-nf');
mockRestoreComment.mockRejectedValue(apiError);

const { result } = renderUseRestoreComment();

await act(async () => {
try {
await result.current.restore('c-1');
      } catch {
        // Expected.
      }
    });

expect(result.current.lastOutcome?.kind).toBe('not-found');
  });

it('GLOBAL_FORBIDDEN surfaces as forbidden', async () => {
const apiError = makeApiError('GLOBAL_FORBIDDEN', 403, 'req-fb');
mockRestoreComment.mockRejectedValue(apiError);

const { result } = renderUseRestoreComment();

await act(async () => {
try {
await result.current.restore('c-1');
      } catch {
        // Expected.
      }
    });

expect(result.current.lastOutcome?.kind).toBe('forbidden');
  });

it('unknown errors (non-ApiError) are wrapped into an ApiError with code "UnknownError"', async () => {
mockRestoreComment.mockRejectedValueOnce(new Error('boom'));

const { result } = renderUseRestoreComment();

await act(async () => {
try {
await result.current.restore('c-1');
      } catch {
        // Expected.
      }
    });

expect(result.current.error).toBeInstanceOf(ApiError);
expect(result.current.error?.code).toBe('UnknownError');
expect(result.current.lastOutcome?.kind).toBe('reverted');
  });
});

describe('TKT-7.6.C3 — useHideComment: isPending flag', () => {
it('flips true during the call and false after success', async () => {
let resolveHide: (value: unknown) => void = () => {
      // Replaced below.
    };
mockHideComment.mockImplementationOnce(
() =>
new Promise((resolve) => {
resolveHide = resolve;
        }),
    );

const { result } = renderUseHideComment();

expect(result.current.isPending).toBe(false);
let promise: Promise<unknown> = Promise.resolve();
act(() => {
promise = result.current.hide('c-1');
    });

await waitFor(() => {
expect(result.current.isPending).toBe(true);
    });

await act(async () => {
resolveHide({ commentId: 'c-1', hidden: true });
await promise;
    });

expect(result.current.isPending).toBe(false);
  });
});

describe('TKT-7.6.G2 — useHideComment / useRestoreComment: cross-tab broadcast', () => {
it('useHideComment broadcasts ("hide", undefined, commentId) on success', async () => {
mockHideComment.mockResolvedValueOnce({ commentId: 'c-1', hidden: true });

const { result } = renderUseHideComment();

await act(async () => {
await result.current.hide('c-1');
    });

expect(mockBroadcastCommentModerationInvalidate).toHaveBeenCalledTimes(1);
expect(mockBroadcastCommentModerationInvalidate).toHaveBeenCalledWith(
'hide',
undefined,
'c-1',
    );
  });

it('useRestoreComment broadcasts ("restore", undefined, commentId) on success', async () => {
mockRestoreComment.mockResolvedValueOnce({
commentId: 'c-1',
hidden: false,
    });

const { result } = renderUseRestoreComment();

await act(async () => {
await result.current.restore('c-1');
    });

expect(mockBroadcastCommentModerationInvalidate).toHaveBeenCalledTimes(1);
expect(mockBroadcastCommentModerationInvalidate).toHaveBeenCalledWith(
'restore',
undefined,
'c-1',
    );
  });

it('useHideComment does NOT broadcast on failure', async () => {
const apiError = makeApiError('COMMENT_ALREADY_HIDDEN', 409);
mockHideComment.mockRejectedValue(apiError);

const { result } = renderUseHideComment();

await act(async () => {
try {
await result.current.hide('c-1');
      } catch {
        // Expected.
      }
    });

expect(mockBroadcastCommentModerationInvalidate).not.toHaveBeenCalled();
  });

it('useRestoreComment does NOT broadcast on failure', async () => {
const apiError = makeApiError('COMMENT_NOT_HIDDEN', 409);
mockRestoreComment.mockRejectedValue(apiError);

const { result } = renderUseRestoreComment();

await act(async () => {
try {
await result.current.restore('c-1');
      } catch {
        // Expected.
      }
    });

expect(mockBroadcastCommentModerationInvalidate).not.toHaveBeenCalled();
  });
});
