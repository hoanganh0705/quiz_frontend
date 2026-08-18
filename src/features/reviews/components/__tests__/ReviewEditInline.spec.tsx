

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ReviewEditInline } from '@/features/reviews/components/ReviewEditInline';
import type { MyReviewDto } from '@/features/reviews/types';

const useEditReviewMock = vi.fn();
const useDeleteReviewMock = vi.fn();

vi.mock('@/features/reviews/hooks/useEditReview', () => ({
useEditReview: (reviewId: unknown) => useEditReviewMock(reviewId),
}));

vi.mock('@/features/reviews/hooks/useDeleteReview', () => ({
useDeleteReview: (reviewId: unknown) => useDeleteReviewMock(reviewId),
}));

const REVIEW_ID = 'r-1';
const QUIZ_ID = 'quiz-1';

function makeReview(
overrides: Partial<MyReviewDto> = {},
): MyReviewDto {
return {
reviewId: REVIEW_ID,
quizId: QUIZ_ID,
userId: 'user-1',
username: 'tester',
rating: 4,
comment: 'Original comment text',
helpfulCount: 0,
viewerMarkedHelpful: false,
createdAt: '2025-01-01T00:00:00.000Z',
updatedAt: '2025-01-01T00:00:00.000Z',
...overrides,
  } as unknown as MyReviewDto;
}

function setEdit(opts: {
update?: ReturnType<typeof vi.fn>;
isLoading?: boolean;
error?: unknown;
lastOutcome?: unknown;
reset?: () => void;
}): void {
useEditReviewMock.mockReturnValue({
update: opts.update ?? vi.fn(),
isLoading: opts.isLoading ?? false,
error: opts.error ?? null,
lastOutcome: opts.lastOutcome ?? null,
reset: opts.reset ?? vi.fn(),
  });
}

function setDelete(opts: {
remove?: ReturnType<typeof vi.fn>;
isLoading?: boolean;
error?: unknown;
lastOutcome?: unknown;
reset?: () => void;
}): void {
useDeleteReviewMock.mockReturnValue({
remove: opts.remove ?? vi.fn(),
isLoading: opts.isLoading ?? false,
error: opts.error ?? null,
lastOutcome: opts.lastOutcome ?? null,
reset: opts.reset ?? vi.fn(),
  });
}

beforeEach(() => {
vi.clearAllMocks();
});

afterEach(() => {
vi.clearAllMocks();
});

describe('ReviewEditInline — visibility', () => {
it('renders edit + delete actions for the owner', () => {
setEdit({});
setDelete({});
render(<ReviewEditInline review={makeReview()} />);

expect(screen.getByTestId(`review-edit-inline-${REVIEW_ID}`)).toBeInTheDocument();
expect(screen.getByTestId(`review-edit-open-${REVIEW_ID}`)).toBeInTheDocument();
expect(screen.getByTestId(`review-delete-open-${REVIEW_ID}`)).toBeInTheDocument();
  });
});

