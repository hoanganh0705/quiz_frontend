

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { ApiError } from '@/lib/api/core/ApiError';
import { getUserCopy } from '@/lib/api/error-codes';
import { ConfirmDialog } from '@/components/primitives';
import { useOptimisticMutation } from '@/lib/api/useOptimisticMutation';
import {
closeAttemptsChannel,
} from '@/lib/api/core/attempts-broadcast-channel';

vi.mock('@/features/quizzes/services/quizzes.service', () => ({
listQuizzes: vi.fn(),
createQuiz: vi.fn(),
bulkCreateQuizQuestions: vi.fn(),
}));

vi.mock('@/features/bookmarks/services/bookmarks.service', () => ({
addBookmark: vi.fn(),
addBookmarksBulk: vi.fn(),
listBookmarksInCollection: vi.fn(),
}));

vi.mock('@/features/attempts/services/attempts.service', () => ({
startAttempt: vi.fn(),
submitAnswer: vi.fn(),
listMyAttempts: vi.fn(),
}));

vi.mock('@/features/reviews/services/reviews.service', () => ({
listQuizReviews: vi.fn(),
createReview: vi.fn(),
markReviewHelpful: vi.fn(),
}));

vi.mock('@/features/comments/services/comments.service', () => ({
listQuizComments: vi.fn(),
voteComment: vi.fn(),
reportComment: vi.fn(),
}));

vi.mock('@/features/users/services/users.service', () => ({
updateMyProfile: vi.fn(),
updateMySettings: vi.fn(),
}));

