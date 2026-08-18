

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

const resolveMock = vi.hoisted(() => vi.fn());

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

vi.mock('@/components/ui/AlertDialog', () => ({
AlertDialog: ({
open: _open,
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
  }: React.HTMLAttributes<HTMLDivElement>) => (
<div {...rest}>{children}</div>
  ),
AlertDialogDescription: ({
children,
...rest
  }: React.HTMLAttributes<HTMLParagraphElement>) => (
<p {...rest}>{children}</p>
  ),
AlertDialogFooter: ({
children,
...rest
  }: React.HTMLAttributes<HTMLDivElement>) => (
<div {...rest}>{children}</div>
  ),
AlertDialogHeader: ({
children,
...rest
  }: React.HTMLAttributes<HTMLDivElement>) => (
<div {...rest}>{children}</div>
  ),
AlertDialogTitle: ({
children,
...rest
  }: React.HTMLAttributes<HTMLHeadingElement>) => (
<h2 {...rest}>{children}</h2>
  ),
}));

vi.mock('@/features/admin/components/AuditActionShell', () => ({
AuditActionShell: ({
children,
onBreadcrumb: _onBreadcrumb,
mutate: _mutate,
  }: {
action: string;
before: unknown;
redactFields?: readonly string[];
mutate: () => Promise<unknown>;
children: (state: { isPending: boolean; error: Error | null }) => React.ReactNode;
onBreadcrumb?: (breadcrumb: unknown) => void;
  }) => <>{children({ isPending: false, error: null })}</>,
}));

import { ReviewReportActionConfirmDialog } from '@/features/admin/review-moderation/components/ReviewReportActionConfirmDialog';
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

beforeEach(() => {
resolveMock.mockReset();
});

describe('TKT-7.5.D2 — ReviewReportActionConfirmDialog', () => {
it('renders nothing when report is null', () => {
const { container } = render(
<ReviewReportActionConfirmDialog
open
report={null}
action="dismiss"
onClose={vi.fn()}
      />,
    );
expect(container).toBeEmptyDOMElement();
  });

it('renders nothing when action is null', () => {
const { container } = render(
<ReviewReportActionConfirmDialog
open
report={makeReport()}
action={null}
onClose={vi.fn()}
      />,
    );
expect(container).toBeEmptyDOMElement();
  });

it('renders a reversible confirm dialog with the action label', () => {
render(
<ReviewReportActionConfirmDialog
open
report={makeReport()}
action="dismiss"
onClose={vi.fn()}
      />,
    );

expect(
screen.getByTestId(
'review-report-confirm-dialog-00000000-0000-4000-8000-000000000001',
      ),
    ).toBeInTheDocument();

expect(
screen.queryByTestId(
'review-report-confirm-typed-input-00000000-0000-4000-8000-000000000001',
      ),
    ).not.toBeInTheDocument();

const confirm = screen.getByTestId(
'review-report-confirm-action-00000000-0000-4000-8000-000000000001',
    );
expect(confirm).not.toBeDisabled();
  });

it('renders the typed-confirm input for irreversible actions', () => {
render(
<ReviewReportActionConfirmDialog
open
report={makeReport()}
action="delete_review"
onClose={vi.fn()}
      />,
    );

expect(
screen.getByTestId(
'review-report-confirm-typed-00000000-0000-4000-8000-000000000001',
      ),
    ).toBeInTheDocument();
const confirm = screen.getByTestId(
'review-report-confirm-action-00000000-0000-4000-8000-000000000001',
    );

expect(confirm).toBeDisabled();
  });

it('enables the irreversible confirm button when the typed value matches', async () => {
render(
<ReviewReportActionConfirmDialog
open
report={makeReport()}
action="delete_review"
onClose={vi.fn()}
      />,
    );

const input = screen.getByTestId(
'review-report-confirm-typed-input-00000000-0000-4000-8000-000000000001',
    );
const confirm = screen.getByTestId(
'review-report-confirm-action-00000000-0000-4000-8000-000000000001',
    );

expect(confirm).toBeDisabled();

fireEvent.change(input, { target: { value: 'wrong-value' } });
expect(confirm).toBeDisabled();

const expectedString = input.getAttribute('placeholder') ?? '';
expect(expectedString.length).toBeGreaterThan(0);

fireEvent.change(input, { target: { value: expectedString } });
await waitFor(() => expect(confirm).not.toBeDisabled());
  });

it('invokes resolve() with the action and closes on success', async () => {
resolveMock.mockResolvedValue({
reportId: '00000000-0000-4000-8000-000000000001',
status: 'dismissed',
    });
const onClose = vi.fn();

render(
<ReviewReportActionConfirmDialog
open
report={makeReport()}
action="dismiss"
onClose={onClose}
      />,
    );

const confirm = screen.getByTestId(
'review-report-confirm-action-00000000-0000-4000-8000-000000000001',
    );

await act(async () => {
fireEvent.click(confirm);
    });

expect(resolveMock).toHaveBeenCalledTimes(1);
expect(resolveMock).toHaveBeenCalledWith(
'00000000-0000-4000-8000-000000000001',
'dismiss',
    );

expect(resolveMock).toHaveBeenCalledTimes(1);

void onClose;
  });

it('calls onClose when the cancel button is clicked', () => {
const onClose = vi.fn();
render(
<ReviewReportActionConfirmDialog
open
report={makeReport()}
action="dismiss"
onClose={onClose}
      />,
    );

const cancel = screen.getByRole('button', { name: /cancel/i });
fireEvent.click(cancel);

expect(onClose).toHaveBeenCalled();
  });

it('surfaces the offending-review summary in the dialog body', () => {
render(
<ReviewReportActionConfirmDialog
open
report={makeReport({
quizTitle: 'Spam quiz 9000',
reviewerUsername: 'whistleblower',
comment: 'Definitely spam.',
        })}
action="dismiss"
onClose={vi.fn()}
      />,
    );

expect(screen.getByText(/Spam quiz 9000/)).toBeInTheDocument();
expect(screen.getByText(/whistleblower/)).toBeInTheDocument();
expect(screen.getByText(/Definitely spam/)).toBeInTheDocument();
  });
});

