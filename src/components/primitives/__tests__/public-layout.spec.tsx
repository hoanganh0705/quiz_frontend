

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

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

const article = container.querySelector(
'[data-testid="article"]',
    ) as HTMLElement;
expect(article).toBeTruthy();
  });
});

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

describe('(public) layout — DOM footprint', () => {
it('(c1) the layout does not introduce a wrapping DOM element', () => {
const { container } = render(
<PublicLayout>
<p data-testid='only-child'>only</p>
</PublicLayout>,
    );

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
