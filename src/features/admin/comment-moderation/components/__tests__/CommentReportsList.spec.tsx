

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { CommentReportsList } from '@/features/admin/comment-moderation/components/CommentReportsList';
import type {
CommentReportConsumerAction,
} from '@/features/admin/comment-moderation/action-enum';
import type {
CommentReportDto,
CommentReportState,
} from '@/features/admin/comment-moderation/admin-comment-report-types';
import { ApiError } from '@/lib/api';

interface UseCommentReportsMockReturn {
items: CommentReportDto[];
isLoading: boolean;
isLoadingMore: boolean;
hasMore: boolean;
loadMore: () => Promise<void>;
error: ApiError | null;
refresh: () => Promise<void>;
retryBannerVisible: boolean;
show: 'pending' | 'resolved';
setShow: (next: 'pending' | 'resolved') => void;
}

const useCommentReportsMock = vi.hoisted(() =>
vi.fn<() => UseCommentReportsMockReturn>(() => ({
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
  })),
);

vi.mock('@/features/admin/comment-moderation/hooks/useCommentReports', () => ({
useCommentReports: useCommentReportsMock,
}));

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

vi.mock('@/features/admin/comment-moderation/hooks/useComment', () => ({
useComment: (params: { commentId: string }) => useCommentMock(params),
}));

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

vi.mock('@/features/admin/hooks/usePermission', () => ({
usePermission: usePermissionMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: useAuthSessionMock,
}));

vi.mock('@/components/ui/DropdownMenu', () => ({
DropdownMenu: ({ children }: { children: React.ReactNode }) => <>{children}</>,
DropdownMenuTrigger: ({
children,
asChild: _asChild,
...rest
  }: React.HTMLAttributes<HTMLElement> & {
children: React.ReactNode;
asChild?: boolean;
  }) => <button type="button" {...rest}>{children}</button>,
DropdownMenuContent: ({
children,
...rest
  }: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode }) => (
<div role="menu" {...rest}>{children}</div>
  ),
DropdownMenuItem: ({
children,
onClick,
onSelect: _onSelect,
...rest
  }: React.HTMLAttributes<HTMLDivElement> & {
children: React.ReactNode;
onClick?: React.MouseEventHandler<HTMLDivElement>;
onSelect?: (event: Event) => void;
  }) => (
<div role="menuitem" tabIndex={0} onClick={onClick} {...rest}>{children}</div>
  ),
DropdownMenuSeparator: () => <hr role="separator" />,
}));

function makeReport(
overrides: Partial<CommentReportDto> & { status: CommentReportState },
): CommentReportDto {
return {
reportId: overrides.reportId ?? 'r-1',
reporterId: overrides.reporterId ?? 'reporter-1',
commentId: overrides.commentId ?? '00000000-0000-4000-8000-000000000001',
reason: overrides.reason ?? 'spam',
details: overrides.details ?? null,
status: overrides.status,
reviewedByUserId: overrides.reviewedByUserId ?? null,
reviewedAt: overrides.reviewedAt ?? null,
actionTaken: overrides.actionTaken ?? false,
createdAt: overrides.createdAt ?? '2024-01-01T10:00:00.000Z',
updatedAt: overrides.updatedAt ?? '2024-01-01T11:00:00.000Z',
  };
}

function renderList() {
return render(
<SWRConfig value={{ provider: () => new Map() }}>
<CommentReportsList />
</SWRConfig>,
  );
}

beforeEach(() => {
vi.clearAllMocks();
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

describe('TKT-7.6.E3 — CommentReportsList: tab / filter wiring', () => {
it('renders the show toggle with the pending tab active by default', () => {
renderList();
const tab = screen.getByTestId('comment-reports-list-tab-pending');
expect(tab).toHaveAttribute('aria-selected', 'true');
const resolvedTab = screen.getByTestId('comment-reports-list-tab-resolved');
expect(resolvedTab).toHaveAttribute('aria-selected', 'false');
  });

it('reflects the resolved show state when the hook reports show="resolved"', () => {
useCommentReportsMock.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(async () => undefined),
error: null,
refresh: vi.fn(async () => undefined),
retryBannerVisible: false,
show: 'resolved',
setShow: vi.fn(),
    });

renderList();
expect(
screen.getByTestId('comment-reports-list-tab-resolved'),
    ).toHaveAttribute('aria-selected', 'true');
  });

it('clicking the resolved tab invokes setShow("resolved")', () => {
const setShow = vi.fn();
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
setShow,
    });

renderList();
fireEvent.click(screen.getByTestId('comment-reports-list-tab-resolved'));
expect(setShow).toHaveBeenCalledWith('resolved');
  });
});

