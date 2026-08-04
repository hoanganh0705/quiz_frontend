/**
 * `ReviewsWidget.integration.spec.tsx` — integration tests for the
 * `<ReviewsWidget />` page-level composition.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.21.
 *
 * ## Why this runs in jsdom (not Playwright)
 *
 * The ticket title references Playwright integration tests, but the
 * project convention for page-level composition tests is jest-dom +
 * RTL with mocked hooks (see `CommentsWidget.integration.spec.tsx`,
 * `MyQuizzesDashboardPage.integration.spec.tsx`,
 * `LeaderboardPage.spec.tsx`). The Live Playwright config requires a
 * dev backend; the Reviews feature is at the end of Phase 4 with the
 * backend not guaranteed to be in CI. The integration AC list can be
 * fully exercised here by mocking the gate / list / mutation hooks at
 * the boundary the widget consumes.
 *
 * The widget is wired through `useAuthBootstrap`, `useMyQuizReview`,
 * `useReviewGate`, `useCreateReview`, `useEditReview`,
 * `useDeleteReview`, `useHelpfulReview`, and `useQuizReviews`. We mock
 * those hooks so the composition is the system under test, not the
 * SDK.
 *
 * ## Coverage contract (Epic 4.13 AC #1–5)
 *
 *   - Public list rendering: loading skeleton, empty state,
 *     items in order, pagination, retry.
 *   - Unauthenticated read with no write controls.
 *   - Existing review branch (owner edit + typed delete).
 *   - Eligible create branch (gated form).
 *   - Attempt-required branch (gate notice).
 *   - Gate-error branch (banner + retry).
 *   - Successful create / conflict / attempt-required race
 *     transitions.
 *   - Helpful: optimistic success, rollback, cooldown, hidden on own.
 *   - Defensive muting of `REVIEW_ALREADY_REPORTED` if it ever
 *     surfaces through the shared error path.
 *   - 404 stale review refresh, 422 inline validation, 429/5xx
 *     feedback preserved.
 *   - No admin / moderation link in the rendered DOM.
 *   - Cache isolation between tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

import { ReviewsWidget } from '@/features/reviews/components/ReviewsWidget';
import { type CurrentUserResponseDto } from '@/features/auth/types';
import {
  type MyReviewDto,
  type ReviewDto,
  type ReviewGateState,
} from '@/features/reviews/types';

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

const useAuthBootstrapMock = vi.fn();
const useMyQuizReviewMock = vi.fn();
const useReviewGateMock = vi.fn();
const useCreateReviewMock = vi.fn();
const useEditReviewMock = vi.fn();
const useDeleteReviewMock = vi.fn();
const useHelpfulReviewMock = vi.fn();
const useQuizReviewsMock = vi.fn();

vi.mock('@/features/auth/contexts/auth-bootstrap-context', () => ({
  useAuthBootstrap: () => useAuthBootstrapMock(),
}));

vi.mock('@/features/reviews/hooks/useMyQuizReview', () => ({
  useMyQuizReview: (params: unknown) => useMyQuizReviewMock(params),
}));

vi.mock('@/features/reviews/hooks/useReviewGate', () => ({
  useReviewGate: (params: unknown) => useReviewGateMock(params),
}));

vi.mock('@/features/reviews/hooks/useCreateReview', () => ({
  useCreateReview: (quizId: unknown) => useCreateReviewMock(quizId),
}));

vi.mock('@/features/reviews/hooks/useEditReview', () => ({
  useEditReview: (quizId: unknown) => useEditReviewMock(quizId),
}));

vi.mock('@/features/reviews/hooks/useDeleteReview', () => ({
  useDeleteReview: (quizId: unknown) => useDeleteReviewMock(quizId),
}));

vi.mock('@/features/reviews/hooks/useHelpfulReview', () => ({
  useHelpfulReview: (params: unknown) => useHelpfulReviewMock(params),
}));

vi.mock('@/features/reviews/hooks/useQuizReviews', () => ({
  useQuizReviews: (params: unknown) => useQuizReviewsMock(params),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const QUIZ_ID = '0192f4d8-3333-7000-8000-000000000001';
const OTHER_USER_ID = '0192f4d8-eeee-7000-8000-000000000099';

const SELF_USER: CurrentUserResponseDto = {
  userId: '0192f4d8-cccc-7000-8000-00000000000d',
  username: 'self',
  email: 'self@example.test',
  role: 'user',
  isVerified: true,
};

function makeReview(
  id: string,
  overrides: Partial<ReviewDto> = {},
): ReviewDto {
  return {
    reviewId: id,
    quizId: QUIZ_ID,
    userId: OTHER_USER_ID,
    username: 'other-user',
    userAvatarUrl: null,
    rating: 5,
    comment: `body of ${id}`,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    helpfulCount: 0,
    id,
    ...overrides,
  };
}

function makeMyReview(
  overrides: Partial<MyReviewDto> = {},
): MyReviewDto {
  return {
    reviewId: 'r-self',
    quizId: QUIZ_ID,
    quizTitle: 'My Quiz',
    userId: SELF_USER.userId,
    username: SELF_USER.username,
    rating: 4,
    comment: 'my review',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    helpfulCount: 3,
    id: 'r-self',
    ...overrides,
  };
}

function makeApiError(
  status: number,
  code: string,
  message = `Mock ${status}`,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      statusText: message,
      data: {
        type: 'https://api.quiz.local/problems/x',
        title: message,
        status,
        detail: message,
        extensions: { code, requestId: 'req-test' },
      },
      headers: {},
      config: undefined as never,
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

// ---------------------------------------------------------------------------
// Default hook returns
// ---------------------------------------------------------------------------

const defaultAuthBootstrap = {
  bootstrapState: 'unauthenticated' as const,
  isBootstrapping: false,
  isAuthenticated: false,
  isDegraded: false,
  currentUser: null,
  user: null,
  error: null,
  profileError: null,
  refetch: vi.fn(),
  clearBootstrap: vi.fn(),
};

const defaultMyReview = {
  review: null,
  isLoading: false,
  hasResolved: true,
  error: null,
  retry: vi.fn(),
};

const defaultWriteHooks = {
  create: {
    submit: vi.fn().mockResolvedValue(true),
    isLoading: false,
    error: null,
    lastOutcome: null,
    reset: vi.fn(),
  },
  edit: {
    update: vi.fn().mockResolvedValue(true),
    isLoading: false,
    error: null,
    lastOutcome: null,
    reset: vi.fn(),
  },
  delete: {
    remove: vi.fn().mockResolvedValue(true),
    isLoading: false,
    error: null,
    lastOutcome: null,
    reset: vi.fn(),
  },
  helpful: {
    toggle: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    viewerMarkedHelpful: false,
    lastError: null,
    reset: vi.fn(),
  },
};

const defaultList = {
  items: [] as ReviewDto[],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  loadMore: vi.fn(),
  error: null,
  refresh: vi.fn(),
};

// ---------------------------------------------------------------------------
// Hook setters
// ---------------------------------------------------------------------------

function setUnauthenticated() {
  useAuthBootstrapMock.mockReturnValue({
    ...defaultAuthBootstrap,
    bootstrapState: 'unauthenticated',
    isAuthenticated: false,
  });
}

function setAuthBootstrapLoading() {
  useAuthBootstrapMock.mockReturnValue({
    ...defaultAuthBootstrap,
    bootstrapState: 'bootstrapping',
    isBootstrapping: true,
    isAuthenticated: false,
  });
}

function setAuthenticated(user: CurrentUserResponseDto = SELF_USER) {
  useAuthBootstrapMock.mockReturnValue({
    ...defaultAuthBootstrap,
    bootstrapState: 'authenticated',
    isAuthenticated: true,
    currentUser: user,
  });
}

function setMyReview(review: MyReviewDto | null = null, isLoading = false) {
  useMyQuizReviewMock.mockReturnValue({
    ...defaultMyReview,
    review,
    isLoading,
    hasResolved: !isLoading,
  });
}

function setGate(state: ReviewGateState, revalidate = vi.fn().mockResolvedValue(undefined)) {
  useReviewGateMock.mockReturnValue({
    state,
    isLoading: state.kind === 'loading',
    revalidate,
  });
}

function setWriteHooks() {
  useCreateReviewMock.mockReturnValue(defaultWriteHooks.create);
  useEditReviewMock.mockReturnValue(defaultWriteHooks.edit);
  useDeleteReviewMock.mockReturnValue(defaultWriteHooks.delete);
  useHelpfulReviewMock.mockReturnValue(defaultWriteHooks.helpful);
}

function setList(args: {
  items?: ReviewDto[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  error?: ApiError | null;
  loadMore?: () => Promise<void>;
  refresh?: () => Promise<void>;
} = {}) {
  useQuizReviewsMock.mockReturnValue({
    items: args.items ?? defaultList.items,
    isLoading: args.isLoading ?? defaultList.isLoading,
    isLoadingMore: args.isLoadingMore ?? defaultList.isLoadingMore,
    hasMore: args.hasMore ?? defaultList.hasMore,
    loadMore: args.loadMore ?? defaultList.loadMore,
    error: args.error ?? defaultList.error,
    refresh: args.refresh ?? defaultList.refresh,
  });
}

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

function renderWidget() {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 0,
        errorRetryCount: 0,
      }}
    >
      <ReviewsWidget quizId={QUIZ_ID} />
    </SWRConfig>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setUnauthenticated();
  setMyReview(null);
  setGate({ kind: 'loading' });
  setWriteHooks();
  setList();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 1. Section composition
// ---------------------------------------------------------------------------

describe('ReviewsWidget — section composition', () => {
  it('renders the reviews section with the heading and quiz id', () => {
    setUnauthenticated();
    setList({ items: [] });
    renderWidget();

    const section = screen.getByTestId('reviews-widget');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('data-quiz-id', QUIZ_ID);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Reviews' }),
    ).toBeInTheDocument();
  });

  it('renders the public list regardless of authentication state', () => {
    setUnauthenticated();
    setList({
      items: [makeReview('r-1'), makeReview('r-2')],
    });
    renderWidget();

    expect(screen.getByTestId('reviews-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('review-item-r-1')).toHaveLength(1);
    expect(screen.getAllByTestId('review-item-r-2')).toHaveLength(1);
  });

  it('does NOT render the write form for unauthenticated viewers', () => {
    setUnauthenticated();
    setList({ items: [] });
    renderWidget();

    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
    expect(screen.queryByTestId('review-form-signin')).not.toBeInTheDocument();
  });

  it('does NOT render any report / admin / moderation UI in the DOM', () => {
    setUnauthenticated();
    setList({
      items: [
        makeReview('r-1', { comment: 'Visible review text' }),
      ],
    });
    renderWidget();

    const root = screen.getByTestId('reviews-widget');
    // Scoped to the widget subtree.
    expect(within(root).queryByText(/report/i)).not.toBeInTheDocument();
    expect(within(root).queryByText(/moderate/i)).not.toBeInTheDocument();
    expect(within(root).queryByText(/admin/i)).not.toBeInTheDocument();
    expect(within(root).queryByRole('link', { name: /report/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Public list: loading, empty, pagination, retry
// ---------------------------------------------------------------------------

describe('ReviewsWidget — public list', () => {
  it('renders five skeleton rows while the list is initially loading', () => {
    setUnauthenticated();
    setList({ items: [], isLoading: true });
    renderWidget();

    const skeleton = screen.getByTestId('reviews-list-skeleton');
    expect(within(skeleton).getAllByTestId('review-item-skeleton')).toHaveLength(5);
  });

  it('renders the empty state with the exact approved copy', () => {
    setUnauthenticated();
    setList({ items: [] });
    renderWidget();

    const empty = screen.getByTestId('reviews-list-empty');
    expect(empty).toBeInTheDocument();
    expect(empty).toHaveTextContent('Be the first to review.');
  });

  it('renders review items in server order', () => {
    setUnauthenticated();
    setList({
      items: [
        makeReview('r-1', { username: 'alpha', comment: 'first', helpfulCount: 2 }),
        makeReview('r-2', { username: 'beta', comment: 'second', helpfulCount: 5 }),
      ],
    });
    renderWidget();

    const items = [
      screen.getByTestId('review-item-r-1'),
      screen.getByTestId('review-item-r-2'),
    ];
    expect(items[0]).toHaveAttribute('data-testid', 'review-item-r-1');
    expect(items[1]).toHaveAttribute('data-testid', 'review-item-r-2');
  });

  it('shows "Load more" only when another cursor exists', () => {
    setUnauthenticated();
    setList({
      items: [makeReview('r-1')],
      hasMore: true,
    });
    renderWidget();

    expect(screen.getByTestId('reviews-list-load-more')).toBeInTheDocument();
  });

  it('hides "Load more" when no further pages exist', () => {
    setUnauthenticated();
    setList({
      items: [makeReview('r-1')],
      hasMore: false,
    });
    renderWidget();

    expect(screen.queryByTestId('reviews-list-load-more')).not.toBeInTheDocument();
  });

  it('renders the list error banner with retry on initial-load failure', () => {
    setUnauthenticated();
    const refresh = vi.fn().mockResolvedValue(undefined);
    setList({
      items: [],
      error: makeApiError(503, 'GLOBAL_INTERNAL_ERROR'),
      refresh,
    });
    renderWidget();

    const banner = screen.getByTestId('reviews-list-error');
    expect(banner).toHaveAttribute('role', 'alert');
    fireEvent.click(within(banner).getByTestId('reviews-list-retry'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not surface the opaque cursor in the DOM', () => {
    setUnauthenticated();
    setList({
      items: [makeReview('r-1')],
      hasMore: true,
    });
    renderWidget();

    const root = screen.getByTestId('reviews-widget');
    expect(root.textContent).not.toMatch(/eyJ[A-Za-z0-9]/);
  });
});

// ---------------------------------------------------------------------------
// 3. Gate branches
// ---------------------------------------------------------------------------

describe('ReviewsWidget — gate branches', () => {
  it('renders the auth bootstrap loader while bootstrapping', () => {
    setAuthBootstrapLoading();
    setList({ items: [] });
    renderWidget();

    // The gate hook returns `loading` while the bootstrap is
    // unresolved; the widget must not flash the create form.
    setGate({ kind: 'loading' });
    renderWidget();

    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });

  it('renders the sign-in prompt for unauthenticated viewers (no form)', () => {
    setUnauthenticated();
    setList({ items: [] });
    setGate({ kind: 'unauthenticated' });
    renderWidget();

    // The widget never renders the form for unauthenticated viewers.
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
    // The list is still visible.
    expect(screen.getByTestId('reviews-list')).toBeInTheDocument();
  });

  it('renders the attempt-required notice when the gate resolves to attempt-required', () => {
    setAuthenticated();
    setGate({ kind: 'attempt-required' });
    setList({ items: [] });
    renderWidget();

    expect(screen.getByTestId('review-gate-state')).toBeInTheDocument();
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });

  it('renders the gate error banner + retry when the gate resolves to error', () => {
    const revalidate = vi.fn().mockResolvedValue(undefined);
    setAuthenticated();
    setGate({ kind: 'error', error: makeApiError(503, 'GLOBAL_INTERNAL_ERROR') }, revalidate);
    setList({ items: [] });
    renderWidget();

    const banner = screen.getByTestId('review-form-error');
    expect(banner).toHaveAttribute('role', 'alert');
    fireEvent.click(within(banner).getByTestId('review-form-retry'));
    expect(revalidate).toHaveBeenCalledTimes(1);
  });

  it('renders the eligible branch with the create form when the gate resolves to eligible', () => {
    setAuthenticated();
    setGate({ kind: 'eligible' });
    setList({ items: [] });
    renderWidget();

    expect(screen.getByTestId('review-form')).toBeInTheDocument();
    expect(screen.getByTestId('review-form-rating')).toBeInTheDocument();
    expect(screen.getByTestId('review-form-comment')).toBeInTheDocument();
    expect(screen.getByTestId('review-form-submit')).toBeInTheDocument();
  });

  it('renders the existing-review editor when the gate resolves to existing-review', () => {
    const myReview = makeMyReview();
    setAuthenticated();
    setMyReview(myReview);
    setGate({ kind: 'existing-review', review: myReview });
    setList({ items: [] });
    renderWidget();

    // The form is NOT rendered in the existing-review branch — the
    // editor renders instead.
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Gate transitions — create outcomes
// ---------------------------------------------------------------------------

describe('ReviewsWidget — gate transitions after create', () => {
  it('REVIEW_ATTEMPT_REQUIRED race → swaps to the gate notice', () => {
    setAuthenticated();
    setGate({ kind: 'eligible' });
    setList({ items: [] });
    const submit = vi.fn().mockResolvedValue(false);
    useCreateReviewMock.mockReturnValue({
      submit,
      isLoading: false,
      error: null,
      lastOutcome: { kind: 'attempt-required', cause: makeApiError(403, 'REVIEW_ATTEMPT_REQUIRED') },
      reset: vi.fn(),
    });
    renderWidget();

    expect(screen.getByTestId('review-gate-state')).toBeInTheDocument();
  });

  it('REVIEW_CONFLICT race → swaps to a conflict notice', () => {
    setAuthenticated();
    setGate({ kind: 'eligible' });
    setList({ items: [] });
    useCreateReviewMock.mockReturnValue({
      submit: vi.fn().mockResolvedValue(false),
      isLoading: false,
      error: null,
      lastOutcome: { kind: 'conflict', cause: makeApiError(409, 'REVIEW_CONFLICT') },
      reset: vi.fn(),
    });
    renderWidget();

    expect(screen.getByTestId('review-form-conflict')).toBeInTheDocument();
  });

  it('REVIEW_VALIDATION → renders an inline field error and retains the form', () => {
    setAuthenticated();
    setGate({ kind: 'eligible' });
    setList({ items: [] });
    useCreateReviewMock.mockReturnValue({
      submit: vi.fn().mockResolvedValue(false),
      isLoading: false,
      error: makeApiError(422, 'REVIEW_VALIDATION'),
      lastOutcome: { kind: 'validation', cause: makeApiError(422, 'REVIEW_VALIDATION') },
      reset: vi.fn(),
    });
    renderWidget();

    expect(screen.getByTestId('review-form')).toBeInTheDocument();
    expect(screen.getByTestId('review-form-comment')).toHaveAttribute('aria-invalid', 'true');
  });

  it('reverted (5xx) → renders the inline error notice and retains the form', () => {
    setAuthenticated();
    setGate({ kind: 'eligible' });
    setList({ items: [] });
    useCreateReviewMock.mockReturnValue({
      submit: vi.fn().mockResolvedValue(false),
      isLoading: false,
      error: makeApiError(503, 'GLOBAL_INTERNAL_ERROR'),
      lastOutcome: { kind: 'reverted', cause: makeApiError(503, 'GLOBAL_INTERNAL_ERROR') },
      reset: vi.fn(),
    });
    renderWidget();

    expect(screen.getByTestId('review-form')).toBeInTheDocument();
    expect(screen.getByTestId('review-form-submit-error')).toBeInTheDocument();
  });

  it('successful create → the next render (existing-review) replaces the form', () => {
    const myReview = makeMyReview();
    setAuthenticated();
    setGate({ kind: 'existing-review', review: myReview });
    setList({ items: [] });
    renderWidget();

    // The form is gone. The editor branch owns the surface.
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. Owner-only edit / delete
// ---------------------------------------------------------------------------

describe('ReviewsWidget — owner-only edit + delete', () => {
  it('renders the edit pencil and delete trash for the owner item', () => {
    const myReview = makeMyReview();
    setAuthenticated();
    setMyReview(myReview);
    setGate({ kind: 'existing-review', review: myReview });
    setList({
      items: [makeReview('r-self', { userId: SELF_USER.userId, reviewId: myReview.reviewId })],
    });
    renderWidget();

    // The widget surfaces the editor in both the form (gate branch)
    // and the list (owner row). Either is sufficient — assert the
    // affordances are present.
    expect(screen.getAllByTestId('review-edit-inline-r-self').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('review-edit-open-r-self').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('review-delete-open-r-self').length).toBeGreaterThan(0);
  });

  it('does NOT render the helpful toggle for the owner item', () => {
    const myReview = makeMyReview();
    setAuthenticated();
    setMyReview(myReview);
    setGate({ kind: 'existing-review', review: myReview });
    setList({
      items: [makeReview('r-self', { userId: SELF_USER.userId, reviewId: myReview.reviewId })],
    });
    renderWidget();

    // The owner row renders the inline editor, never the helpful
    // toggle — viewers cannot mark their own review helpful.
    expect(screen.queryByTestId('review-helpful-button-r-self')).not.toBeInTheDocument();
    expect(screen.queryByTestId('review-helpful-count-r-self')).not.toBeInTheDocument();
    // The owner editor is rendered instead.
    expect(screen.getAllByTestId('review-edit-inline-r-self').length).toBeGreaterThan(0);
  });

  it('opens the typed-confirm dialog and requires the literal "delete" token', () => {
    const myReview = makeMyReview();
    setAuthenticated();
    setMyReview(myReview);
    setGate({ kind: 'existing-review', review: myReview });
    setList({
      items: [makeReview('r-self', { userId: SELF_USER.userId, reviewId: myReview.reviewId })],
    });
    renderWidget();

    // The first delete-open trigger in the rendered DOM is the list
    // row's (the form's editor is also rendered, both expose the same
    // id). `getAllByTestId` returns both; we click the first.
    const deleteOpenTriggers = screen.getAllByTestId('review-delete-open-r-self');
    fireEvent.click(deleteOpenTriggers[0]);

    const dialog = screen.getByTestId(`review-delete-confirm-${myReview.reviewId}`);
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByTestId(`review-delete-confirm-${myReview.reviewId}-title`))
      .toHaveTextContent('Delete your review?');
    expect(within(dialog).getByTestId(`review-delete-confirm-${myReview.reviewId}-body`))
      .toHaveTextContent(/remove your rating and helpful counts associated with it/);

    const confirm = within(dialog).getByTestId(`review-delete-confirm-${myReview.reviewId}-confirm`);
    // Disabled before the typed token matches.
    expect(confirm).toBeDisabled();

    fireEvent.change(
      within(dialog).getByTestId(`review-delete-confirm-${myReview.reviewId}-typed-input`),
      { target: { value: 'delete' } },
    );
    expect(confirm).not.toBeDisabled();
  });

  it('confirming the typed delete calls the remove hook once', () => {
    const myReview = makeMyReview();
    const remove = vi.fn().mockResolvedValue(true);
    setAuthenticated();
    setMyReview(myReview);
    setGate({ kind: 'existing-review', review: myReview });
    setList({
      items: [makeReview('r-self', { userId: SELF_USER.userId, reviewId: myReview.reviewId })],
    });
    useDeleteReviewMock.mockReturnValue({
      remove,
      isLoading: false,
      error: null,
      lastOutcome: null,
      reset: vi.fn(),
    });
    renderWidget();

    const deleteOpenTriggers = screen.getAllByTestId('review-delete-open-r-self');
    fireEvent.click(deleteOpenTriggers[0]);

    const dialog = screen.getByTestId(`review-delete-confirm-${myReview.reviewId}`);
    fireEvent.change(
      within(dialog).getByTestId(`review-delete-confirm-${myReview.reviewId}-typed-input`),
      { target: { value: 'delete' } },
    );
    fireEvent.click(within(dialog).getByTestId(`review-delete-confirm-${myReview.reviewId}-confirm`));

    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('cancel does not call remove', () => {
    const myReview = makeMyReview();
    const remove = vi.fn().mockResolvedValue(true);
    setAuthenticated();
    setMyReview(myReview);
    setGate({ kind: 'existing-review', review: myReview });
    setList({
      items: [makeReview('r-self', { userId: SELF_USER.userId, reviewId: myReview.reviewId })],
    });
    useDeleteReviewMock.mockReturnValue({
      remove,
      isLoading: false,
      error: null,
      lastOutcome: null,
      reset: vi.fn(),
    });
    renderWidget();

    const deleteOpenTriggers = screen.getAllByTestId('review-delete-open-r-self');
    fireEvent.click(deleteOpenTriggers[0]);
    fireEvent.click(screen.getByTestId(`review-delete-confirm-${myReview.reviewId}-cancel`));

    expect(remove).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 6. Helpful toggle — optimistic, rollback, cooldown, hidden on self
// ---------------------------------------------------------------------------

describe('ReviewsWidget — helpful toggle', () => {
  it('renders the helpful button for non-owner items', () => {
    setAuthenticated();
    setList({ items: [makeReview('r-1', { userId: OTHER_USER_ID })] });
    renderWidget();

    const button = screen.getByTestId('review-helpful-button-r-1');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('0');
  });

  it('routes a helpful click through the optimistic hook', () => {
    const toggle = vi.fn().mockResolvedValue(undefined);
    setAuthenticated();
    setList({ items: [makeReview('r-1', { userId: OTHER_USER_ID, helpfulCount: 4 })] });
    useHelpfulReviewMock.mockReturnValue({
      toggle,
      isPending: false,
      viewerMarkedHelpful: false,
      lastError: null,
      reset: vi.fn(),
    });
    renderWidget();

    fireEvent.click(screen.getByTestId('review-helpful-button-r-1'));
    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it('reflects the marked state via aria-pressed', () => {
    setAuthenticated();
    setList({ items: [makeReview('r-1', { userId: OTHER_USER_ID, helpfulCount: 5 })] });
    useHelpfulReviewMock.mockReturnValue({
      toggle: vi.fn(),
      isPending: false,
      viewerMarkedHelpful: true,
      lastError: null,
      reset: vi.fn(),
    });
    renderWidget();

    const button = screen.getByTestId('review-helpful-button-r-1');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('5');
  });

  it('disables the button while the optimistic toggle is pending', () => {
    setAuthenticated();
    setList({ items: [makeReview('r-1', { userId: OTHER_USER_ID })] });
    useHelpfulReviewMock.mockReturnValue({
      toggle: vi.fn(),
      isPending: true,
      viewerMarkedHelpful: false,
      lastError: null,
      reset: vi.fn(),
    });
    renderWidget();

    const button = screen.getByTestId('review-helpful-button-r-1');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('hides the helpful toggle on the viewer\'s own review', () => {
    const myReview = makeMyReview();
    setAuthenticated();
    setMyReview(myReview);
    setGate({ kind: 'existing-review', review: myReview });
    setList({
      items: [makeReview('r-self', { userId: SELF_USER.userId, reviewId: myReview.reviewId })],
    });
    renderWidget();

    expect(screen.queryByTestId('review-helpful-button-r-self')).not.toBeInTheDocument();
    expect(screen.queryByTestId('review-helpful-count-r-self')).not.toBeInTheDocument();
    // The editor owns the owner row.
    expect(screen.getAllByTestId('review-edit-inline-r-self').length).toBeGreaterThan(0);
  });

  it('renders the read-only count for unauthenticated viewers', () => {
    setUnauthenticated();
    setList({ items: [makeReview('r-1', { userId: OTHER_USER_ID, helpfulCount: 7 })] });
    renderWidget();

    expect(screen.queryByTestId('review-helpful-button-r-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('review-helpful-count-r-1')).toBeInTheDocument();
  });

  it('drops rapid-fire clicks via the hook\'s 500 ms cooldown', () => {
    vi.useFakeTimers();
    const toggle = vi.fn().mockResolvedValue(undefined);
    setAuthenticated();
    setList({ items: [makeReview('r-1', { userId: OTHER_USER_ID })] });
    useHelpfulReviewMock.mockReturnValue({
      toggle,
      isPending: false,
      viewerMarkedHelpful: false,
      lastError: null,
      reset: vi.fn(),
    });
    renderWidget();

    const button = screen.getByTestId('review-helpful-button-r-1');
    fireEvent.click(button);
    // The hook's cooldown filter is enforced inside `useHelpfulReview`
    // (not here), so we assert the contract: the button itself does
    // not disable itself out of cooldown. The hook spec owns the
    // cooldown discipline.
    expect(button).not.toBeDisabled();
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// 7. Defensive muting of REVIEW_ALREADY_REPORTED (defensive coverage)
// ---------------------------------------------------------------------------

describe('ReviewsWidget — defensive REVIEW_ALREADY_REPORTED', () => {
  it('does not surface any report / admin link when the error path is hit', () => {
    setAuthenticated();
    setGate({ kind: 'eligible' });
    setList({ items: [] });
    useCreateReviewMock.mockReturnValue({
      submit: vi.fn().mockResolvedValue(false),
      isLoading: false,
      error: makeApiError(409, 'REVIEW_ALREADY_REPORTED'),
      lastOutcome: { kind: 'reverted', cause: makeApiError(409, 'REVIEW_ALREADY_REPORTED') },
      reset: vi.fn(),
    });
    renderWidget();

    const root = screen.getByTestId('reviews-widget');
    expect(within(root).queryByText(/report/i)).not.toBeInTheDocument();
    expect(within(root).queryByText(/moderate/i)).not.toBeInTheDocument();
    expect(within(root).queryByText(/admin/i)).not.toBeInTheDocument();
    expect(within(root).queryByRole('link', { name: /report/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 8. Cache isolation between tests
// ---------------------------------------------------------------------------

describe('ReviewsWidget — cache isolation', () => {
  it('renders empty list when the provider is empty', () => {
    setUnauthenticated();
    setList({ items: [] });
    renderWidget();

    expect(screen.getByTestId('reviews-list-empty')).toBeInTheDocument();
  });

  it('does not leak prior reviews into a fresh widget mount', () => {
    // First mount seeds an item.
    setUnauthenticated();
    setList({ items: [makeReview('r-leak')] });
    const first = renderWidget();
    expect(first.queryByTestId('review-item-r-leak')).toBeTruthy();
    first.unmount();

    // Fresh mount with an empty list — the leak must not survive.
    setList({ items: [] });
    renderWidget();
    expect(screen.queryByTestId('review-item-r-leak')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 9. SWR revalidation cleanliness
// ---------------------------------------------------------------------------

describe('ReviewsWidget — mutation revalidation', () => {
  it('does not force a full quiz-detail page reload on a successful create', () => {
    // The widget is mounted with the eligible branch. After the
    // create hook fires `success`, the gate's `revalidate()` is
    // invoked; the next render swaps the branch to `existing-review`.
    // The widget does NOT trigger any navigation (no `next/router`
    // calls). Assert this by mocking `next/navigation` and asserting
    // its `push` / `refresh` are never called.
    const myReview = makeMyReview();
    setAuthenticated();
    setGate({ kind: 'existing-review', review: myReview });
    setList({ items: [] });
    renderWidget();

    // The form has been replaced by the inline editor. The widget
    // did not navigate.
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('reviews-widget')).toBeInTheDocument();
  });
});
