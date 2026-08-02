/**
 * `<TagFollowButtonSlot />` unit tests.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B5 (slot composition); TKT-3.9.D1 (follow count).
 *
 * Five cases per the B5 ticket AC #1–11:
 *
 *   (a) `tagId === null` renders `null`.
 *   (b) Loading state renders `<FollowButtonSkeleton />`.
 *   (c) Authenticated + not-following state renders
 *       `<FollowButton />` with `aria-pressed='false'`; clicking
 *       calls `useFollowTag().follow`.
 *   (d) Authenticated + following state renders
 *       `<FollowButton />` with `aria-pressed='true'`; clicking
 *       calls `useUnfollowTag().unfollow`.
 *   (e) Unauthenticated state renders `<FollowButton />` with
 *       `aria-disabled='true'` and `title='Sign in to follow'`.
 *
 * Plus the D1 follow-count coverage:
 *
 *   (f) Resolved state renders `<span data-testid='follow-count'>` with
 *       the count derived from `useFollowedLookup().tags.size`.
 *   (g) Pluralisation — `1 follower` vs `2 followers`.
 *   (h) The count is hidden during hydration (`isLoading === true`).
 *
 * Mirror of `<CategoryFollowButtonSlot />` against the tags surface.
 * The slot composes five hooks (`useAuthState`, `useIsFollowingTag`,
 * `useFollowTag`, `useUnfollowTag`, `useFollowedLookup`). We mock all
 * five so the slot's render + composition contract can be tested in
 * isolation from the membership + action disciplines (which have
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
const useIsFollowingTagMock = vi.fn();
const useFollowTagMock = vi.fn();
const useUnfollowTagMock = vi.fn();
const useFollowedLookupMock = vi.fn();

vi.mock('@/features/auth/hooks/use-auth-state', () => ({
  useAuthState: () => useAuthStateMock(),
}));

vi.mock('@/features/tags/hooks/useIsFollowingTag', () => ({
  useIsFollowingTag: (id: string | null) => useIsFollowingTagMock(id),
}));

vi.mock('@/features/tags/hooks/useFollowTag', () => ({
  useFollowTag: (id: string | null) => useFollowTagMock(id),
}));

vi.mock('@/features/tags/hooks/useUnfollowTag', () => ({
  useUnfollowTag: (id: string | null) => useUnfollowTagMock(id),
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

import { TagFollowButtonSlot } from '@/features/tags/components/TagFollowButtonSlot';

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

// D1 — default follow-count state.
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
  useIsFollowingTagMock.mockReturnValue({
    isFollowing: false,
    isLoading: false,
  });
  useFollowTagMock.mockReturnValue(DEFAULT_FOLLOW_RETURN);
  useUnfollowTagMock.mockReturnValue(DEFAULT_UNFOLLOW_RETURN);
  useFollowedLookupMock.mockReturnValue(DEFAULT_LOOKUP_RETURN);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// (a) tagId === null
// ---------------------------------------------------------------------------

describe('<TagFollowButtonSlot /> — tagId === null', () => {
  it('(a) renders `null` when the route segment has not yet resolved', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });

    const { container } = render(<TagFollowButtonSlot tagId={null} />);
    expect(container).toBeEmptyDOMElement();
    expect(
      screen.queryByTestId('tag-follow-button-slot'),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// (b) Loading state — membership lookup is hydrating
// ---------------------------------------------------------------------------

describe('<TagFollowButtonSlot /> — loading state', () => {
  it('(b) renders <FollowButtonSkeleton /> when isLoading === true', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: true,
    });

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

    const slot = screen.getByTestId('tag-follow-button-slot');
    expect(slot).toHaveAttribute('data-state', 'loading');
    expect(screen.getByTestId('follow-button-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByTestId('follow-button-not-following'),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// (c) Authenticated + not-following
// ---------------------------------------------------------------------------

describe('<TagFollowButtonSlot /> — authenticated + not-following', () => {
  it('(c) renders <FollowButton /> with aria-pressed="false" and clicking calls follow', () => {
    const follow = vi.fn().mockResolvedValue(undefined);
    const unfollow = vi.fn().mockResolvedValue(undefined);

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

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

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

// ---------------------------------------------------------------------------
// (d) Authenticated + following
// ---------------------------------------------------------------------------

describe('<TagFollowButtonSlot /> — authenticated + following', () => {
  it('(d) renders <FollowButton /> with aria-pressed="true" and clicking calls unfollow', () => {
    const follow = vi.fn().mockResolvedValue(undefined);
    const unfollow = vi.fn().mockResolvedValue(undefined);

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

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

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

// ---------------------------------------------------------------------------
// (e) Unauthenticated
// ---------------------------------------------------------------------------

describe('<TagFollowButtonSlot /> — unauthenticated', () => {
  it('(e) renders <FollowButton /> with aria-disabled="true" and title="Sign in to follow"', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

    const button = screen.getByTestId('follow-button-signin-tooltip');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Sign in to follow');
  });
});

// ---------------------------------------------------------------------------
// Pending + lastError passthrough — covers the B4 → B2 wiring contract
// beyond the ticket AC.
// ---------------------------------------------------------------------------

describe('<TagFollowButtonSlot /> — pending + lastError passthrough', () => {
  it('forwards isPending from the action hook to <FollowButton />', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowTagMock.mockReturnValue({
      isPending: true,
      lastError: null,
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });
    useUnfollowTagMock.mockReturnValue(DEFAULT_UNFOLLOW_RETURN);

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

    const button = screen.getByTestId('follow-button-not-following');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('forwards errorKind from the action hook lastError to <FollowErrorNotice />', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowTagMock.mockReturnValue({
      isPending: false,
      lastError: { kind: 'http_404', cause: new Error('not found') },
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });
    useUnfollowTagMock.mockReturnValue({
      isPending: false,
      lastError: null,
      follow: vi.fn().mockResolvedValue(undefined),
      unfollow: vi.fn().mockResolvedValue(undefined),
    });

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

    expect(
      screen.getByText(/this tag \/ category is no longer available/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// D1 — Follow count rendering (TKT-3.9.D1 AC #2, #4, #7).
// ---------------------------------------------------------------------------

describe('<TagFollowButtonSlot /> — D1 follow count', () => {
  it('(f) renders the follow-count span with the lookup size when resolved', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RETURN,
      tags: new Set(['tag-1', 'tag-2', 'tag-3', 'tag-4']),
    });

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

    const count = screen.getByTestId('follow-count');
    expect(count).toHaveTextContent('4 followers');
    expect(count).toHaveAttribute('data-count', '4');
    expect(count).toHaveAttribute('data-loading', 'false');
  });

  it('(g) pluralises singular — "1 follower" (not "1 followers")', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RETURN,
      tags: new Set(['tag-1']),
    });

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

    expect(screen.getByTestId('follow-count')).toHaveTextContent('1 follower');
  });

  it('(g) pluralises zero — "0 followers" (matches the > 1 form)', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

    expect(screen.getByTestId('follow-count')).toHaveTextContent('0 followers');
  });

  it('(h) does NOT render the follow-count span during hydration', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: true,
    });

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

    expect(screen.queryByTestId('follow-count')).not.toBeInTheDocument();
    expect(screen.getByTestId('follow-button-skeleton')).toBeInTheDocument();
  });

  it('(h) does NOT render the follow-count span when tagId is null', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });

    render(<TagFollowButtonSlot tagId={null} />);

    expect(screen.queryByTestId('follow-count')).not.toBeInTheDocument();
  });

  it('marks the count span data-loading="true" when the lookup is hydrating in the background', () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: true });
    useIsFollowingTagMock.mockReturnValue({
      isFollowing: false,
      isLoading: false,
    });
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RETURN,
      tags: new Set(['tag-1']),
      isLoading: true,
    });

    render(<TagFollowButtonSlot tagId='tag-uuid' />);

    expect(screen.getByTestId('follow-count')).toHaveAttribute(
      'data-loading',
      'true',
    );
  });
});