describe('ReviewEditInline — edit mode', () => {
it('prefills with the persisted rating and text', () => {
setEdit({});
setDelete({});
render(<ReviewEditInline review={makeReview({ rating: 5, comment: 'Persisted' })} />);

fireEvent.click(screen.getByTestId(`review-edit-open-${REVIEW_ID}`));

expect(
(screen.getByTestId(`review-edit-inline-body-${REVIEW_ID}`) as HTMLTextAreaElement).value,
    ).toBe('Persisted');

expect(screen.getByRole('radio', { name: '5 stars', checked: true })).toBeInTheDocument();
  });

it('cancels back to the persisted values without a request', () => {
const update = vi.fn();
setEdit({ update });
setDelete({});
render(<ReviewEditInline review={makeReview({ comment: 'Persisted' })} />);

fireEvent.click(screen.getByTestId(`review-edit-open-${REVIEW_ID}`));
fireEvent.change(screen.getByTestId(`review-edit-inline-body-${REVIEW_ID}`), {
target: { value: 'Draft text in progress' },
    });
fireEvent.click(screen.getByTestId(`review-edit-inline-cancel-${REVIEW_ID}`));

expect(update).not.toHaveBeenCalled();
expect(
(screen.getByTestId(`review-edit-inline-body-${REVIEW_ID}`) as HTMLTextAreaElement).value,
    ).toBe('Persisted');
  });

it('submits valid changes once', async () => {
const update = vi.fn().mockResolvedValue(true);
setEdit({ update });
setDelete({});
render(
<ReviewEditInline review={makeReview({ rating: 3, comment: 'Original' })} />,
    );

fireEvent.click(screen.getByTestId(`review-edit-open-${REVIEW_ID}`));
fireEvent.click(screen.getByRole('radio', { name: '5 stars' }));
fireEvent.change(screen.getByTestId(`review-edit-inline-body-${REVIEW_ID}`), {
target: { value: '  Updated copy  ' },
    });
fireEvent.click(screen.getByTestId(`review-edit-inline-save-${REVIEW_ID}`));

await waitFor(() => {
expect(update).toHaveBeenCalledTimes(1);
    });
expect(update).toHaveBeenCalledWith({
rating: 5,
comment: 'Updated copy',
    });
  });

it('disables Save when the draft equals the persisted values', () => {
setEdit({});
setDelete({});
render(<ReviewEditInline review={makeReview({ rating: 4, comment: 'Same' })} />);

fireEvent.click(screen.getByTestId(`review-edit-open-${REVIEW_ID}`));
const button = screen.getByTestId(`review-edit-inline-save-${REVIEW_ID}`) as HTMLButtonElement;
expect(button.disabled).toBe(true);
  });

it('disables Save when the comment is empty', () => {
setEdit({});
setDelete({});
render(<ReviewEditInline review={makeReview({ rating: 4, comment: 'Original' })} />);

fireEvent.click(screen.getByTestId(`review-edit-open-${REVIEW_ID}`));
fireEvent.change(screen.getByTestId(`review-edit-inline-body-${REVIEW_ID}`), {
target: { value: '' },
    });
const button = screen.getByTestId(`review-edit-inline-save-${REVIEW_ID}`) as HTMLButtonElement;
expect(button.disabled).toBe(true);
  });

it('disables Save when the comment exceeds 2000 chars', () => {
setEdit({});
setDelete({});
render(<ReviewEditInline review={makeReview({ rating: 4, comment: 'Original' })} />);

fireEvent.click(screen.getByTestId(`review-edit-open-${REVIEW_ID}`));
fireEvent.change(screen.getByTestId(`review-edit-inline-body-${REVIEW_ID}`), {
target: { value: 'x'.repeat(2001) },
    });
const button = screen.getByTestId(`review-edit-inline-save-${REVIEW_ID}`) as HTMLButtonElement;
expect(button.disabled).toBe(true);
  });

it('drops the edit mode on stale outcome', () => {
setEdit({
update: vi.fn().mockResolvedValue(false),
lastOutcome: { kind: 'stale', cause: null },
    });
setDelete({});
render(<ReviewEditInline review={makeReview()} />);

fireEvent.click(screen.getByTestId(`review-edit-open-${REVIEW_ID}`));

setEdit({
update: vi.fn().mockResolvedValue(false),
lastOutcome: { kind: 'stale', cause: null },
    });
render(<ReviewEditInline review={makeReview()} />);

expect(screen.getByTestId(`review-edit-inline-${REVIEW_ID}`)).toBeInTheDocument();
  });
});

