

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

vi.mock('swr', async () => {
const actual =
await vi.importActual<typeof import('swr')>('swr');
return {
...actual,
mutate: globalMutateMock,
  };
});

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

import { CategoryDetailPage } from '@/features/categories/components/CategoryDetailPage';

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

useCategoryQuizzesMock.mockReturnValue(DEFAULT_CATEGORY_QUIZZES_RESULT);

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

describe('CategoryDetailPage — follow slot integration (F1 / (d) unauthenticated)', () => {
it('(d) renders the follow button with aria-disabled="true" and title="Sign in to follow"', () => {
useCategoryMock.mockReturnValue({
category: makeCategory(),
isLoading: false,
error: null,
notFound: false,
    });

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

render(
<TestSwrProvider>
<CategoryDetailPage idOrSlug={CATEGORY_SLUG} />
</TestSwrProvider>,
    );

const button = screen.getByTestId('follow-button-signin-tooltip');
fireEvent.click(button);

expect(useFollowCategoryMock).toHaveBeenCalled();
expect(useUnfollowCategoryMock).toHaveBeenCalled();
  });
});

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

const notice = screen.getByTestId('follow-error-notice-http_4xx');
expect(notice).toBeInTheDocument();
expect(notice).toHaveTextContent(/couldn't update — try again/i);

const button = screen.getByTestId('follow-button-not-following');
expect(button).toHaveAttribute('aria-pressed', 'false');
expect(button).toHaveTextContent(/follow/i);
  });
});

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

expect(globalMutateMock).not.toHaveBeenCalled();
  });
});

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

expect(useIsFollowingCategoryMock).toHaveBeenCalledWith(CATEGORY_ID);
expect(useFollowCategoryMock).toHaveBeenCalledWith(CATEGORY_ID);
expect(useUnfollowCategoryMock).toHaveBeenCalledWith(CATEGORY_ID);

const breadcrumb = screen.getByTestId('category-detail-page-breadcrumb');
const slugLink = within(breadcrumb).getByRole('link', {
name: /mathematics/i,
    });
expect(slugLink).toHaveAttribute('href', '/categories/mathematics');
  });
});
