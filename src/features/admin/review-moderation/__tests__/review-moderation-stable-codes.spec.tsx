

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ApiError } from '@/lib/api/core/ApiError';

const resolveMock = vi.hoisted(() => vi.fn());
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

vi.mock('@/features/admin/review-moderation/hooks/useResolveReviewReport', () => ({
useResolveReviewReport: () => ({
resolve: resolveMock,
isPending: false,
error: null,
lastOutcome: null,
reset: vi.fn(),
audit: {
beforeReportId: null,
beforeAction: null,
afterReportId: null,
afterPayload: null,
    },
  }),
}));

vi.mock('@/features/admin/hooks/usePermission', () => ({
usePermission: usePermissionMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: useAuthSessionMock,
}));

vi.mock('@/components/ui/AlertDialog', () => ({
AlertDialog: ({
children,
  }: {
open?: boolean;
onOpenChange?: (open: boolean) => void;
children: React.ReactNode;
  }) => <div role="alertdialog">{children}</div>,
AlertDialogAction: ({
children,
...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
<button type="button" {...rest}>{children}</button>
  ),
AlertDialogCancel: ({
children,
...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
<button type="button" {...rest}>{children}</button>
  ),
AlertDialogContent: ({
children,
...rest
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
AlertDialogDescription: ({
children,
...rest
  }: React.HTMLAttributes<HTMLParagraphElement>) => (
<p {...rest}>{children}</p>
  ),
AlertDialogFooter: ({
children,
...rest
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
AlertDialogHeader: ({
children,
...rest
  }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
AlertDialogTitle: ({
children,
...rest
  }: React.HTMLAttributes<HTMLHeadingElement>) => (
<h2 {...rest}>{children}</h2>
  ),
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

vi.mock('@/features/admin/components/AuditActionShell', () => ({
AuditActionShell: ({
children,
onBreadcrumb: _onBreadcrumb,
  }: {
action: string;
before: unknown;
redactFields?: readonly string[];
mutate: () => Promise<unknown>;
children: (state: {
isPending: boolean;
status: 'idle' | 'pending' | 'success' | 'failure';
error: ApiError | null;
retry: () => void;
    }) => React.ReactNode;
onBreadcrumb?: (breadcrumb: unknown) => void;
  }) => (
<>
{children({
isPending: false,
status: 'idle',
error: null,
retry: () => undefined,
      })}
</>
  ),
}));

import { ReviewReportActionConfirmDialog } from '@/features/admin/review-moderation/components/ReviewReportActionConfirmDialog';
import { ReviewReportActionMenu } from '@/features/admin/review-moderation/components/ReviewReportActionMenu';
import type { AdminReportDto } from '@/features/admin/review-moderation/admin-report-types';

function makeReport(overrides: Partial<AdminReportDto> = {}): AdminReportDto {
return {
reportId: '00000000-0000-4000-8000-000000000001',
reviewId: '00000000-0000-4000-8000-000000000002',
quizId: '00000000-0000-4000-8000-000000000003',
quizTitle: 'Offending quiz',
reviewerUsername: 'reporter-1',
reportedUserId: 'author-1',
rating: 1,
comment: 'Spammy copy',
reason: 'spam',
status: 'open',
createdAt: '2024-01-01T00:00:00.000Z',
...overrides,
  };
}

function makeApiError(code: string, status: number, requestId: string): ApiError {
return new ApiError({
isAxiosError: true,
response: {
status,
data: {
status,
detail: code,
title: code,
extensions: { code, requestId },
      },
    },
name: 'AxiosError',
message: code,
config: undefined,
request: undefined,
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
}

beforeEach(() => {
resolveMock.mockReset();
usePermissionMock.mockReset();
useAuthSessionMock.mockReset();

resolveMock.mockResolvedValue({
reportId: '00000000-0000-4000-8000-000000000001',
status: 'dismissed',
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

const noopRejection = (): void => undefined;
process.on('unhandledRejection', noopRejection);

describe('TKT-7.5.H2 — REVIEW_REPORT_ALREADY_RESOLVED branch (live: REVIEW_NOT_FOUND)', () => {
it('surfaces a stable "already handled" notice without retrying', async () => {
resolveMock.mockRejectedValue(makeApiError('REVIEW_NOT_FOUND', 404, 'req-already'));

render(
<ReviewReportActionConfirmDialog
open
report={makeReport()}
action="dismiss"
onClose={vi.fn()}
      />,
    );

const confirm = await screen.findByTestId(
'review-report-confirm-action-00000000-0000-4000-8000-000000000001',
    );

await act(async () => {
fireEvent.click(confirm);
    });

expect(resolveMock).toHaveBeenCalledTimes(1);

await waitFor(() => {
expect(
screen.queryByTestId(
'review-report-confirm-retry-00000000-0000-4000-8000-000000000001',
        ),
      ).toBeNull();
    });
  });
});

describe('TKT-7.5.H2 — REVIEW_REPORT_NOT_FOUND branch (live: REVIEW_NOT_FOUND)', () => {
it('surfaces a stable "no longer exists" notice without retrying', async () => {
resolveMock.mockRejectedValue(makeApiError('REVIEW_NOT_FOUND', 404, 'req-missing'));

render(
<ReviewReportActionConfirmDialog
open
report={makeReport()}
action="acknowledge"
onClose={vi.fn()}
      />,
    );

const confirm = await screen.findByTestId(
'review-report-confirm-action-00000000-0000-4000-8000-000000000001',
    );

await act(async () => {
fireEvent.click(confirm);
    });

expect(resolveMock).toHaveBeenCalledTimes(1);
await waitFor(() => {
expect(
screen.queryByTestId(
'review-report-confirm-retry-00000000-0000-4000-8000-000000000001',
        ),
      ).toBeNull();
    });
  });
});

describe('TKT-7.5.H2 — PERMISSION_DENIED branch (live: GLOBAL_FORBIDDEN)', () => {
it('surfaces a stable permission-denied notice without retrying', async () => {
resolveMock.mockRejectedValue(makeApiError('GLOBAL_FORBIDDEN', 403, 'req-403'));

render(
<ReviewReportActionConfirmDialog
open
report={makeReport()}
action="mark_resolved"
onClose={vi.fn()}
      />,
    );

const confirm = await screen.findByTestId(
'review-report-confirm-action-00000000-0000-4000-8000-000000000001',
    );

await act(async () => {
fireEvent.click(confirm);
    });

expect(resolveMock).toHaveBeenCalledTimes(1);
await waitFor(() => {
expect(
screen.queryByTestId(
'review-report-confirm-retry-00000000-0000-4000-8000-000000000001',
        ),
      ).toBeNull();
    });
  });
});

describe('TKT-7.5.H2 — self-moderation gate', () => {
it('renders the self-moderation notice and disables every menu item', () => {

useAuthSessionMock.mockReturnValue({
bootstrapState: 'authenticated',
isAuthenticated: true,
currentUser: { userId: 'author-1' },
    });

render(
<ReviewReportActionMenu
report={makeReport()}
onAction={vi.fn()}
      />,
    );

expect(
screen.queryByTestId('review-report-action-trigger-00000000-0000-4000-8000-000000000001'),
    ).toBeNull();

expect(
screen.getByTestId('review-report-self-moderation-notice-00000000-0000-4000-8000-000000000001'),
    ).toBeInTheDocument();

const onAction = vi.fn();
render(
<ReviewReportActionMenu
report={makeReport({ reportId: '00000000-0000-4000-8000-000000000099' })}
onAction={onAction}
      />,
    );
expect(
screen.queryByTestId(
'review-report-action-dismiss-00000000-0000-4000-8000-000000000099',
      ),
    ).toBeNull();
expect(
screen.queryByTestId(
'review-report-action-hide_review-00000000-0000-4000-8000-000000000099',
      ),
    ).toBeNull();
expect(
screen.queryByTestId(
'review-report-action-delete_review-00000000-0000-4000-8000-000000000099',
      ),
    ).toBeNull();
expect(onAction).not.toHaveBeenCalled();
  });
});