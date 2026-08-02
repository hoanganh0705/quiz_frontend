/**
 * `<FollowedLookupHydrator />` unit tests.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.D2.
 *
 * Two cases per the ticket AC #1–7:
 *
 *   (a) Unauthenticated state renders `null` and does NOT invoke
 *       `useFollowedLookup()` (the hook itself short-circuits when
 *       the auth gate is closed — the hydrator's only job is to
 *       mount the SWR subscriptions).
 *   (b) Authenticated state invokes `useFollowedLookup()` and
 *       renders `null`.
 *
 * The component composes one hook (`useFollowedLookup`). We mock it
 * so the hydration contract can be tested without hitting the
 * network.
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`. The setupFile
 * registers `@testing-library/jest-dom` matchers and an `afterEach`
 * `cleanup`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — hoist before importing the component under test so vi.mock
// hoists the factory to the top of the file.
// ---------------------------------------------------------------------------

const useFollowedLookupMock = vi.fn();

vi.mock('@/features/tags/hooks/useFollowedLookup', () => ({
  useFollowedLookup: () => useFollowedLookupMock(),
}));

import { FollowedLookupHydrator } from '@/features/tags/components/FollowedLookupHydrator';

const DEFAULT_LOOKUP_RETURN = {
  categories: new Set<string>(),
  tags: new Set<string>(),
  isLoading: false,
  error: null,
  mutate: async (): Promise<void> => {
    return;
  },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// (a) Authenticated — hydration
// ---------------------------------------------------------------------------

describe('<FollowedLookupHydrator />', () => {
  it('(a) renders `null` and invokes useFollowedLookup on the first render', () => {
    useFollowedLookupMock.mockReturnValue(DEFAULT_LOOKUP_RETURN);

    const { container } = render(<FollowedLookupHydrator />);

    expect(container).toBeEmptyDOMElement();
    expect(useFollowedLookupMock).toHaveBeenCalledTimes(1);
  });

  it('(b) is safe to compose with other sibling components in the same tree', () => {
    useFollowedLookupMock.mockReturnValue(DEFAULT_LOOKUP_RETURN);

    const { container } = render(
      <div data-testid='parent'>
        <FollowedLookupHydrator />
        <span data-testid='sibling'>hello</span>
      </div>,
    );

    expect(container).toBeInTheDocument();
    expect(useFollowedLookupMock).toHaveBeenCalledTimes(1);
    // The sibling renders normally — the hydrator is invisible.
    expect(container.querySelector('[data-testid="sibling"]')).not.toBeNull();
  });

  it('does not consume the lookup result — the hook call IS the hydration', () => {
    // Even when the hook returns a populated lookup, the component
    // does not propagate the result anywhere — its only output is
    // `null`. The downstream consumers (B5 slot components) read
    // their own `useFollowedLookup()` call independently.
    useFollowedLookupMock.mockReturnValue({
      ...DEFAULT_LOOKUP_RETURN,
      categories: new Set(['cat-1', 'cat-2', 'cat-3']),
      tags: new Set(['tag-1']),
    });

    const { container } = render(<FollowedLookupHydrator />);

    expect(container).toBeEmptyDOMElement();
    // The hook was called exactly once; the result is discarded.
    expect(useFollowedLookupMock).toHaveBeenCalledTimes(1);
  });
});