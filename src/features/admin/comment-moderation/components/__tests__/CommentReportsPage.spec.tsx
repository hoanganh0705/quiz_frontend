

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { CommentReportsPage } from '@/features/admin/comment-moderation/components/CommentReportsPage';

const useAdminFeatureFlagMock = vi.hoisted(() =>
vi.fn((_flag?: unknown) => ({
isLive: false,
value: 'placeholder' as 'placeholder' | 'live' | 'enabled' | 'disabled',
isPlaceholder: true,
  })),
);

const useCommentReportsMock = vi.hoisted(() =>
vi.fn(() => ({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(async () => undefined),
error: null,
refresh: vi.fn(async () => undefined),
retryBannerVisible: false,
show: 'pending' as 'pending' | 'resolved',
setShow: vi.fn(),
  })),
);

const useCommentMock = vi.hoisted(() =>
vi.fn((_params: { commentId: string }) => ({
comment: null,
isLoading: false,
error: null,
outcome: 'pending' as 'pending' | 'success' | 'not-found' | 'forbidden' | 'reverted',
refresh: vi.fn(async () => null),
mutate: vi.fn(async () => null),
  })),
);

const usePermissionMock = vi.hoisted(() =>
vi.fn(() => ({
isLoading: false,
error: null,
hasPermission: true,
  })),
);

const useAuthSessionMock = vi.hoisted(() =>
vi.fn(() => ({
bootstrapState: 'authenticated',
isAuthenticated: true,
currentUser: { userId: 'admin-1' },
  })),
);

vi.mock('@/features/admin/hooks/useAdminFeatureFlag', () => ({
useAdminFeatureFlag: useAdminFeatureFlagMock,
}));

vi.mock('@/features/admin/comment-moderation/hooks/useCommentReports', () => ({
useCommentReports: useCommentReportsMock,
}));

vi.mock('@/features/admin/comment-moderation/hooks/useComment', () => ({
useComment: (params: { commentId: string }) => useCommentMock(params),
}));

vi.mock('@/features/admin/hooks/usePermission', () => ({
usePermission: usePermissionMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: useAuthSessionMock,
}));

vi.mock('@/features/admin/hooks', () => ({
useAdminFeatureFlag: useAdminFeatureFlagMock,
}));

function renderPage() {
return render(
<SWRConfig value={{ provider: () => new Map() }}>
<CommentReportsPage />
</SWRConfig>,
  );
}

beforeEach(() => {
vi.clearAllMocks();
useAdminFeatureFlagMock.mockReturnValue({
isLive: false,
value: 'placeholder',
isPlaceholder: true,
  });
useCommentReportsMock.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(async () => undefined),
error: null,
refresh: vi.fn(async () => undefined),
retryBannerVisible: false,
show: 'pending',
setShow: vi.fn(),
  });
useCommentMock.mockReturnValue({
comment: null,
isLoading: false,
error: null,
outcome: 'pending',
refresh: vi.fn(async () => null),
mutate: vi.fn(async () => null),
  });
usePermissionMock.mockReturnValue({
isLoading: false,
error: null,
hasPermission: true,
  });
useAuthSessionMock.mockReturnValue({
bootstrapState: 'authenticated',
isAuthenticated: true,
currentUser: { userId: 'admin-1' },
  });
});

describe('TKT-7.6.F1 — CommentReportsPage: flag gate', () => {
it('renders the documented "coming soon" notice when the flag is "placeholder"', () => {
useAdminFeatureFlagMock.mockReturnValue({
isLive: false,
value: 'placeholder',
isPlaceholder: true,
    });

renderPage();
expect(
screen.getByText(/Comment moderation coming soon/i),
    ).toBeInTheDocument();
  });

it('renders the documented "disabled" notice when the flag value is non-live (e.g. "disabled")', () => {
useAdminFeatureFlagMock.mockReturnValue({
isLive: false,
value: 'disabled',
isPlaceholder: false,
    });

renderPage();
expect(
screen.getByText(/Comment moderation is disabled/i),
    ).toBeInTheDocument();
  });

it('renders the documented header + list when the flag is "live"', () => {
useAdminFeatureFlagMock.mockReturnValue({
isLive: true,
value: 'live',
isPlaceholder: false,
    });

renderPage();
expect(
screen.getByRole('heading', { name: /Comment moderation/i, level: 1 }),
    ).toBeInTheDocument();
expect(screen.getByTestId('comment-reports-list')).toBeInTheDocument();
  });

it('renders the documented header + list when the flag is "enabled"', () => {
useAdminFeatureFlagMock.mockReturnValue({
isLive: true,
value: 'enabled',
isPlaceholder: false,
    });

renderPage();
expect(
screen.getByRole('heading', { name: /Comment moderation/i, level: 1 }),
    ).toBeInTheDocument();
expect(screen.getByTestId('comment-reports-list')).toBeInTheDocument();
  });

it('reads the admin_comment_moderation_live flag', () => {
renderPage();
expect(useAdminFeatureFlagMock).toHaveBeenCalledWith(
'admin_comment_moderation_live',
    );
  });
});

describe('TKT-7.6.F1 — CommentReportsPage: no service imports', () => {
it('the component source contains no axios or fetch() calls', async () => {
const { readFileSync } = await import('node:fs');
const { resolve } = await import('node:path');
const source = readFileSync(
resolve(__dirname, '..', 'CommentReportsPage.tsx'),
'utf-8',
    );
expect(source).not.toMatch(/from\s+['"]axios['"]/);
expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
expect(source).not.toMatch(/from\s+['"]@\/features\/admin\/services\/comment-moderation\.service['"]/);
  });
});