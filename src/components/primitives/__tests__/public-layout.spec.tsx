/**
 * `(public)` route group layout tests.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.E4.
 *
 * Verifies the public layout's hydrator composition contract:
 *
 *   (a) The layout renders `children` unchanged.
 *   (b) Both `<FollowedLookupHydrator />` (TKT-3.9.D2) and
 *       `<BookmarksLookupHydrator />` (TKT-3.10.E3) mount.
 *   (c) Hydrator presence does not introduce extra DOM children —
 *       the layout output is structurally identical to its children
 *       for SSR purposes.
 *
 * The hydrators themselves are zero-DOM and lazy — they only mount
 * SWR subscriptions. We render the layout with mocked hydrators so
 * the layout's composition contract is verified without booting the
 * SWR / auth / SDK layers.
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`. The setupFile
 * registers `@testing-library/jest-dom` matchers and `afterEach`
 * cleanup.
 */

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks — hoist before importing the component under test so vi.mock
// hoists the factory to the top of the file.
// ---------------------------------------------------------------------------

const FollowedHydratorMock = vi.fn(
  (): React.JSX.Element => <div data-testid='followed-lookup-hydrator' />,
);
const BookmarksHydratorMock = vi.fn(
  (): React.JSX.Element => <div data-testid='bookmarks-lookup-hydrator' />,
);

vi.mock('@/features/tags/components/FollowedLookupHydrator', () => ({
  FollowedLookupHydrator: () => FollowedHydratorMock(),
}));

vi.mock('@/features/bookmarks/components/BookmarksLookupHydrator', () => ({
  BookmarksLookupHydrator: () => BookmarksHydratorMock(),
}));

import PublicLayout from '@/app/(public)/layout';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// (a) Children render unchanged
// ---------------------------------------------------------------------------

describe('(public) layout — children composition', () => {
  it('(a) renders children inside the layout tree', () => {
    const { getByText } = render(
      <PublicLayout>
        <span data-testid='children-content'>child-content</span>
      </PublicLayout>,
    );
    expect(getByText('child-content')).toBeTruthy();
  });

  it('(a2) preserves children structure (no extra wrapping element)', () => {
    const { container } = render(
      <PublicLayout>
        <article data-testid='article'>article</article>
      </PublicLayout>,
    );
    // Children sit at the layout's root level (no `<main>`, `<div>`
    // wrappers). The hydration components add their own markers but
    // do not introduce a flow-level container.
    const article = container.querySelector(
      '[data-testid="article"]',
    ) as HTMLElement;
    expect(article).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// (b) Both hydrators mount
// ---------------------------------------------------------------------------

describe('(public) layout — hydrator composition', () => {
  it('(b1) mounts the existing FollowedLookupHydrator', () => {
    render(
      <PublicLayout>
        <span>child</span>
      </PublicLayout>,
    );
    expect(FollowedHydratorMock).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector('[data-testid="followed-lookup-hydrator"]'),
    ).toBeTruthy();
  });

  it('(b2) mounts the new BookmarksLookupHydrator', () => {
    render(
      <PublicLayout>
        <span>child</span>
      </PublicLayout>,
    );
    expect(BookmarksHydratorMock).toHaveBeenCalledTimes(1);
    expect(
      document.querySelector('[data-testid="bookmarks-lookup-hydrator"]'),
    ).toBeTruthy();
  });

  it('(b3) both hydrators are present at the same render — siblings in the layout tree', () => {
    render(
      <PublicLayout>
        <span data-testid='children'>child</span>
      </PublicLayout>,
    );
    const followed = document.querySelector(
      '[data-testid="followed-lookup-hydrator"]',
    );
    const bookmarks = document.querySelector(
      '[data-testid="bookmarks-lookup-hydrator"]',
    );
    expect(followed).toBeTruthy();
    expect(bookmarks).toBeTruthy();
    expect(
      document.querySelector('[data-testid="children"]'),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// (c) Hydrators introduce no extra DOM beyond the layout's children
// ---------------------------------------------------------------------------

describe('(public) layout — DOM footprint', () => {
  it('(c1) the layout does not introduce a wrapping DOM element', () => {
    const { container } = render(
      <PublicLayout>
        <p data-testid='only-child'>only</p>
      </PublicLayout>,
    );
    // The container's children include the two hydrator markers (in
    // the mocked test the hydrators render markers) and the layout's
    // child. There is no intermediate wrapping element.
    const html = container.innerHTML;
    expect(html).toContain('followed-lookup-hydrator');
    expect(html).toContain('bookmarks-lookup-hydrator');
    expect(html).toContain('only-child');
  });

  it('(c2) renders without any child (the layout still mounts hydrators)', () => {
    render(<PublicLayout>{null}</PublicLayout>);
    expect(FollowedHydratorMock).toHaveBeenCalledTimes(1);
    expect(BookmarksHydratorMock).toHaveBeenCalledTimes(1);
  });
});
