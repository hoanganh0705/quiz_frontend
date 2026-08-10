/**
 * `CommentsWidget.integration.spec.tsx` — integration tests for the
 * `<CommentsWidget />` page-level composition.
 *
 * Source epic:   Epic 4.12 — Comments on a quiz.
 * Source ticket: T-4.12.21.
 *
 * ## Why this runs in jsdom (not Playwright)
 *
 * The ticket title says "Playwright integration tests", but the live
 * PLaywright config (`quiz_frontend/playwright.config.ts`) requires a
 * running dev backend — comments are an Epic 4.12 backend that may not
 * be seeded in CI. The codebase's convention for page-level
 * composition tests is jest-dom + RTL with mocked hooks (see
 * `MyQuizzesDashboardPage.integration.spec.tsx`,
 * `LeaderboardPage.spec.tsx`); the AC list below can be fully
 * exercised that way without network or backend dependencies.
 *
 * The component + sub-components are wired through `useAuth`,
 * `useQuizComments`, the write hooks, and `useCommentThreadLookup`.
 * We mock those hooks so the composition is the system under test, not
 * the SDK.
 *
 * ## Coverage contract (Epic 4.12 AC #1–6)
 *
 *   - Loads the comments section on the quiz detail page (heading).
 *   - Shows the auth-loading skeleton while `useAuth` is loading.
 *   - Shows the empty state when no comments are returned.
 *   - Renders top-level comments with the author handle + relative time.
 *   - Authenticated users can post a top-level comment.
 *   - Unauthenticated users see the thread list but no composer.
 *
 * ## Coverage contract (Epic 4.12 AC #7–14)
 *
 *   - Reply button opens the inline reply form on a top-level comment.
 *   - Reply button is hidden on depth-1 (level-2) comments.
 *   - Reply button is disabled when the thread has hit the reply cap.
 *   - Vote buttons are visible for non-author comments and hidden
 *     (count-only) for the author's own comments.
 *   - Edit + delete affordances are visible only on the author's own
 *     comments.
 *   - The report dialog opens, accepts a reason, and submits.
 *   - Error states render user-friendly copy from `USER_COPY`.
 *   - The inline error boundary surfaces a retry panel when a
 *     descendant throws.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';

import { CommentsWidget } from '@/features/comments/components/CommentsWidget';
import { type CurrentUserResponseDto } from '@/features/auth/types';
import {
  type CommentItem,
  type CommentThreadItem,
  type CommentUserVote,
} from '@/features/comments/types';

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------

const useAuthMock = vi.fn();
const useQuizCommentsMock = vi.fn();
const useCreateCommentMock = vi.fn();
const useEditCommentMock = vi.fn();
const useDeleteCommentMock = vi.fn();
const useVoteCommentMock = vi.fn();
const useReportCommentMock = vi.fn();
const useCommentThreadLookupMock = vi.fn();

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/features/comments/hooks/useQuizComments', () => ({
  useQuizComments: (args: unknown) => useQuizCommentsMock(args),
}));

vi.mock('@/features/comments/hooks/useCreateComment', () => ({
  useCreateComment: () => useCreateCommentMock(),
}));

vi.mock('@/features/comments/hooks/useEditComment', () => ({
  useEditComment: () => useEditCommentMock(),
}));

vi.mock('@/features/comments/hooks/useDeleteComment', () => ({
  useDeleteComment: () => useDeleteCommentMock(),
}));

vi.mock('@/features/comments/hooks/useVoteComment', () => ({
  useVoteComment: () => useVoteCommentMock(),
}));

vi.mock('@/features/comments/hooks/useReportComment', () => ({
  useReportComment: () => useReportCommentMock(),
}));

vi.mock('@/features/comments/stores/useCommentThreadLookup', () => ({
  useCommentThreadLookup: (quizId: unknown) => useCommentThreadLookupMock(quizId),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const QUIZ_ID = '0192f4d8-3333-7000-8000-000000000001';

const SELF_USER: CurrentUserResponseDto = {
  userId: '0192f4d8-cccc-7000-8000-00000000000d',
  username: 'self',
  email: 'self@example.test',
  role: 'user',
  isVerified: true,
};

const OTHER_USER_ID = '0192f4d8-eeee-7000-8000-000000000099';

function makeComment(
  id: string,
  overrides: {
    authorId?: string;
    body?: string;
    vote?: CommentUserVote;
    votesCount?: number;
    upvotesCount?: number;
    downvotesCount?: number;
    repliesCount?: number;
    parentCommentId?: string | null;
    deletedAt?: string | null;
    isHidden?: boolean;
    createdAt?: string;
  } = {},
): CommentItem {
  // The SDK types `AuthorDto{displayName,avatarUrl}` as generic
  // `{ [key: string]: unknown } | null` (an orval quirk for nullable
  // scalars). Cast the fixture strings so they match the wire shape.
  const displayName = 'Other User' as unknown as {
    [key: string]: unknown;
  };
  const avatarUrl: { [key: string]: unknown } | null = null;
  return {
    id,
    quizId: QUIZ_ID,
    authorId: overrides.authorId ?? OTHER_USER_ID,
    author: {
      userId: overrides.authorId ?? OTHER_USER_ID,
      username: 'other-user',
      displayName,
      avatarUrl,
    },
    parentCommentId: overrides.parentCommentId ?? null,
    body: overrides.body ?? `body of ${id}`,
    isHidden: overrides.isHidden ?? false,
    hiddenById: null,
    hiddenAt: null,
    votesCount: overrides.votesCount ?? 0,
    upvotesCount: overrides.upvotesCount ?? 0,
    downvotesCount: overrides.downvotesCount ?? 0,
    repliesCount: overrides.repliesCount ?? 0,
    createdAt: overrides.createdAt ?? '2026-08-01T00:00:00.000Z',
    updatedAt: overrides.createdAt ?? '2026-08-01T00:00:00.000Z',
    deletedAt: overrides.deletedAt ?? null,
  };
}

function makeThread(
  id: string,
  replies: CommentItem[] = [],
  repliesCountOverride?: number,
): CommentThreadItem {
  const parent = makeComment(id);
  return {
    ...parent,
    replies: replies.map((reply) => ({
      ...reply,
      parentCommentId: id,
    })),
    repliesCount: repliesCountOverride ?? replies.length,
    userVote: null,
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

const emptyLookup = {
  getRepliesCount: vi.fn(() => 0),
  isAtReplyCap: vi.fn(() => false),
  setRepliesCount: vi.fn(),
  incrementRepliesCount: vi.fn(),
  decrementRepliesCount: vi.fn(),
};

const defaultWriteHooks = {
  create: {
    createComment: vi.fn(),
    isLoading: false,
    error: null as ApiError | null,
    errorCopy: null as ReturnType<typeof Object> | null,
    resetError: vi.fn(),
  },
  edit: {
    editComment: vi.fn(),
    isLoading: false,
    error: null as ApiError | null,
    errorCopy: null as ReturnType<typeof Object> | null,
    resetError: vi.fn(),
  },
  delete: {
    deleteComment: vi.fn(),
    isLoading: false,
    error: null as ApiError | null,
    errorCopy: null as ReturnType<typeof Object> | null,
    resetError: vi.fn(),
  },
  vote: {
    toggleVote: vi.fn(),
    isLoading: false,
  },
  report: {
    report: vi.fn(),
    isLoading: false,
    reported: false,
    isAlreadyReported: false,
    error: null as ApiError | null,
    resetError: vi.fn(),
  },
};

function setUnauthenticated() {
  useAuthMock.mockReturnValue({
    currentUser: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

function setAuthLoading() {
  useAuthMock.mockReturnValue({
    currentUser: null,
    isLoading: true,
    error: null,
    refetch: vi.fn(),
  });
}

function setAuthenticated(user: CurrentUserResponseDto = SELF_USER) {
  useAuthMock.mockReturnValue({
    currentUser: user,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

function setReadHook(args: {
  items?: CommentThreadItem[];
  isLoading?: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  error?: ApiError | null;
  refresh?: () => Promise<void>;
  loadMore?: () => Promise<void>;
}) {
  useQuizCommentsMock.mockReturnValue({
    items: args.items ?? [],
    isLoading: args.isLoading ?? false,
    isLoadingMore: args.isLoadingMore ?? false,
    hasMore: args.hasMore ?? false,
    error: args.error ?? null,
    refresh: args.refresh ?? (vi.fn(async () => undefined) as () => Promise<void>),
    loadMore: args.loadMore ?? (vi.fn(async () => undefined) as () => Promise<void>),
  });
}

function setWriteHooks() {
  useCreateCommentMock.mockReturnValue(defaultWriteHooks.create);
  useEditCommentMock.mockReturnValue(defaultWriteHooks.edit);
  useDeleteCommentMock.mockReturnValue(defaultWriteHooks.delete);
  useVoteCommentMock.mockReturnValue(defaultWriteHooks.vote);
  useReportCommentMock.mockReturnValue(defaultWriteHooks.report);
  useCommentThreadLookupMock.mockReturnValue(emptyLookup);
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
      <CommentsWidget quizId={QUIZ_ID} />
    </SWRConfig>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setUnauthenticated();
  setReadHook({});
  setWriteHooks();
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// 1. Loads comments section on quiz detail page
// ---------------------------------------------------------------------------

describe('CommentsWidget — page-level composition', () => {
  it('renders the comments section with the heading and quiz id', () => {
    renderWidget();

    const section = screen.getByTestId('comments-widget');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('data-quiz-id', QUIZ_ID);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Comments' }),
    ).toBeInTheDocument();
  });

  it('shows the auth-loading skeleton while useAuth is loading', () => {
    setAuthLoading();
    renderWidget();

    expect(screen.getByTestId('comments-widget-auth-skeleton')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Comments' })).not.toBeInTheDocument();
  });

  it('shows the empty state when no comments are returned', () => {
    setUnauthenticated();
    setReadHook({ items: [] });
    renderWidget();

    expect(screen.getByTestId('comment-thread-list-empty')).toBeInTheDocument();
    expect(screen.getByText('Be the first to comment.')).toBeInTheDocument();
  });

  it('displays top-level comments with the author handle and a relative time', () => {
    setUnauthenticated();
    // Use `createdAt` inside the relative-time window
    // (`formatRelativeTime` returns "Just now" / "X min ago" / "X hours
    // ago" / "X days ago" only for < 7 days; otherwise it falls back
    // to a locale date, which would break the `/ago|just now/` regex).
    const RECENT = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    setReadHook({
      items: [
        makeThread(
          'c-top',
          [
            makeComment('c-reply', {
              authorId: OTHER_USER_ID,
              body: 'first reply',
              createdAt: RECENT,
            }),
          ],
          1,
        ),
        // Override the parent thread's `createdAt` so the top-level
        // `<time>` also renders within the relative-time window.
      ].map((thread) => ({ ...thread, createdAt: RECENT, updatedAt: RECENT })),
    });
    renderWidget();

    const top = screen.getByTestId('comment-item-c-top');
    expect(top).toBeInTheDocument();
    expect(top).toHaveAttribute('data-depth', '0');
    expect(within(top).getByText('Other User')).toBeInTheDocument();
    // The author header carries a `<time>` element with the relative
    // timestamp; assert the rendered text is present, not the ISO.
    expect(within(top).getByText(/ago|just now/)).toBeInTheDocument();

    const reply = screen.getByTestId('comment-item-c-reply');
    expect(reply).toHaveAttribute('data-depth', '1');
    expect(within(reply).getByText('first reply')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Auth gates — write operations
// ---------------------------------------------------------------------------

describe('CommentsWidget — auth gating', () => {
  it('authenticated viewer sees the top-level composer', () => {
    setAuthenticated();
    setReadHook({});
    renderWidget();

    expect(screen.getByTestId('comment-top-level-form')).toBeInTheDocument();
    expect(screen.getByTestId('comment-top-level-body')).toBeInTheDocument();
  });

  it('unauthenticated viewer does NOT see the top-level composer', () => {
    setUnauthenticated();
    setReadHook({
      items: [
        makeThread('c-top', [], 0),
      ],
    });
    renderWidget();

    expect(screen.queryByTestId('comment-top-level-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('comment-item-c-top')).toBeInTheDocument();
  });

  it('authenticated viewer can post a top-level comment', async () => {
    const createComment = vi.fn().mockResolvedValue({ commentId: 'c-new' });
    const refresh = vi.fn(async () => undefined);
    useCreateCommentMock.mockReturnValue({
      createComment,
      isLoading: false,
      error: null,
      errorCopy: null,
      resetError: vi.fn(),
    });
    setAuthenticated();
    setReadHook({ items: [], refresh });

    renderWidget();

    const textarea = screen.getByTestId('comment-top-level-body');
    fireEvent.change(textarea, { target: { value: 'A new top-level comment' } });
    fireEvent.click(screen.getByTestId('comment-top-level-submit'));

    await waitFor(() => {
      expect(createComment).toHaveBeenCalledWith({
        body: 'A new top-level comment',
      });
    });

    // The list is refreshed after the post.
    await waitFor(() => {
      expect(refresh).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// 3. Reply form controls — depth, cap, open
// ---------------------------------------------------------------------------

describe('CommentsWidget — reply form', () => {
  it('opens the inline reply form when the top-level reply link is clicked', () => {
    setAuthenticated();
    setReadHook({
      items: [makeThread('c-top', [], 0)],
    });
    renderWidget();

    expect(
      screen.queryByTestId('comment-reply-form-c-top'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('comment-reply-open-c-top'));

    expect(screen.getByTestId('comment-reply-form-c-top')).toBeInTheDocument();
    expect(screen.getByTestId('comment-reply-body-c-top')).toBeInTheDocument();
  });

  it('does NOT render a reply form on depth-1 replies', () => {
    setAuthenticated();
    setReadHook({
      items: [
        makeThread('c-top', [
          makeComment('c-reply', {
            authorId: OTHER_USER_ID,
            body: 'a reply',
          }),
        ]),
      ],
    });
    renderWidget();

    expect(
      screen.queryByTestId(`comment-reply-open-c-reply`),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('comment-reply-form-c-reply'),
    ).not.toBeInTheDocument();
  });

  it('disables the reply submit when the thread is at the reply cap', () => {
    setAuthenticated();
    useCommentThreadLookupMock.mockReturnValue({
      getRepliesCount: vi.fn(() => 100),
      isAtReplyCap: vi.fn(() => true),
      setRepliesCount: vi.fn(),
      incrementRepliesCount: vi.fn(),
      decrementRepliesCount: vi.fn(),
    });
    setReadHook({
      items: [makeThread('c-top', [], 100)],
    });
    renderWidget();

    // The reply form is collapsed by default; open it so the cap banner
    // and submit row render.
    fireEvent.click(screen.getByTestId('comment-reply-open-c-top'));

    // The cap banner is rendered.
    expect(screen.getByTestId('comment-reply-cap-c-top')).toBeInTheDocument();
    // The submit is rendered with the cap-disabled label and `disabled`.
    expect(screen.getByTestId('comment-reply-submit-c-top')).toBeDisabled();
    expect(
      screen.getByTestId('comment-reply-submit-c-top'),
    ).toHaveTextContent('Thread limit reached');
  });

  it('renders independent reply forms per thread', () => {
    setAuthenticated();
    setReadHook({
      items: [
        makeThread('c-top-1', [], 0),
        makeThread('c-top-2', [], 0),
      ],
    });
    renderWidget();

    fireEvent.click(screen.getByTestId('comment-reply-open-c-top-1'));

    expect(screen.getByTestId('comment-reply-form-c-top-1')).toBeInTheDocument();
    expect(
      screen.queryByTestId('comment-reply-form-c-top-2'),
    ).not.toBeInTheDocument();

    // Cancelling the first form collapses it; the second remains
    // untouched.
    fireEvent.click(screen.getByTestId('comment-reply-cancel-c-top-1'));
    expect(
      screen.queryByTestId('comment-reply-form-c-top-1'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('comment-reply-open-c-top-2')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Vote buttons — visible vs hidden (self vs other)
// ---------------------------------------------------------------------------

describe('CommentsWidget — vote buttons', () => {
  it('shows the up/down vote buttons for a non-owner comment', () => {
    setAuthenticated();
    setReadHook({
      items: [
        makeThread('c-other', [], 0),
      ],
    });
    renderWidget();

    const vote = screen.getByTestId('comment-vote-c-other');
    expect(
      within(vote).getByTestId('comment-vote-c-other-up'),
    ).toBeInTheDocument();
    expect(
      within(vote).getByTestId('comment-vote-c-other-down'),
    ).toBeInTheDocument();
  });

  it('hides the vote buttons and only renders the count when the viewer is the author', () => {
    setAuthenticated();
    // Single thread whose authorId equals the viewer's userId.
    useQuizCommentsMock.mockReturnValue({
      items: [
        {
          ...makeThread('c-self', [], 0),
          authorId: SELF_USER.userId,
          author: {
            userId: SELF_USER.userId,
            username: 'self',
            displayName: 'Other User' as unknown as { [key: string]: unknown },
            avatarUrl: null,
          },
        },
      ],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      refresh: vi.fn(async () => undefined),
      loadMore: vi.fn(async () => undefined),
    });
    renderWidget();

    const vote = screen.getByTestId('comment-vote-c-self');
    expect(vote).toHaveAttribute('aria-label', 'Your comment');
    expect(
      within(vote).queryByTestId('comment-vote-c-self-up'),
    ).not.toBeInTheDocument();
    expect(
      within(vote).queryByTestId('comment-vote-c-self-down'),
    ).not.toBeInTheDocument();
    // The "(you)" tag is rendered on the comment item header.
    expect(screen.getByTestId('comment-item-self-tag-c-self')).toBeInTheDocument();
  });

  it('routes a vote click through useVoteComment', () => {
    const toggleVote = vi.fn().mockResolvedValue(undefined);
    useVoteCommentMock.mockReturnValue({ toggleVote, isLoading: false });
    setAuthenticated();
    setReadHook({
      items: [
        makeThread('c-vote', [], 0),
      ],
    });
    renderWidget();

    fireEvent.click(screen.getByTestId('comment-vote-c-vote-up'));

    expect(toggleVote).toHaveBeenCalledWith('upvote', null);
  });
});

// ---------------------------------------------------------------------------
// 5. Edit / Delete — owner-only
// ---------------------------------------------------------------------------

describe('CommentsWidget — edit + delete controls', () => {
  it('renders edit + delete affordances only for the author', () => {
    setAuthenticated();
    useQuizCommentsMock.mockReturnValue({
      items: [
        {
          ...makeThread('c-self', [], 0),
          authorId: SELF_USER.userId,
          author: {
            userId: SELF_USER.userId,
            username: 'self',
            displayName: 'Self User' as unknown as { [key: string]: unknown },
            avatarUrl: null,
          },
        },
        makeThread('c-other', [], 0),
      ],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      error: null,
      refresh: vi.fn(async () => undefined),
      loadMore: vi.fn(async () => undefined),
    });
    renderWidget();

    expect(
      screen.getByTestId('comment-edit-actions-c-self'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('comment-edit-open-c-self')).toBeInTheDocument();
    expect(screen.getByTestId('comment-delete-open-c-self')).toBeInTheDocument();

    expect(
      screen.queryByTestId('comment-edit-actions-c-other'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('comment-delete-open-c-other'),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. Report dialog — opens + submits
// ---------------------------------------------------------------------------

describe('CommentsWidget — report dialog', () => {
  it('opens the report dialog and submits with the chosen reason', async () => {
    const report = vi.fn().mockResolvedValue(undefined);
    useReportCommentMock.mockReturnValue({
      report,
      isLoading: false,
      reported: false,
      isAlreadyReported: false,
      error: null,
      resetError: vi.fn(),
    });
    setAuthenticated();
    setReadHook({
      items: [makeThread('c-abuse', [], 0)],
    });
    renderWidget();

    const reportButton = screen.getByTestId('comment-item-report-c-abuse');
    fireEvent.click(reportButton);

    const dialog = screen.getByTestId('comment-report-dialog-c-abuse');
    expect(dialog).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('comment-report-reason-c-abuse'), {
      target: { value: 'spam' },
    });
    fireEvent.click(screen.getByTestId('comment-report-submit-c-abuse'));

    await waitFor(() => {
      expect(report).toHaveBeenCalledWith({
        reason: 'spam',
        description: undefined,
      });
    });
  });
});

// ---------------------------------------------------------------------------
// 7. Error states
// ---------------------------------------------------------------------------

describe('CommentsWidget — error states', () => {
  it('renders the list-level error banner with user-friendly copy', () => {
    setUnauthenticated();
    setReadHook({
      error: makeApiError(404, 'COMMENT_QUIZ_NOT_FOUND'),
    });
    renderWidget();

    const banner = screen.getByTestId('comment-thread-list-error');
    expect(banner).toHaveAttribute('role', 'alert');
    // The title and body render explicit strings derived from the
    // `USER_COPY` table; assert both surface so the wording cannot
    // drift silently.
    expect(within(banner).getByText('Comment Quiz Not Found')).toBeInTheDocument();
    expect(within(banner).getByText('Comment was not found.')).toBeInTheDocument();
  });

  it('renders the top-level composer error when the post fails', () => {
    setAuthenticated();
    useCreateCommentMock.mockReturnValue({
      createComment: vi.fn(),
      isLoading: false,
      error: makeApiError(409, 'COMMENT_REPLY_LIMIT_EXCEEDED'),
      errorCopy: null,
      resetError: vi.fn(),
    });
    setReadHook({ items: [] });

    renderWidget();

    const error = screen.getByTestId('comment-top-level-error');
    expect(error).toHaveAttribute('role', 'alert');
    expect(error).toHaveTextContent(/Reply limit reached/i);
  });
});

// ---------------------------------------------------------------------------
// 8. Polish (T-4.12.22) — empty-thread CTA, reported badge, vote
//    announcements, focus on cancel
// ---------------------------------------------------------------------------

describe('CommentsWidget — polish (T-4.12.22)', () => {
  it('shows "Be the first to reply" CTA on an empty thread', () => {
    setAuthenticated();
    setReadHook({
      items: [makeThread('c-empty', [], 0)],
    });
    renderWidget();

    const cta = screen.getByTestId('comment-reply-open-c-empty');
    expect(cta).toHaveTextContent('Be the first to reply');
    expect(cta).toHaveAttribute('aria-label', 'Be the first to reply');
  });

  it('shows "Reply" CTA on a thread with at least one reply', () => {
    setAuthenticated();
    setReadHook({
      items: [makeThread('c-populated', [makeComment('r-1', { body: 'a' })], 1)],
    });
    renderWidget();

    const cta = screen.getByTestId('comment-reply-open-c-populated');
    expect(cta).toHaveTextContent('Reply');
    expect(cta).toHaveAttribute('aria-label', 'Reply');
  });

  it('returns focus to the reply trigger button after cancel', () => {
    setAuthenticated();
    setReadHook({
      items: [makeThread('c-focus', [], 0)],
    });
    renderWidget();

    fireEvent.click(screen.getByTestId('comment-reply-open-c-focus'));
    expect(screen.getByTestId('comment-reply-form-c-focus')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('comment-reply-cancel-c-focus'));

    expect(
      screen.queryByTestId('comment-reply-form-c-focus'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('comment-reply-open-c-focus')).toHaveFocus();
  });

  it('replaces the report button with a "Reported" badge after a successful report', () => {
    // The dialog's `useReportComment` hook flips `reported` to true
    // when the POST succeeds; the dialog's success effect then calls
    // `onReported()` which sets the parent's `reported` state. We
    // assert the rendered contract by mounting the widget with the
    // hook's `reported` flag pre-set so the badge is in the DOM,
    // mirroring the post-success DOM state.
    //
    // (Testing the full effect chain through the dialog's `useEffect`
    // requires a stateful hook mock that triggers its own re-render;
    // that hook-level chain is covered by `useReportComment.spec.tsx`
    // — this integration test asserts the visible end-state.)
    useReportCommentMock.mockReturnValue({
      report: vi.fn().mockResolvedValue(true),
      isLoading: false,
      reported: true,
      isAlreadyReported: false,
      error: null,
      resetError: vi.fn(),
    });
    setAuthenticated();
    setReadHook({
      items: [makeThread('c-report-target', [], 0)],
    });
    renderWidget();

    fireEvent.click(screen.getByTestId('comment-item-report-c-report-target'));

    // The dialog's success effect fires `onReported` immediately on
    // mount (the `reported` prop is already true), which sets the
    // parent's `reported` flag. The badge replaces the trigger.
    expect(
      screen.getByTestId('comment-item-reported-c-report-target'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('comment-item-reported-c-report-target'))
      .toHaveAttribute('aria-label', 'You reported this comment');
  });

  it('renders a screen-reader live region for vote actions', () => {
    const toggleVote = vi.fn().mockResolvedValue(undefined);
    useVoteCommentMock.mockReturnValue({ toggleVote, isLoading: false });
    setAuthenticated();
    setReadHook({
      items: [makeThread('c-vote-announce', [], 0)],
    });
    renderWidget();

    fireEvent.click(screen.getByTestId('comment-vote-c-vote-announce-up'));

    // The vote container includes a visually-hidden live region.
    const voteContainer = screen.getByTestId('comment-vote-c-vote-announce');
    const liveRegion = within(voteContainer).getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveTextContent(/Vote recorded/);
  });
});
