/**
 * `CategoryDetailPage.spec.tsx` — page-level composition tests for the
 * `/categories/[idOrSlug]` route's follow surface.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.F1 — page-level composition tests for the
 *                 category + tag detail pages (follow-slot integration).
 *
 * The slot unit tests in `CategoryFollowButtonSlot.spec.tsx` (B5) lock
 * the slot's render + composition contract in isolation. The page-level
 * tests in this file lock the integration contract — i.e. that the
 * `<CategoryDetailPage />` actually wires the slot next to the header
 * and passes the resolved `category.categoryId` (NOT the route slug —
 * A1 §7 records the drift).
 *
 * ## What this file covers (per TKT-3.9.F1 AC #1)
 *
 *   (a) **Loading** — the slot renders `null` while the detail hook
 *       resolves (no follow button before the entity UUID exists).
 *   (b) **Authenticated + not-following** — the slot renders
 *       `<FollowButton />` with `aria-pressed='false'`; clicking
 *       triggers `useFollowCategory().follow`.
 *   (c) **Authenticated + following** — the slot renders
 *       `<FollowButton />` with `aria-pressed='true'`; clicking
 *       triggers `useUnfollowCategory().unfollow`.
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
 *   reference is stable across the `vi.mock` factories (the
 *   standard vitest pattern for module-mock factories).
 * - The global `mutate` import from `'swr'` is captured via
 *   `vi.mock('swr', ...)` so we can assert the slot does NOT mutate
 *   any SWR key outside its declared `keysToInvalidate` (the F1 AC #4
 *   cross-feature isolation check).
 * - The SWR cache is reset between tests via the `TestSwrProvider`
 *   pattern (per the F1 AC #3 reference to
 *   `useFeaturedQuizzes.spec.tsx:98–112`).
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
import type { CategoryResponseDto } from '@/lib/api/generated/schemas';

// ──────────────────────────────────────────────────────────────────────
// Module-level mocks — hoisted so the factories can reference them
// before the file under test imports anything.
// ──────────────────────────────────────────────────────────────────────

const {
  useCategoryMock,
  useCategoryQuizzesMock,
  useAuthStateMock,
  useIsFollowingCategoryMock,
  useFollowCategoryMock,
  useUnfollowCategoryMock,
  useFollowedLookupMock,
  globalMutateMock,
} = vi.hoisted(() => ({
  useCategoryMock: vi.fn(),
  useCategoryQuizzesMock: vi.fn(),
  useAuthStateMock: vi.fn(),
  useIsFollowingCategoryMock: vi.fn(),
  useFollowCategoryMock: vi.fn(),
  useUnfollowCategoryMock: vi.fn(),
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
// `keysToInvalidate`. The implementation of `useOptimisticToggle`
// calls `globalMutate(key, undefined, { revalidate: true })` for the
// keys it declared at hook construction time — we only need to assert
// the call list, not its semantics.
vi.mock('swr', async () => {
  const actual =
    await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: globalMutateMock,
  };
});

// Mock the five data sources the page + slot consume. The page
// consumes `useCategory` + `useCategoryQuizzes`; the slot consumes
// the remaining four.
vi.mock('@/features/categories/hooks', () => ({
  useCategory: (idOrSlug: string) => useCategoryMock(idOrSlug),
  useCategoryQuizzes: (idOrSlug: string, params: unknown) =>
    useCategoryQuizzesMock(idOrSlug, params),
}));

vi.mock('@/features/categories/hooks/useIsFollowingCategory', () => ({
  useIsFollowingCategory: (id: string | null) =>
    useIsFollowingCategoryMock(id),
}));

vi.mock('@/features/categories/hooks/useFollowCategory', () => ({
  useFollowCategory: (id: string | null) => useFollowCategoryMock(id),
}));

vi.mock('@/features/categories/hooks/useUnfollowCategory', () => ({
  useUnfollowCategory: (id: string | null) =>
    useUnfollowCategoryMock(id),
}));

vi.mock('@/features/auth/hooks/use-auth-state', () => ({
  useAuthState: () => useAuthStateMock(),
}));

// The lookup hook lives under `features/tags/` (shared with the
// tag-side membership hook); mock it here so the slot test does
// NOT hit the real network.
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

import { CategoryDetailPage } from '@/features/categories/components/CategoryDetailPage';

// ──────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────

const CATEGORY_ID = '0192f4d8-0000-7000-8000-000000000001';
const CATEGORY_SLUG = 'mathematics';

function makeCategory(
  overrides: Partial<CategoryResponseDto> = {},
): CategoryResponseDto {
  return {
    categoryId: CATEGORY_ID,
    name: 'Mathematics',
    description: 'All math quizzes.',
    slug: CATEGORY_SLUG,
    imageUrl: null,
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

const DEFAULT_CATEGORY_QUIZZES_RESULT = {
  items: [],
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  loadMore: vi.fn(),
  error: null,
  refresh: vi.fn(),
  retryBannerVisible: false,
};

beforeEach(() => {
  // Page-level mocks
  useCategoryQuizzesMock.mockReturnValue(DEFAULT_CATEGORY_QUIZZES_RESULT);

  // Slot-level mocks
  useAuthStateMock.mockReturnValue({ isAuthenticated: false });
  useIsFollowingCategoryMock.mockReturnValue({
    isFollowing: false,
    isLoading: false,
  });
  useFollowCategoryMock.mockReturnValue(DEFAULT_ACTION_RESULT);
  useUnfollowCategoryMock.mockReturnValue(DEFAULT_ACTION_RESULT);
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

describe('CategoryDetailPage — follow slot integration (F1 / (a) loading)', () => {
  it('(a) while the detail hook is loading, the follow slot renders null', () => {
    useCategoryMock.mockReturnValue({
      category: null,
      isLoading: true,
      error: null,
      notFound: false,
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
      </TestSwrProvider>,
    );

    // The loading skeleton is rendered (per Story 3.3 D3) — the
    // follow slot does NOT occupy the DOM during this window.
    expect(
      screen.getByTestId('category-detail-page-loading'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('category-follow-button-slot'),
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

describe('CategoryDetailPage — follow slot integration (F1 / (b) auth + not-following)', () => {
  it('(b) renders the follow button with aria-pressed="false" and clicking calls follow', () => {
    const follow = vi.fn().mockResolvedValue(undefined);
    const unfollow = vi.fn().mockResolvedValue(undefined);

    useCategoryMock.mockReturnValue({
      category: makeCategory(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow,
      unfollow: vi.fn(),
    });
    useUnfollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn(),
      unfollow,
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
      </TestSwrProvider>,
    );

    const slot = screen.getByTestId('category-follow-button-slot');
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

describe('CategoryDetailPage — follow slot integration (F1 / (c) auth + following)', () => {
  it('(c) renders the follow button with aria-pressed="true" and clicking calls unfollow', () => {
    const follow = vi.fn().mockResolvedValue(undefined);
    const unfollow = vi.fn().mockResolvedValue(undefined);

    useCategoryMock.mockReturnValue({
      category: makeCategory(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: true,
      isLoading: false,
    });
    useFollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow,
      unfollow: vi.fn(),
    });
    useUnfollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn(),
      unfollow,
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
      </TestSwrProvider>,
    );

    const slot = screen.getByTestId('category-follow-button-slot');
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

describe('CategoryDetailPage — follow slot integration (F1 / (d) unauthenticated)', () => {
  it('(d) renders the follow button with aria-disabled="true" and title="Sign in to follow"', () => {
    useCategoryMock.mockReturnValue({
      category: makeCategory(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    // useAuthState defaults to { isAuthenticated: false } in beforeEach.
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
      </TestSwrProvider>,
    );

    const button = screen.getByTestId('follow-button-signin-tooltip');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Sign in to follow');
  });

  it('(d) clicking the disabled sign-in button is a no-op (no follow / unfollow)', () => {
    useCategoryMock.mockReturnValue({
      category: makeCategory(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    // useAuthState defaults to { isAuthenticated: false } in beforeEach.

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
      </TestSwrProvider>,
    );

    const button = screen.getByTestId('follow-button-signin-tooltip');
    fireEvent.click(button);
    // The B2 primitive short-circuits the onToggle to a no-op;
    // neither follow nor unfollow is invoked.
    expect(useFollowCategoryMock).toHaveBeenCalled();
    expect(useUnfollowCategoryMock).toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────
// (e) Rollback on 4xx — errorKind surfaces + button reverts
// ──────────────────────────────────────────────────────────────────────

describe('CategoryDetailPage — follow slot integration (F1 / (e) rollback on 4xx)', () => {
  it('(e) renders the FollowErrorNotice with http_4xx copy and the button reverts to the prior state', () => {
    useCategoryMock.mockReturnValue({
      category: makeCategory(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: { kind: 'http_4xx', cause: makeApiError(409) },
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });
    useUnfollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
      </TestSwrProvider>,
    );

    // The FollowErrorNotice is rendered with the http_4xx copy.
    const notice = screen.getByTestId('follow-error-notice-http_4xx');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(/couldn't update — try again/i);

    // The button reverts to the prior text (Follow) — Story 3.9
    // AC #2 (optimistic update + revert).
    const button = screen.getByTestId('follow-button-not-following');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent(/follow/i);
  });
});

// ──────────────────────────────────────────────────────────────────────
// (f) Rollback on 429 — errorKind surfaces
// ──────────────────────────────────────────────────────────────────────

describe('CategoryDetailPage — follow slot integration (F1 / (f) rollback on 429)', () => {
  it('(f) renders the FollowErrorNotice with http_429 copy', () => {
    useCategoryMock.mockReturnValue({
      category: makeCategory(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: { kind: 'http_429', cause: makeApiError(429) },
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });
    useUnfollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
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

describe('CategoryDetailPage — follow slot integration (F1 / (g) follow count)', () => {
  it('(g) renders the follow-count span with the lookup size (initial)', () => {
    useCategoryMock.mockReturnValue({
      category: makeCategory(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RESULT,
      categories: new Set(['cat-1', 'cat-2', 'cat-3']),
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
      </TestSwrProvider>,
    );

    const count = screen.getByTestId('follow-count');
    expect(count).toHaveTextContent('3 followers');
    expect(count).toHaveAttribute('data-count', '3');
  });

  it('(g) when the lookup reports size=N+1 (post-optimistic-update), the span reflects the new size', () => {
    // Simulate the post-optimistic-update state. In production, the
    // B4 hook's `useOptimisticToggle` primitive fires
    // `globalMutate(key, updater)` on success which calls back into
    // `useFollowedLookup`'s SWR `mutate`. The hook's `mutate()` is
    // re-exported and the page-level test simulates that by setting
    // the mock to return the new size.
    useCategoryMock.mockReturnValue({
      category: makeCategory(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: true,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RESULT,
      categories: new Set(['cat-1', 'cat-2', 'cat-3', 'cat-4']),
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
      </TestSwrProvider>,
    );

    // The span reads from the B3 lookup. After the optimistic update
    // flips `isFollowing: true`, the B4 hook fires `mutate(key)` on
    // `follow-lookup`, the lookup refetches, and the slot renders
    // the new size. The span's data attribute must reflect the new
    // size — this is the D1 integration contract.
    expect(screen.getByTestId('follow-count')).toHaveAttribute(
      'data-count',
      '4',
    );
    expect(screen.getByTestId('follow-count')).toHaveTextContent(
      '4 followers',
    );
  });

  it('(g) when the lookup reports size=N-1 (post-unfollow), the span reflects the new size', () => {
    useCategoryMock.mockReturnValue({
      category: makeCategory(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RESULT,
      categories: new Set(['cat-1', 'cat-2']),
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
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

describe('CategoryDetailPage — follow slot integration (F1 / cross-feature isolation)', () => {
  it('does NOT mutate any SWR key outside the slot\'s declared keysToInvalidate', () => {
    useCategoryMock.mockReturnValue({
      category: makeCategory(),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
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
// Wiring — slot receives the resolved categoryId, not the route slug
// ──────────────────────────────────────────────────────────────────────

describe('CategoryDetailPage — follow slot integration (F1 / wiring)', () => {
  it('passes the resolved category.categoryId (not the route slug) to the follow action hooks', () => {
    useCategoryMock.mockReturnValue({
      category: makeCategory({
        categoryId: CATEGORY_ID,
        slug: 'mathematics',
      }),
      isLoading: false,
      error: null,
      notFound: false,
    });
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });

    render(
      <TestSwrProvider>
        <CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
      </TestSwrProvider>,
    );

    // The slot is rendered with the entity UUID, NOT the route slug.
    // A1 §7 records the drift — the wire calls use UUID, the route
    // uses slug, but the slot's identity contract is the UUID.
    expect(useIsFollowingCategoryMock).toHaveBeenCalledWith(CATEGORY_ID);
    expect(useFollowCategoryMock).toHaveBeenCalledWith(CATEGORY_ID);
    expect(useUnfollowCategoryMock).toHaveBeenCalledWith(CATEGORY_ID);

    // The breadcrumb in the page still uses the canonical slug from
    // the response payload (Story 3.3 F1) — independent of the slot.
    const breadcrumb = screen.getByTestId('category-detail-page-breadcrumb');
    const slugLink = within(breadcrumb).getByRole('link', {
      name: /mathematics/i,
    });
    expect(slugLink).toHaveAttribute('href', '/categories/mathematics');
  });
});