describe('ReviewEditInline — typed delete', () => {
it('opens a typed-confirm dialog with destructive copy', () => {
setEdit({});
setDelete({});
render(<ReviewEditInline review={makeReview()} />);

fireEvent.click(screen.getByTestId(`review-delete-open-${REVIEW_ID}`));

const dialog = screen.getByTestId(`review-delete-confirm-${REVIEW_ID}`);
expect(dialog).toBeInTheDocument();

expect(dialog.textContent ?? '').toMatch(
/remove your rating and helpful counts/i,
    );
  });

it('disables confirm before the typed string matches', () => {
setEdit({});
setDelete({});
render(<ReviewEditInline review={makeReview()} />);

fireEvent.click(screen.getByTestId(`review-delete-open-${REVIEW_ID}`));

const confirm = screen.getByTestId(
`${`review-delete-confirm-${REVIEW_ID}`}-confirm`,
    ) as HTMLButtonElement;
expect(confirm.disabled).toBe(true);

fireEvent.change(
screen.getByTestId(`${`review-delete-confirm-${REVIEW_ID}`}-typed-input`),
{ target: { value: 'delete' } },
    );
expect(confirm.disabled).toBe(false);
  });

it('calls the delete hook exactly once on confirm', async () => {
const remove = vi.fn().mockResolvedValue(true);
setEdit({});
setDelete({ remove });
render(<ReviewEditInline review={makeReview()} />);

fireEvent.click(screen.getByTestId(`review-delete-open-${REVIEW_ID}`));
fireEvent.change(
screen.getByTestId(`${`review-delete-confirm-${REVIEW_ID}`}-typed-input`),
{ target: { value: 'delete' } },
    );
await act(async () => {
fireEvent.click(
screen.getByTestId(`${`review-delete-confirm-${REVIEW_ID}`}-confirm`),
      );
    });

expect(remove).toHaveBeenCalledTimes(1);
  });

it('cancels without calling the delete hook', () => {
const remove = vi.fn().mockResolvedValue(true);
setEdit({});
setDelete({ remove });
render(<ReviewEditInline review={makeReview()} />);

fireEvent.click(screen.getByTestId(`review-delete-open-${REVIEW_ID}`));
fireEvent.click(
screen.getByTestId(`${`review-delete-confirm-${REVIEW_ID}`}-cancel`),
    );
expect(remove).not.toHaveBeenCalled();
  });

it('notifies the parent after a successful delete', async () => {
const onDeleted = vi.fn();
const remove = vi.fn().mockResolvedValue(true);
setEdit({});
setDelete({ remove });
const { rerender } = render(
<ReviewEditInline review={makeReview()} onDeleted={onDeleted} />,
    );

fireEvent.click(screen.getByTestId(`review-delete-open-${REVIEW_ID}`));
fireEvent.change(
screen.getByTestId(`${`review-delete-confirm-${REVIEW_ID}`}-typed-input`),
{ target: { value: 'delete' } },
    );
await act(async () => {
fireEvent.click(
screen.getByTestId(`${`review-delete-confirm-${REVIEW_ID}`}-confirm`),
      );
    });

setDelete({
remove,
lastOutcome: { kind: 'success', cause: null },
    });
rerender(
<ReviewEditInline review={makeReview()} onDeleted={onDeleted} />,
    );

await waitFor(() => {
expect(onDeleted).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ReviewEditInline — stale / not-found recovery', () => {
it('closes edit + notifies parent when the delete hook returns not-found', async () => {
const onDeleted = vi.fn();
const remove = vi.fn().mockResolvedValue(false);
setEdit({});
setDelete({ remove });
const { rerender } = render(
<ReviewEditInline review={makeReview()} onDeleted={onDeleted} />,
    );

fireEvent.click(screen.getByTestId(`review-delete-open-${REVIEW_ID}`));
fireEvent.change(
screen.getByTestId(`${`review-delete-confirm-${REVIEW_ID}`}-typed-input`),
{ target: { value: 'delete' } },
    );
await act(async () => {
fireEvent.click(
screen.getByTestId(`${`review-delete-confirm-${REVIEW_ID}`}-confirm`),
      );
    });

setDelete({
remove,
lastOutcome: { kind: 'not-found', cause: null },
    });
rerender(<ReviewEditInline review={makeReview()} onDeleted={onDeleted} />);

await waitFor(() => {
expect(onDeleted).toHaveBeenCalled();
    });
  });
});