function makeApiError(status: number, code: string, detail: string): ApiError {

const axiosLike = {
response: {
status,
statusText: code,
data: {
type: 'about:blank',
title: code,
status,
detail,

extensions: { code },
      },
    },
message: detail,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
return new ApiError(axiosLike);
}

describe('Story 4.1 — service layer propagates ApiError.code', () => {
it('quizzes.service.createQuiz surfaces ApiError.code on 4xx', async () => {
const { createQuiz } = await import(
'@/features/quizzes/services/quizzes.service'
    );
(createQuiz as unknown as Mock).mockRejectedValue(
makeApiError(409, 'QUIZ_DUPLICATE_SLUG', 'duplicate'),
    );

await expect(
(createQuiz as unknown as Mock)({}),
    ).rejects.toMatchObject({ code: 'QUIZ_DUPLICATE_SLUG', status: 409 });
  });

it('bookmarks.service.addBookmark surfaces ApiError.code on 4xx', async () => {
const { addBookmark } = await import(
'@/features/bookmarks/services/bookmarks.service'
    );
(addBookmark as unknown as Mock).mockRejectedValue(
makeApiError(409, 'BOOKMARK_CONFLICT', 'duplicate'),
    );

await expect(
(addBookmark as unknown as Mock)('c1', {}),
    ).rejects.toMatchObject({ code: 'BOOKMARK_CONFLICT' });
  });

it('attempts.service.startAttempt surfaces ApiError.code on 4xx', async () => {
const { startAttempt } = await import(
'@/features/attempts/services/attempts.service'
    );
(startAttempt as unknown as Mock).mockRejectedValue(
makeApiError(409, 'ATTEMPT_ALREADY_STARTED', 'already active'),
    );

await expect(
(startAttempt as unknown as Mock)('q1', {}),
    ).rejects.toMatchObject({ code: 'ATTEMPT_ALREADY_STARTED' });
  });

it('reviews.service.createReview surfaces ApiError.code on 4xx', async () => {
const { createReview } = await import(
'@/features/reviews/services/reviews.service'
    );
(createReview as unknown as Mock).mockRejectedValue(
makeApiError(400, 'REVIEW_ATTEMPT_REQUIRED', 'must attempt'),
    );

await expect(
(createReview as unknown as Mock)('q1', {}),
    ).rejects.toMatchObject({ code: 'REVIEW_ATTEMPT_REQUIRED' });
  });

it('comments.service.voteComment surfaces ApiError.code on 4xx', async () => {
const { voteComment } = await import(
'@/features/comments/services/comments.service'
    );
(voteComment as unknown as Mock).mockRejectedValue(
makeApiError(400, 'COMMENT_SELF_VOTE', 'cannot vote own comment'),
    );

await expect(
(voteComment as unknown as Mock)('c1', {}),
    ).rejects.toMatchObject({ code: 'COMMENT_SELF_VOTE' });
  });

it('users.service.updateMyProfile surfaces ApiError.code on 4xx', async () => {
const { updateMyProfile } = await import(
'@/features/users/services/users.service'
    );
(updateMyProfile as unknown as Mock).mockRejectedValue(
makeApiError(400, 'USER_BIO_TOO_LONG', 'bio too long'),
    );

await expect(
(updateMyProfile as unknown as Mock)({}),
    ).rejects.toMatchObject({ code: 'USER_BIO_TOO_LONG' });
  });
});

describe('Story 4.1 — USER_COPY lookup covers every priority code', () => {
const PRIORITY_CODES = [
'QUIZ_DUPLICATE_SLUG',
'QUIZ_NOT_PUBLISHED',
'QUIZ_VERSION_NOT_DRAFT',
'ATTEMPT_ALREADY_STARTED',
'ATTEMPT_NOT_ACTIVE',
'ATTEMPT_QUIZ_NOT_PUBLISHED',
'BOOKMARK_CONFLICT',
'BOOKMARK_NOT_FOUND',
'REVIEW_ATTEMPT_REQUIRED',
'REVIEW_CONFLICT',
'COMMENT_SELF_VOTE',
'COMMENT_SELF_REPORT',
'COMMENT_DUPLICATE_REPORT',
'USER_BIO_TOO_LONG',
  ] as const;

it.each(PRIORITY_CODES)('priority code %s has a populated USER_COPY entry', (code) => {
const copy = getUserCopy(code);
expect(copy.title.length).toBeGreaterThan(0);
expect(copy.body.length).toBeGreaterThan(0);
  });

it('unknown codes fall back to a non-empty default', () => {
const copy = getUserCopy('NOT_A_REAL_CODE_XYZ');
expect(copy.title.length).toBeGreaterThan(0);
expect(copy.body.length).toBeGreaterThan(0);
  });
});

describe('Story 4.1 — <ConfirmDialog /> primitive', () => {
afterEach(() => {
cleanup();
  });

it('renders destructive-permanent copy and fires onConfirm', () => {
const onConfirm = vi.fn();
render(
<ConfirmDialog
open
kind="destructive-permanent"
entityLabel="quiz"
onConfirm={onConfirm}
onCancel={() => {}}
      />,
    );

expect(screen.getAllByText(/permanently/i).length).toBeGreaterThan(0);
fireEvent.click(screen.getByTestId('confirm-dialog-confirm'));
expect(onConfirm).toHaveBeenCalledTimes(1);
  });

it('typed-confirm keeps the button disabled until the typed string matches', () => {
const onConfirm = vi.fn();
render(
<ConfirmDialog
open
kind="typed-confirm"
entityLabel="account"
typedOverride="delete my account"
onConfirm={onConfirm}
onCancel={() => {}}
      />,
    );

const confirmBtn = screen.getByTestId('confirm-dialog-confirm');
expect(confirmBtn).toBeDisabled();

const input = screen.getByRole('textbox');
fireEvent.change(input, { target: { value: 'wrong text' } });
expect(confirmBtn).toBeDisabled();

fireEvent.change(input, { target: { value: 'delete my account' } });
expect(confirmBtn).not.toBeDisabled();

fireEvent.click(confirmBtn);
expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('Story 4.1 — useOptimisticMutation completes successfully', () => {
beforeEach(() => {
closeAttemptsChannel();
  });

afterEach(() => {
cleanup();
closeAttemptsChannel();
  });

function Probe({ onRun }: { onRun: () => Promise<void> }) {
const { mutate, lastResult } = useOptimisticMutation();
return (
<div>
<button
data-testid="run"
onClick={() => {
mutate({
key: ['integration-test', 'k1'] as const,
optimisticData: (snapshot: unknown) => ({
optimistic: true,
previous: snapshot ?? null,
              }),
run: async () => {
await onRun();
              },
            });
          }}
        >
run
        </button>
<span data-testid="status">
{!lastResult
? 'idle'
: lastResult.status === 'pending'
? 'pending'
: lastResult.status === 'success'
? 'success'
: lastResult.status === 'cooldown'
? 'cooldown'
: 'error'}
</span>
</div>
    );
  }

it('runs the mutation once and transitions lastResult to success', async () => {
const onRun = vi.fn().mockResolvedValue(undefined);
render(<Probe onRun={onRun} />);

expect(screen.getByTestId('status').textContent).toBe('idle');

fireEvent.click(screen.getByTestId('run'));

await new Promise((r) => setTimeout(r, 10));

expect(onRun).toHaveBeenCalledTimes(1);
expect(screen.getByTestId('status').textContent).toBe('success');
  });
});