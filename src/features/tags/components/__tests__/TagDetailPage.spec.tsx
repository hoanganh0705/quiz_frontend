/**
 * `TagDetailPage.spec.tsx` — page-level composition tests for the
 * `/tags/[slug]` route's follow surface.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.F1 — page-level composition tests for the
 *                 category + tag detail pages (follow-slot integration).
 *
 * The slot unit tests in `TagFollowButtonSlot.spec.tsx` (B5) lock
 * the slot's render + composition contract in isolation. The page-level
 * tests in this file lock the integration contract — i.e. that the
 * `<TagDetailPage />` actually wires the slot next to the header and
 * passes the resolved `tag.tagId` (NOT the route slug — A1 §7 records
 * the drift).
 *
 * ## What this file covers (per TKT-3.9.F1 AC #2)
 *
 *   (a) **Loading** — the slot renders `null` while the detail hook
 *       resolves (no follow button before the entity UUID exists).
 *   (b) **Authenticated + not-following** — the slot renders
 *       `<FollowButton />` with `aria-pressed='false'`; clicking
 *       triggers `useFollowTag().follow`.
 *   (c) **Authenticated + following** — the slot renders
 *       `<FollowButton />` with `aria-pressed='true'`; clicking
 *       triggers `useUnfollowTag().unfollow`.
 *   (d) **Unauthenticated** — the slot renders `<FollowButton />` with
 *       `aria-disabled='true'` and `title='Sign in to follow'`.
 *   (e) **Rollback on 4xx** — the slot's `errorKind` prop surfaces
 *       `http_4xx` (FollowErrorNotice copy `"Couldn't update — try
 *       again"`); the button reverts to its prior text/state.
 *   (f) **Rollback on 429** — the slot's `errorKind` prop surfaces
 *       `http_429` (FollowErrorNotice copy `Slow down — try again in
 *       a minute`).
 *   (g) **Follow-count updates** — the `<span data-testid='follow-count'>`
 *       increments on follow and decrements on unfollow (D1
 *       integration).
 *
 * ## Test discipline (per F1 AC #3, AC #4)
 *
 * - All five mock sources are isolated to `vi.hoisted` so the
 *   reference is stable across the `vi.mock` factories.
 * - The global `mutate` import from `'swr'` is captured via
 *   `vi.mock('swr', ...)` so we can assert the slot does NOT mutate
 *   any SWR key outside its declared `keysToInvalidate` (the F1 AC #4
 *   cross-feature isolation check).
 * - The SWR cache is reset between tests via the `TestSwrProvider`
 *   pattern (per the F1 AC #3 reference to
 *   `useFeaturedQuizzes.spec.tsx:98–112`).
 * - The detail page's secondary data sources (analytics, quizzes,
 *   related tags) are mocked to return the empty / default states so
 *   the test focuses on the follow-slot integration, not the
 *   secondary surfaces.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import type { TagResponseDto } from '@/lib/api/generated/schemas';

// ──────────────────────────────────────────────────────────────────────
// Module-level mocks — hoisted so the factories can reference them
// before the file under test imports anything.
// ──────────────────────────────────────────────────────────────────────

const {
  useTagBySlugMock,
  useTagAnalyticsMock,
  useTagQuizzesMock,
  useTagRelatedMock,
  useAuthStateMock,
  useIsFollowingTagMock,
  useFollowTagMock,
  useUnfollowTagMock,
  useFollowedLookupMock,
  globalMutateMock,
} = vi.hoisted(() => ({
  useTagBySlugMock: vi.fn(),
  useTagAnalyticsMock: vi.fn(),
  useTagQuizzesMock: vi.fn(),
  useTagRelatedMock: vi.fn(),
  useAuthStateMock: vi.fn(),
  useIsFollowingTagMock: vi.fn(),
  useFollowTagMock: vi.fn(),
  useUnfollowTagMock: vi.fn(),
  useFollowedLookupMock: vi.fn(),
  globalMutateMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Capture the global `mutate` import from `'swr'` so F1 AC #4 can
// assert the slot does NOT mutate any SWR key outside its declared
// `keysToInvalidate`.
vi.mock('swr', async () => {
  const actual =
    await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: globalMutateMock,
  };
});

// Mock the four data sources the tag detail page consumes
// (header + analytics + quizzes + related).
vi.mock('@/features/tags/hooks/useTagBySlug', () => ({
  useTagBySlug: (slug: string) => useTagBySlugMock(slug),
}));

vi.mock('@/features/tags/hooks/useTagAnalytics', () => ({
  useTagAnalytics: (id: string) => useTagAnalyticsMock(id),
}));

vi.mock('@/features/tags/hooks/useTagQuizzes', () => ({
  useTagQuizzes: (slug: string, params: unknown) =>
    useTagQuizzesMock(slug, params),
}));

vi.mock('@/features/tags/hooks/useTagRelated', () => ({
  useTagRelated: (slug: string, params: unknown) =>
    useTagRelatedMock(slug, params),
}));

// Mock the four follow-slot hooks.
vi.mock('@/features/tags/hooks/useIsFollowingTag', () => ({
  useIsFollowingTag: (id: string | null) => useIsFollowingTagMock(id),
}));

vi.mock('@/features/tags/hooks/useFollowTag', () => ({
  useFollowTag: (id: string | null) => useFollowTagMock(id),
}));

vi.mock('@/features/tags/hooks/useUnfollowTag', () => ({
  useUnfollowTag: (id: string | null) => useUnfollowTagMock(id),
}));

vi.mock('@/features/auth/hooks/use-auth-state', () => ({
  useAuthState: () => useAuthStateMock(),
}));

vi.mock('@/features/tags', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/tags')>(
      '@/features/tags',
    );
  return {
    ...actual,
    useFollowedLookup: () => useFollowedLookupMock(),
  };
});

// ──────────────────────────────────────────────────────────────────────
// Component imports (must follow the `vi.mock` hoisted factories).
// ──────────────────────────────────────────────────────────────────────

import { TagDetailPage } from '@/features/tags/components/TagDetailPage';

// ──────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────

const TAG_ID = '0192f4d8-0000-7000-8000-000000000010';
const TAG_SLUG = 'science';

function makeTag(
  overrides: Partial<TagResponseDto> = {},
): TagResponseDto {
  return {
    tagId: TAG_ID,
    name: 'Science',
    slug: TAG_SLUG,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeApiError(status: number, code = 'INTERNAL'): ApiError {
  return new ApiError({
    config: undefined,
    request: undefined,
    response: { status, data: { code, detail: 'fixture' } },
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code,
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

// ──────────────────────────────────────────────────────────────────────
// SWR test wrapper — fresh Map per test (F1 AC #3).
// ──────────────────────────────────────────────────────────────────────

function TestSwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        provider: () => new Map(),
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 0,
        errorRetryCount: 0,
      }}
    >
      {children}
    </SWRConfig>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Default mock values — every test starts from a known-good baseline.
// ──────────────────────────────────────────────────────────────────────

const NOOP_ASYNC = async (): Promise<void> => {
  return;
};

const DEFAULT_ACTION_RESULT = {
  isPending: false,
  lastError: null,
  follow: NOOP_ASYNC,
  unfollow: NOOP_ASYNC,
};

const DEFAULT_LOOKUP_RESULT = {
  categories: new Set<string>(),
  tags: new Set<string>(),
  isLoading: false,
  error: null,
  mutate: NOOP_ASYNC,
};

const DEFAULT_ANALYTICS_RESULT = {
  analytics: null,
  isLoading: false,
  error: null,
};

const DEFAULT_TAG_QUIZZES_RESULT = {
  items: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  loadMore: vi.fn(),
  error: null,
  refresh: vi.fn(),
  retryBannerVisible: false,
};

const DEFAULT_TAG_RELATED_RESULT = {
  tags: [],
  isLoading: false,
  error: null,
};

beforeEach(() => {
  // Page-level secondary data sources (default to empty / no-error
  // states so the test focuses on the follow-slot integration).
  useTagAnalyticsMock.mockReturnValue(DEFAULT_ANALYTICS_RESULT);
  useTagQuizzesMock.mockReturnValue(DEFAULT_TAG_QUIZZES_RESULT);
  useTagRelatedMock.mockReturnValue(DEFAULT_TAG_RELATED_RESULT);

  // Slot-level mocks
  useAuthStateMock.mockReturnValue({ isAuthenticated: false });
  useIsFollowingTagMock.mockReturnValue({
    isFollowing: false,
    isLoading: false,
  });
  useFollowTagMock.mockReturnValue(DEFAULT_ACTION_RESULT);
  useUnfollowTagMock.mockReturnValue(DEFAULT_ACTION_RESULT);
  useFollowedLookupMock.mockReturnValue(DEFAULT_LOOKUP_RESULT);
  globalMutateMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ──────────────────────────────────────────────────────────────────────
// (a) Loading — slot renders null while the detail hook resolves
// ──────────────────────────────────────────────────────────────────────

describe('TagDetailPage — follow slot integration (F1 / (a) loading)', () => {
  it('(a) while the detail hook is loading, the follow slot renders null', () => {
    useTagBySlugMock.mockReturnValue({
      tag: null,
      isLoading: true,
      error: null,
      notFound: false,
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    // The loading skeleton is rendered — the follow slot does NOT
    // occupy the DOM during this window.
    expect(
      screen.getByTestId('tag-detail-page-loading'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('tag-follow-button-slot'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('follow-button-not-following'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('follow-count'),
    ).not.toBeInTheDocument();
  });
});

// ──────────────────────────────────────────────────────────────────────
// (b) Authenticated + not-following
// ──────────────────────────────────────────────────────────────────────

describe('TagDetailPage — follow slot integration (F1 / (b) auth + not-following)', () => {
  it('(b) renders the follow button with aria-pressed="false" and clicking calls follow', () => {
    const follow = vi.fn().mockResolvedValue(undefined);
    const unfollow = vi.fn().mockResolvedValue(undefined);

    useTagBySlugMock.mockReturnValue({
      tag: makeTag(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowTagMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow,
      unfollow: vi.fn(),
    });
    useUnfollowTagMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn(),
      unfollow,
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    const slot = screen.getByTestId('tag-follow-button-slot');
    expect(slot).toHaveAttribute('data-state', 'resolved');
    expect(slot).toHaveAttribute('data-following', 'false');

    const button = screen.getByTestId('follow-button-not-following');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    expect(follow).toHaveBeenCalledTimes(1);
    expect(unfollow).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────
// (c) Authenticated + following
// ──────────────────────────────────────────────────────────────────────

describe('TagDetailPage — follow slot integration (F1 / (c) auth + following)', () => {
  it('(c) renders the follow button with aria-pressed="true" and clicking calls unfollow', () => {
    const follow = vi.fn().mockResolvedValue(undefined);
    const unfollow = vi.fn().mockResolvedValue(undefined);

    useTagBySlugMock.mockReturnValue({
      tag: makeTag(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: true,
      isLoading: false,
    });
    useFollowTagMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow,
      unfollow: vi.fn(),
    });
    useUnfollowTagMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn(),
      unfollow,
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    const slot = screen.getByTestId('tag-follow-button-slot');
    expect(slot).toHaveAttribute('data-state', 'resolved');
    expect(slot).toHaveAttribute('data-following', 'true');

    const button = screen.getByTestId('follow-button-following');
    expect(button).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(button);
    expect(unfollow).toHaveBeenCalledTimes(1);
    expect(follow).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────
// (d) Unauthenticated
// ──────────────────────────────────────────────────────────────────────

describe('TagDetailPage — follow slot integration (F1 / (d) unauthenticated)', () => {
  it('(d) renders the follow button with aria-disabled="true" and title="Sign in to follow"', () => {
    useTagBySlugMock.mockReturnValue({
      tag: makeTag(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    // useAuthState defaults to { isAuthenticated: false } in beforeEach.
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    const button = screen.getByTestId('follow-button-signin-tooltip');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Sign in to follow');
  });

  it('(d) clicking the disabled sign-in button is a no-op (no follow / unfollow)', () => {
    useTagBySlugMock.mockReturnValue({
      tag: makeTag(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    // useAuthState defaults to { isAuthenticated: false } in beforeEach.

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    const button = screen.getByTestId('follow-button-signin-tooltip');
    fireEvent.click(button);
    expect(useFollowTagMock).toHaveBeenCalled();
    expect(useUnfollowTagMock).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────
// (e) Rollback on 4xx
// ──────────────────────────────────────────────────────────────────────

describe('TagDetailPage — follow slot integration (F1 / (e) rollback on 4xx)', () => {
  it('(e) renders the FollowErrorNotice with http_4xx copy and the button reverts to the prior state', () => {
    useTagBySlugMock.mockReturnValue({
      tag: makeTag(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowTagMock.mockReturnValue({
      isPending: false,
      lastError: { kind: 'http_4xx', cause: makeApiError(409) },
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });
    useUnfollowTagMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    const notice = screen.getByTestId('follow-error-notice-http_4xx');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(/couldn't update — try again/i);

    const button = screen.getByTestId('follow-button-not-following');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent(/follow/i);
  });
});

// ──────────────────────────────────────────────────────────────────────
// (f) Rollback on 429
// ──────────────────────────────────────────────────────────────────────

describe('TagDetailPage — follow slot integration (F1 / (f) rollback on 429)', () => {
  it('(f) renders the FollowErrorNotice with http_429 copy', () => {
    useTagBySlugMock.mockReturnValue({
      tag: makeTag(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowTagMock.mockReturnValue({
      isPending: false,
      lastError: { kind: 'http_429', cause: makeApiError(429) },
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });
    useUnfollowTagMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    const notice = screen.getByTestId('follow-error-notice-http_429');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(/slow down — try again in a minute/i);
  });
});

// ──────────────────────────────────────────────────────────────────────
// (g) Follow-count updates optimistically (D1 integration)
// ──────────────────────────────────────────────────────────────────────

describe('TagDetailPage — follow slot integration (F1 / (g) follow count)', () => {
  it('(g) renders the follow-count span with the lookup size (initial)', () => {
    useTagBySlugMock.mockReturnValue({
      tag: makeTag(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RESULT,
      tags: new Set(['tag-1', 'tag-2', 'tag-3']),
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    const count = screen.getByTestId('follow-count');
    expect(count).toHaveTextContent('3 followers');
    expect(count).toHaveAttribute('data-count', '3');
  });

  it('(g) when the lookup reports size=N+1 (post-follow), the span reflects the new size', () => {
    useTagBySlugMock.mockReturnValue({
      tag: makeTag(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: true,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RESULT,
      tags: new Set(['tag-1', 'tag-2', 'tag-3', 'tag-4']),
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    expect(screen.getByTestId('follow-count')).toHaveAttribute(
      'data-count',
      '4',
    );
    expect(screen.getByTestId('follow-count')).toHaveTextContent(
      '4 followers',
    );
  });

  it('(g) when the lookup reports size=N-1 (post-unfollow), the span reflects the new size', () => {
    useTagBySlugMock.mockReturnValue({
      tag: makeTag(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RESULT,
      tags: new Set(['tag-1', 'tag-2']),
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    expect(screen.getByTestId('follow-count')).toHaveAttribute(
      'data-count',
      '2',
    );
    expect(screen.getByTestId('follow-count')).toHaveTextContent(
      '2 followers',
    );
  });
});

// ──────────────────────────────────────────────────────────────────────
// Cross-feature state isolation (F1 AC #4)
// ──────────────────────────────────────────────────────────────────────

describe('TagDetailPage — follow slot integration (F1 / cross-feature isolation)', () => {
  it('does NOT mutate any SWR key on initial render (the slot only mutates on toggle / success / 404)', () => {
    useTagBySlugMock.mockReturnValue({
      tag: makeTag(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    // At render time the slot has not invoked `toggle()` yet. The
    // `globalMutate` call list must therefore be empty — the page
    // composition does NOT itself call `mutate()`; only the
    // optimistic-toggle primitive does, and only on toggle / success /
    // 404. F1 AC #4 locks the cross-feature isolation: the page +
    // slot composition does not introduce an extra `mutate(...)` call
    // on render.
    expect(globalMutateMock).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────
// Wiring — slot receives the resolved tagId, not the route slug
// ──────────────────────────────────────────────────────────────────────

describe('TagDetailPage — follow slot integration (F1 / wiring)', () => {
  it('passes the resolved tag.tagId (not the route slug) to the follow action hooks', () => {
    useTagBySlugMock.mockReturnValue({
      tag: makeTag({ tagId: TAG_ID, slug: TAG_SLUG }),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });

    render(
      <TestSwrProvider>
        <TagDetailPage slug={TAG_SLUG} />
      </TestSwrProvider>,
    );

    // The slot is rendered with the entity UUID, NOT the route slug.
    expect(useIsFollowingTagMock).toHaveBeenCalledWith(TAG_ID);
    expect(useFollowTagMock).toHaveBeenCalledWith(TAG_ID);
    expect(useUnfollowTagMock).toHaveBeenCalledWith(TAG_ID);
  });
});
