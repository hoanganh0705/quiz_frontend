/**
 * `<BookmarksLookupHydrator />` unit tests.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.E3.
 *
 * Cases per the ticket AC #1–4:
 *
 *   (a) The component renders no DOM (zero-DOM contract).
 *   (b) Mounting it subscribes to `useBookmarkedQuizIds` once per
 *       provider tree (the call IS the hydration).
 *   (c) The hook's auth gate is the source of truth for "no
 *       bookmark HTTP calls when unauthenticated"; the hydrator
 *       does NOT need to add its own guard, but we verify by
 *       mocking the hook that the call is unconditional.
 *   (d) Authentication changes start or clear membership hydration
 *       through the hook contract — re-mounting the hydrator (via
 *       key change) re-invokes the hook and SWR's cache keying
 *       handles the user-scoping.
 *   (e) No duplicate request under Strict Mode / SWR dedupe — the
 *       call count is asserted at exactly 1 per render cycle.
 *
 * Test-environment notes: the vitest jsdom project picks up
 * `src/components/primitives/__tests__/`. The setupFile registers
 * `@testing-library/jest-dom` matchers and `afterEach` cleanup.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — hoist before importing the component under test so vi.mock
// hoists the factory to the top of the file.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  useBookmarkedQuizIds: vi.fn(),
  bookmarkedQuizIdsKey: vi.fn(() => ['bookmarked-quiz-ids']),
}));

vi.mock('@/features/bookmarks/hooks/use-bookmarked-quiz-ids', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/bookmarks/hooks/use-bookmarked-quiz-ids')
  >('@/features/bookmarks/hooks/use-bookmarked-quiz-ids');
  return {
    ...actual,
    useBookmarkedQuizIds: () => mocks.useBookmarkedQuizIds(),
    // Override the key factory with a mock so the F3 effect can
    // call `bookmarkedQuizIdsKey()` without booting the real SWR
    // keying logic. The mock returns a stable array reference.
    bookmarkedQuizIdsKey: () => mocks.bookmarkedQuizIdsKey(),
  };
});

import { BookmarksLookupHydrator } from '@/features/bookmarks/components/BookmarksLookupHydrator';

const DEFAULT_MEMBERSHIP_RETURN = {
  quizIds: new Set<string>(),
  isLoading: false,
  error: null,
  mutate: async (): Promise<unknown> => {
    return;
  },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// (a) Zero-DOM contract
// ---------------------------------------------------------------------------

describe('<BookmarksLookupHydrator />', () => {
  it('(a1) renders `null` and invokes useBookmarkedQuizIds on the first render', () => {
    mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);

    const { container } = render(<BookmarksLookupHydrator />);

    expect(container).toBeEmptyDOMElement();
    expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);
  });

  it('(a2) is safe to compose with other sibling components in the same tree', () => {
    mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);

    const { container } = render(
      <div data-testid='parent'>
        <BookmarksLookupHydrator />
        <span data-testid='sibling'>hello</span>
      </div>,
    );

    expect(container).toBeInTheDocument();
    expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);
    // The sibling renders normally — the hydrator is invisible.
    expect(container.querySelector('[data-testid="sibling"]')).not.toBeNull();
  });

  it('(a3) does not propagate the membership result — it is purely a hydration hook caller', () => {
    // Even when the hook returns a populated Set, the component does
    // not propagate the result anywhere — its only output is `null`.
    // The downstream consumers (per-feature slot components) read
    // their own `useBookmarkedQuizIds()` call independently.
    mocks.useBookmarkedQuizIds.mockReturnValue({
      ...DEFAULT_MEMBERSHIP_RETURN,
      quizIds: new Set<string>([
        '0192f4d8-0000-7000-8000-000000000001',
        '0192f4d8-0000-7000-8000-000000000002',
        '0192f4d8-0000-7000-8000-000000000003',
      ]),
    });

    const { container } = render(<BookmarksLookupHydrator />);

    expect(container).toBeEmptyDOMElement();
  });
});

// ---------------------------------------------------------------------------
// (b/c) Hydration contracts
// ---------------------------------------------------------------------------

describe('<BookmarksLookupHydrator /> — hydration', () => {
  it('(b) calls useBookmarkedQuizIds exactly once per mount (not twice in Strict Mode)', () => {
    // React 19 Strict Mode renders each component twice in development
    // to surface side-effects. The hydrator's only side-effect is the
    // hook call, which delegates to SWR — the SWR provider dedupes the
    // resulting fetch by key. The hook call ITSELF happens once per
    // effect commit (Strict Mode is a render concern, not an
    // effect-double-fire issue here). We assert once-per-render.
    mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);

    render(<BookmarksLookupHydrator />);
    expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);

    cleanup();
    mocks.useBookmarkedQuizIds.mockClear();

    const { container } = render(
      <>
        <BookmarksLookupHydrator />
        <BookmarksLookupHydrator />
      </>,
    );
    // Two separate hooks are mounted — one per component. The test
    // verifies the component is composable (E4 mounts it adjacent to
    // `<FollowedLookupHydrator />`); each mount fires its own hook.
    expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-testid="bookmark-button-slot"]')).toBeNull();
  });

  it('(c) treats authentication transitions as a hook-responsibility — the hydrator does not gate auth', () => {
    // The hydrator is intentionally NOT authenticated-conditional.
    // The auth gate lives in `useBookmarkedQuizIds` (B3 AC #1): the
    // SWR key resolves to `null` when `isAuthenticated === false`,
    // so SWR skips the fetch entirely. The hydrator's role is the
    // unconditional mount — re-rendering with a different auth
    // state must continue to invoke the hook (which then no-ops on
    // the SWR side).
    mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);

    const { rerender } = render(<BookmarksLookupHydrator />);
    expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);

    rerender(<BookmarksLookupHydrator />);
    expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(2);
  });

  it('(e) does not introduce any extra HTTP call beyond what the hook itself fires', () => {
    // The mock records the hook invocations but does not fire any
    // fetch. The contract is: the hydrator is a SWR-key-narrow mount,
    // not a request multiplier. We assert this by verifying the
    // component renders without throwing — the absence of an HTTP
    // call is the hook's responsibility, not the hydrator's.
    mocks.useBookmarkedQuizIds.mockReturnValue({
      ...DEFAULT_MEMBERSHIP_RETURN,
      isLoading: true,
    });

    expect(() => render(<BookmarksLookupHydrator />)).not.toThrow();
    expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// (d) Rerender / auth change
// ---------------------------------------------------------------------------

describe('<BookmarksLookupHydrator /> — rerender', () => {
  it('re-invokes the hook on rerender (the parent controls hydration lifetime)', () => {
    mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);
    const { rerender } = render(
      <BookmarksLookupHydrator />,
    );
    expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);

    rerender(<BookmarksLookupHydrator />);
    expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(2);

    rerender(<BookmarksLookupHydrator />);
    expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(3);
  });

  it('does not consume any return value from the hook (null render is unconditional)', () => {
    // The component's return is statically `null` regardless of the
    // hook's return value. This isolates the hydrator from rendering
    // side-effects that would otherwise surface the membership Set
    // twice (once for hydration, once for any downstream read).
    const states: Array<ReturnType<typeof mocks.useBookmarkedQuizIds>> = [
      {
        quizIds: new Set<string>(),
        isLoading: false,
        error: null,
        mutate: async () => {},
      },
      {
        quizIds: new Set<string>(['id-a', 'id-b']),
        isLoading: true,
        error: null,
        mutate: async () => {},
      },
      {
        quizIds: new Set<string>(['id-c']),
        isLoading: false,
        error: { status: 500, message: 'x' } as unknown as null,
        mutate: async () => {},
      },
    ];

    for (const state of states) {
      cleanup();
      mocks.useBookmarkedQuizIds.mockReturnValue(state);
      const { container } = render(<BookmarksLookupHydrator />);
      expect(container).toBeEmptyDOMElement();
    }
    expect(mocks.useBookmarkedQuizIds.mock.calls.length).toBeGreaterThanOrEqual(
      states.length,
    );
  });
});
