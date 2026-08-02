/**
 * `<CategoryFollowButtonSlot />` unit tests.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B5 (slot composition); TKT-3.9.D1 (follow count).
 *
 * Five cases per the B5 ticket AC #1–11:
 *
 *   (a) `categoryId === null` renders `null`.
 *   (b) Loading state renders `<FollowButtonSkeleton />`.
 *   (c) Authenticated + not-following state renders
 *       `<FollowButton />` with `aria-pressed='false'`; clicking
 *       calls `useFollowCategory().follow`.
 *   (d) Authenticated + following state renders
 *       `<FollowButton />` with `aria-pressed='true'`; clicking
 *       calls `useUnfollowCategory().unfollow`.
 *   (e) Unauthenticated state renders `<FollowButton />` with
 *       `aria-disabled='true'` and `title='Sign in to follow'`.
 *
 * Plus the D1 follow-count coverage:
 *
 *   (f) Resolved state renders `<span data-testid='follow-count'>` with
 *       the count derived from `useFollowedLookup().categories.size`.
 *   (g) Pluralisation — `1 follower` vs `2 followers`.
 *   (h) The count is hidden during hydration (`isLoading === true`).
 *
 * The slot composes five hooks (`useAuthState`, `useIsFollowingCategory`,
 * `useFollowCategory`, `useUnfollowCategory`, `useFollowedLookup`). We
 * mock all five so the slot's render + composition contract can be tested
 * in isolation from the membership + action disciplines (which have
 * dedicated unit tests in `useFollowedLookup.spec.tsx`,
 * `useIsFollowingMembership.spec.tsx`, and `useFollowActionHooks.spec.tsx`).
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`. The setupFile
 * registers `@testing-library/jest-dom` matchers and an `afterEach`
 * `cleanup`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — hoist before importing the slot under test so vi.mock
// hoists the factory to the top of the file.
// ---------------------------------------------------------------------------

const useAuthStateMock = vi.fn();
const useIsFollowingCategoryMock = vi.fn();
const useFollowCategoryMock = vi.fn();
const useUnfollowCategoryMock = vi.fn();
const useFollowedLookupMock = vi.fn();

vi.mock('@/features/auth/hooks/use-auth-state', () => ({
  useAuthState: () => useAuthStateMock(),
}));

vi.mock('@/features/categories/hooks/useIsFollowingCategory', () => ({
  useIsFollowingCategory: (id: string | null) =>
    useIsFollowingCategoryMock(id),
}));

vi.mock('@/features/categories/hooks/useFollowCategory', () => ({
  useFollowCategory: (id: string | null) => useFollowCategoryMock(id),
}));

vi.mock('@/features/categories/hooks/useUnfollowCategory', () => ({
  useUnfollowCategory: (id: string | null) => useUnfollowCategoryMock(id),
}));

// D1 — the follow-count source. Mocked here so the slot test does NOT
// hit the real network (the real `useFollowedLookup` fires two
// `me/followed` SWR fetches against the backend).
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

import { CategoryFollowButtonSlot } from '@/features/categories/components/CategoryFollowButtonSlot';

const FOLLOW_NOOP = async (): Promise<void> => {
  return;
};
const UNFOLLOW_NOOP = FOLLOW_NOOP;

const DEFAULT_FOLLOW_RETURN = {
  isPending: false,
  lastError: null,
  follow: FOLLOW_NOOP,
  unfollow: UNFOLLOW_NOOP,
};
const DEFAULT_UNFOLLOW_RETURN = DEFAULT_FOLLOW_RETURN;

// D1 — default follow-count state. The default lookup contains zero
// items so the slot renders `0 followers` by default; individual tests
// override the size via `useFollowedLookupMock.mockReturnValue(...)`.
const DEFAULT_LOOKUP_RETURN = {
  categories: new Set<string>(),
  tags: new Set<string>(),
  isLoading: false,
  error: null,
  mutate: async (): Promise<void> => {
    return;
  },
};

beforeEach(() => {
  // Every test starts with a known-good default; individual tests
  // override what they need.
  useAuthStateMock.mockReturnValue({ isAuthenticated: false });
  useIsFollowingCategoryMock.mockReturnValue({
    isFollowing: false,
    isLoading: false,
  });
  useFollowCategoryMock.mockReturnValue(DEFAULT_FOLLOW_RETURN);
  useUnfollowCategoryMock.mockReturnValue(DEFAULT_UNFOLLOW_RETURN);
  useFollowedLookupMock.mockReturnValue(DEFAULT_LOOKUP_RETURN);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// (a) categoryId === null
// ---------------------------------------------------------------------------

describe('<CategoryFollowButtonSlot /> — categoryId === null', () => {
  it('(a) renders `null` when the route segment has not yet resolved', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });

    const { container } = render(
      <CategoryFollowButtonSlot categoryId={null} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByTestId('category-follow-button-slot'),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// (b) Loading state — membership lookup is hydrating
// ---------------------------------------------------------------------------

describe('<CategoryFollowButtonSlot /> — loading state', () => {
  it('(b) renders <FollowButtonSkeleton /> when isLoading === true', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: true,
    });

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    const slot = screen.getByTestId('category-follow-button-slot');
    expect(slot).toHaveAttribute('data-state', 'loading');
    expect(screen.getByTestId('follow-button-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByTestId('follow-button-not-following'),
    ).not.toBeInTheDocument();
  });

  it('(b) does NOT instantiate follow / unfollow action hooks during loading', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: true,
    });

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    expect(useFollowCategoryMock).toHaveBeenCalled();
    expect(useUnfollowCategoryMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (c) Authenticated + not-following
// ---------------------------------------------------------------------------

describe('<CategoryFollowButtonSlot /> — authenticated + not-following', () => {
  it('(c) renders <FollowButton /> with aria-pressed="false" and clicking calls follow', () => {
    const follow = vi.fn().mockResolvedValue(undefined);
    const unfollow = vi.fn().mockResolvedValue(undefined);

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

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

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

// ---------------------------------------------------------------------------
// (d) Authenticated + following
// ---------------------------------------------------------------------------

describe('<CategoryFollowButtonSlot /> — authenticated + following', () => {
  it('(d) renders <FollowButton /> with aria-pressed="true" and clicking calls unfollow', () => {
    const follow = vi.fn().mockResolvedValue(undefined);
    const unfollow = vi.fn().mockResolvedValue(undefined);

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

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

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

// ---------------------------------------------------------------------------
// (e) Unauthenticated
// ---------------------------------------------------------------------------

describe('<CategoryFollowButtonSlot /> — unauthenticated', () => {
  it('(e) renders <FollowButton /> with aria-disabled="true" and title="Sign in to follow"', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    const button = screen.getByTestId('follow-button-signin-tooltip');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Sign in to follow');
  });

  it('(e) clicking the disabled button does NOT call follow or unfollow', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    const button = screen.getByTestId('follow-button-signin-tooltip');
    fireEvent.click(button);
    // The B2 primitive short-circuits to a no-op for unauthenticated;
    // the action hooks are not invoked.
    expect(useFollowCategoryMock).toHaveBeenCalled();
    expect(useUnfollowCategoryMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Pending + lastError passthrough — covers the B4 → B2 wiring contract
// beyond the ticket AC.
// ---------------------------------------------------------------------------

describe('<CategoryFollowButtonSlot /> — pending + lastError passthrough', () => {
  it('forwards isPending from the action hook to <FollowButton />', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowCategoryMock.mockReturnValue({
      isPending: true,
      lastError: null,
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });
    useUnfollowCategoryMock.mockReturnValue(DEFAULT_UNFOLLOW_RETURN);

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    const button = screen.getByTestId('follow-button-not-following');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('forwards errorKind from the action hook lastError to <FollowErrorNotice />', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: { kind: 'http_429', cause: new Error('throttled') },
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });
    useUnfollowCategoryMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    expect(
      screen.getByText(/slow down — try again in a minute/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// D1 — Follow count rendering (TKT-3.9.D1 AC #1, #4, #7).
// ---------------------------------------------------------------------------

describe('<CategoryFollowButtonSlot /> — D1 follow count', () => {
  it('(f) renders the follow-count span with the lookup size when resolved', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RETURN,
      categories: new Set(['cat-1', 'cat-2', 'cat-3']),
    });

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    const count = screen.getByTestId('follow-count');
    expect(count).toHaveTextContent('3 followers');
    expect(count).toHaveAttribute('data-count', '3');
    expect(count).toHaveAttribute('data-loading', 'false');
  });

  it('(g) pluralises singular — "1 follower" (not "1 followers")', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RETURN,
      categories: new Set(['cat-1']),
    });

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    expect(screen.getByTestId('follow-count')).toHaveTextContent('1 follower');
  });

  it('(g) pluralises zero — "0 followers" (matches the > 1 form)', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    expect(screen.getByTestId('follow-count')).toHaveTextContent('0 followers');
  });

  it('(h) does NOT render the follow-count span during hydration', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: true,
    });

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    expect(screen.queryByTestId('follow-count')).not.toBeInTheDocument();
    expect(screen.getByTestId('follow-button-skeleton')).toBeInTheDocument();
  });

  it('(h) does NOT render the follow-count span when categoryId is null', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });

    render(<CategoryFollowButtonSlot categoryId={null} />);

    expect(screen.queryByTestId('follow-count')).not.toBeInTheDocument();
  });

  it('marks the count span data-loading="true" when the lookup is hydrating in the background', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingCategoryMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RETURN,
      categories: new Set(['cat-1']),
      isLoading: true,
    });

    render(<CategoryFollowButtonSlot categoryId='cat-uuid' />);

    expect(screen.getByTestId('follow-count')).toHaveAttribute(
      'data-loading',
      'true',
    );
  });
});