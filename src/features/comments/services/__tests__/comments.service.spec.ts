

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import {
createComment,
editComment,
reportComment,
voteComment,
} from '@/features/comments/services/comments.service';

const createCommentMock = vi.fn();
const editCommentMock = vi.fn();
const castVoteMock = vi.fn();
const reportCommentMock = vi.fn();

vi.mock('@/lib/api', async () => {
const actual =
await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
return {
...actual,
getComments: () => ({
editComment: editCommentMock,
castVote: castVoteMock,
reportComment: reportCommentMock,
    }),
getQuizzes: () => ({
createComment: createCommentMock,
    }),
  };
});

afterEach(() => {
vi.clearAllMocks();
});

function makeApiError(status: number, code: string, message: string): ApiError {
return new ApiError({
name: 'AxiosError',
message,
isAxiosError: true,
response: {
status,
statusText: 'X',
data: {
type: 'https://api.quiz.local/problems/x',
title: 'X',
status,
detail: message,
instance: '/api/v1/x',
extensions: { code, requestId: 'req-test' },
      },
headers: {},
config: undefined as never,
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

describe('comments.service — pass-through', () => {
it('createComment (quizzes tag) forwards quizId and payload', async () => {
createCommentMock.mockResolvedValue({ commentId: 'c1' });

await createComment('q1', {
body: 'hello',
    } as Parameters<typeof createComment>[1]);

expect(createCommentMock).toHaveBeenCalledTimes(1);
expect(createCommentMock).toHaveBeenCalledWith('q1', { body: 'hello' });
  });
});

describe('comments.service — ApiError code exposure', () => {
it('voteComment surfaces 400 COMMENT_SELF_VOTE', async () => {
castVoteMock.mockRejectedValue(
makeApiError(400, 'COMMENT_SELF_VOTE', 'cannot vote on own comment'),
    );

await expect(
voteComment('c1', {
value: 1,
      } as unknown as Parameters<typeof voteComment>[1]),
    ).rejects.toMatchObject({
code: 'COMMENT_SELF_VOTE',
status: 400,
    });
  });

it('reportComment surfaces 400 COMMENT_SELF_REPORT', async () => {
reportCommentMock.mockRejectedValue(
makeApiError(400, 'COMMENT_SELF_REPORT', 'cannot report own comment'),
    );

await expect(
reportComment('c1', {
reason: 'spam',
      } as Parameters<typeof reportComment>[1]),
    ).rejects.toMatchObject({
code: 'COMMENT_SELF_REPORT',
status: 400,
    });
  });

it('reportComment surfaces 409 COMMENT_DUPLICATE_REPORT', async () => {
reportCommentMock.mockRejectedValue(
makeApiError(409, 'COMMENT_DUPLICATE_REPORT', 'already reported'),
    );

await expect(
reportComment('c1', {
reason: 'spam',
      } as Parameters<typeof reportComment>[1]),
    ).rejects.toMatchObject({
code: 'COMMENT_DUPLICATE_REPORT',
status: 409,
    });
  });

it('editComment surfaces 409 COMMENT_REPLY_LIMIT_EXCEEDED', async () => {
editCommentMock.mockRejectedValue(
makeApiError(409, 'COMMENT_REPLY_LIMIT_EXCEEDED', 'reply limit'),
    );

await expect(
editComment('c1', {
body: 'reply',
      } as Parameters<typeof editComment>[1]),
    ).rejects.toMatchObject({
code: 'COMMENT_REPLY_LIMIT_EXCEEDED',
status: 409,
    });
  });
});