describe('TKT-7.6.E3 — CommentReportsList: row rendering', () => {
it('renders pending rows when items are present and show=pending', () => {
useCommentReportsMock.mockReturnValue({
items: [
makeReport({ reportId: 'r-1', status: 'open' }),
makeReport({ reportId: 'r-2', status: 'open' }),
      ],
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

renderList();
expect(screen.getByTestId('comment-report-row-r-1')).toBeInTheDocument();
expect(screen.getByTestId('comment-report-row-r-2')).toBeInTheDocument();
  });

it('renders the skeleton when isLoading is true', () => {
useCommentReportsMock.mockReturnValue({
items: [],
isLoading: true,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(async () => undefined),
error: null,
refresh: vi.fn(async () => undefined),
retryBannerVisible: false,
show: 'pending',
setShow: vi.fn(),
    });

renderList();
expect(
screen.getByTestId('comment-report-skeleton-list'),
    ).toBeInTheDocument();
  });

it('renders the empty state when items=[] and isLoading=false', () => {
renderList();
expect(
screen.getByTestId('comment-reports-list-empty-pending'),
    ).toBeInTheDocument();
  });

it('renders the empty state without the resolved CTA when filter is "resolved"', () => {
useCommentReportsMock.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(async () => undefined),
error: null,
refresh: vi.fn(async () => undefined),
retryBannerVisible: false,
show: 'resolved',
setShow: vi.fn(),
    });

renderList();
expect(
screen.getByTestId('comment-reports-list-empty-resolved'),
    ).toBeInTheDocument();
expect(
screen.queryByRole('button', { name: /View resolved reports/i }),
    ).not.toBeInTheDocument();
  });

it('renders the error state with a retry affordance', () => {
const refresh = vi.fn(async () => undefined);
const error = new ApiError({
isAxiosError: true,
response: {
status: 500,
data: {
status: 500,
detail: 'GLOBAL_INTERNAL_ERROR',
title: 'GLOBAL_INTERNAL_ERROR',
extensions: { code: 'GLOBAL_INTERNAL_ERROR', requestId: 'req-1' },
        },
      },
name: 'AxiosError',
message: 'GLOBAL_INTERNAL_ERROR',
config: undefined,
request: undefined,
toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
useCommentReportsMock.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(async () => undefined),
error,
refresh,
retryBannerVisible: false,
show: 'pending',
setShow: vi.fn(),
    });

renderList();
expect(screen.getByTestId('comment-reports-list-error')).toBeInTheDocument();
fireEvent.click(screen.getByTestId('comment-reports-list-retry'));
expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('TKT-7.6.E3 — CommentReportsList: row selection', () => {
it('selecting a row opens the side panel', () => {
useCommentReportsMock.mockReturnValue({
items: [makeReport({ reportId: 'r-1', status: 'open' })],
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

renderList();
fireEvent.click(screen.getByTestId('comment-report-row-r-1'));
const row = screen.getByTestId('comment-report-row-r-1');
expect(row).toHaveAttribute('aria-selected', 'true');
expect(
screen.getByTestId('comment-reports-side-panel-r-1'),
    ).toBeInTheDocument();
  });

it('selecting the same row again closes the side panel', () => {
useCommentReportsMock.mockReturnValue({
items: [makeReport({ reportId: 'r-1', status: 'open' })],
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

renderList();
fireEvent.click(screen.getByTestId('comment-report-row-r-1'));
fireEvent.click(screen.getByTestId('comment-report-row-r-1'));
expect(
screen.queryByTestId('comment-reports-side-panel-r-1'),
    ).not.toBeInTheDocument();
  });
});

describe('TKT-7.6.E3 — CommentReportsList: action selection', () => {
it('action selection mounts the confirm dialog with the chosen action', () => {
useCommentReportsMock.mockReturnValue({
items: [makeReport({ reportId: 'r-1', status: 'open' })],
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

renderList();
fireEvent.click(screen.getByTestId('comment-report-row-r-1'));
fireEvent.click(
screen.getByTestId('comment-report-action-dismiss-r-1'),
    );

expect(
screen.getByTestId('comment-report-confirm-dialog-r-1'),
    ).toBeInTheDocument();
  });
});

describe('TKT-7.6.E3 — CommentReportsList: pagination', () => {
it('renders the "load more" button when hasMore=true', () => {
useCommentReportsMock.mockReturnValue({
items: [makeReport({ reportId: 'r-1', status: 'open' })],
isLoading: false,
isLoadingMore: false,
hasMore: true,
loadMore: vi.fn(async () => undefined),
error: null,
refresh: vi.fn(async () => undefined),
retryBannerVisible: false,
show: 'pending',
setShow: vi.fn(),
    });

renderList();
expect(
screen.getByTestId('comment-reports-list-load-more-button'),
    ).toBeInTheDocument();
  });

it('clicking "load more" invokes loadMore exactly once', async () => {
const loadMore = vi.fn(async () => undefined);
useCommentReportsMock.mockReturnValue({
items: [makeReport({ reportId: 'r-1', status: 'open' })],
isLoading: false,
isLoadingMore: false,
hasMore: true,
loadMore,
error: null,
refresh: vi.fn(async () => undefined),
retryBannerVisible: false,
show: 'pending',
setShow: vi.fn(),
    });

renderList();
await act(async () => {
fireEvent.click(
screen.getByTestId('comment-reports-list-load-more-button'),
      );
    });
await waitFor(() => {
expect(loadMore).toHaveBeenCalledTimes(1);
    });
  });

it('does not render the "load more" button when hasMore=false', () => {
useCommentReportsMock.mockReturnValue({
items: [makeReport({ reportId: 'r-1', status: 'open' })],
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

renderList();
expect(
screen.queryByTestId('comment-reports-list-load-more-button'),
    ).not.toBeInTheDocument();
  });
});

describe('TKT-7.6.E3 — CommentReportsList: filter switch clears selection', () => {
it('switching to the resolved tab clears the selected row', () => {
useCommentReportsMock.mockReturnValue({
items: [makeReport({ reportId: 'r-1', status: 'open' })],
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

const { rerender } = render(
<SWRConfig value={{ provider: () => new Map() }}>
<CommentReportsList />
</SWRConfig>,
    );
fireEvent.click(screen.getByTestId('comment-report-row-r-1'));
expect(
screen.getByTestId('comment-reports-side-panel-r-1'),
    ).toBeInTheDocument();

useCommentReportsMock.mockReturnValue({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(async () => undefined),
error: null,
refresh: vi.fn(async () => undefined),
retryBannerVisible: false,
show: 'resolved',
setShow: vi.fn(),
    });
rerender(
<SWRConfig value={{ provider: () => new Map() }}>
<CommentReportsList />
</SWRConfig>,
    );
expect(
screen.queryByTestId('comment-reports-side-panel-r-1'),
    ).not.toBeInTheDocument();
  });
});

describe('TKT-7.6.E3 — CommentReportsList: no service imports', () => {
it('the component source contains no axios or fetch() calls', async () => {
const { readFileSync } = await import('node:fs');
const { resolve } = await import('node:path');
const source = readFileSync(
resolve(__dirname, '..', 'CommentReportsList.tsx'),
'utf-8',
    );
expect(source).not.toMatch(/from\s+['"]axios['"]/);
expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
expect(source).not.toMatch(/from\s+['"]@\/features\/admin\/services\/comment-moderation\.service['"]/);
  });
});

void (null as unknown as CommentReportConsumerAction);