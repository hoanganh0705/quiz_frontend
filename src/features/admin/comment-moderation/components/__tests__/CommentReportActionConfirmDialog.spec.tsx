/**
 * `CommentReportActionConfirmDialog.spec.tsx` — unit tests for the
 * resolve confirm dialog.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.D2.
 *
 * Coverage contract:
 *
 *   - Reversible action (`dismiss`) renders the standard confirm
 *     dialog without a typed-confirm input; the confirm button is
 *     enabled immediately.
 *   - `hide_comment` action renders the "hides the comment + marks
 *     the report as resolved" copy.
 *   - Confirm click runs the mutation through `useResolveCommentReport`.
 *   - Cancellation calls `onClose()`.
 *   - The offending-comment summary always renders the comment id
 *     and the report reason.
 *   - The dialog renders `null` when `report` or `action` is `null`.
 *
 * The component catalog ships with no irreversible actions, so the
 * typed-confirm input branch is never exercised in this spec — if a
 * future irreversible action is added, the typed-confirm branch
 * will surface automatically through the
 * `metadata.requiresTypedConfirm` flag.
 *
 * Runs in the jsdom project because the dialog is rendered through
 * `@testing-library/react`.
 *
 * The Radix `AlertDialog` portal works in jsdom but its open/close
 * dispatch relies on pointer events. We mock the Radix family to
 * render the dialog body eagerly so the test focuses on the
 * component's contract (resolve wiring, outcomes) rather than
 * Radix's own open-state machine.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

// ─── Hook mock ──────────────────────────────────────────────────────────────

const resolveMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/comment-moderation/hooks/useResolveCommentReport', () => ({
  useResolveCommentReport: () => ({
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

// Stub the Radix AlertDialog family so the dialog body is rendered
// eagerly. The component's contract under test is its body markup.
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

// Stub the AuditActionShell primitive. The component uses the
// shell for its breadcrumb side-effects (TKT-7.1.C3); the shell's
// own suite covers that surface. Here we expose the same render-prop
// surface so the component's button wiring is exercised.
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

// ─── Helpers ────────────────────────────────────────────────────────────────

import { CommentReportActionConfirmDialog } from '@/features/admin/comment-moderation/components/CommentReportActionConfirmDialog';
import type { CommentReportDto } from '@/features/admin/comment-moderation/admin-comment-report-types';

function makeReport(overrides: Partial<CommentReportDto> = {}): CommentReportDto {
  return {
    reportId: '00000000-0000-4000-8000-000000000001',
    reporterId: 'reporter-1',
    commentId: '00000000-0000-4000-8000-000000000010',
    reason: 'spam',
    details: null,
    status: 'open',
    reviewedByUserId: null,
    reviewedAt: null,
    actionTaken: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  resolveMock.mockReset();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.6.D2 — CommentReportActionConfirmDialog', () => {
  it('renders nothing when report is null', () => {
    const { container } = render(
      <CommentReportActionConfirmDialog
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
      <CommentReportActionConfirmDialog
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
      <CommentReportActionConfirmDialog
        open
        report={makeReport()}
        action="dismiss"
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId(
        'comment-report-confirm-dialog-00000000-0000-4000-8000-000000000001',
      ),
    ).toBeInTheDocument();
    // No typed-confirm input for reversible actions.
    expect(
      screen.queryByTestId(
        'comment-report-confirm-typed-input-00000000-0000-4000-8000-000000000001',
      ),
    ).not.toBeInTheDocument();
    // Confirm button is enabled (reversible path).
    const confirm = screen.getByTestId(
      'comment-report-confirm-action-00000000-0000-4000-8000-000000000001',
    );
    expect(confirm).not.toBeDisabled();
  });

  it('renders the hide_comment copy when the action is hide_comment', () => {
    render(
      <CommentReportActionConfirmDialog
        open
        report={makeReport()}
        action="hide_comment"
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByTestId(
      'comment-report-confirm-dialog-00000000-0000-4000-8000-000000000001',
    );
    expect(dialog.textContent).toMatch(/hide.*comment/i);
    expect(dialog.textContent).toMatch(/restored/i);
  });

  it('invokes resolve() with the reportId and action', async () => {
    resolveMock.mockResolvedValue({
      reportId: '00000000-0000-4000-8000-000000000001',
      status: 'dismissed',
    });

    render(
      <CommentReportActionConfirmDialog
        open
        report={makeReport()}
        action="dismiss"
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId(
      'comment-report-confirm-action-00000000-0000-4000-8000-000000000001',
    );

    await act(async () => {
      fireEvent.click(confirm);
    });

    expect(resolveMock).toHaveBeenCalledTimes(1);
    expect(resolveMock).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000001',
      'dismiss',
    );
  });

  it('calls onClose when the cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <CommentReportActionConfirmDialog
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

  it('surfaces the offending-comment summary in the dialog body', () => {
    render(
      <CommentReportActionConfirmDialog
        open
        report={makeReport({
          commentId: '00000000-0000-4000-8000-000000000777',
          reason: 'harassment',
        })}
        action="dismiss"
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText('00000000-0000-4000-8000-000000000777'),
    ).toBeInTheDocument();
    expect(screen.getByText('harassment')).toBeInTheDocument();
  });

  it('the confirm button text matches the action label', () => {
    render(
      <CommentReportActionConfirmDialog
        open
        report={makeReport()}
        action="acknowledge"
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId(
      'comment-report-confirm-action-00000000-0000-4000-8000-000000000001',
    );
    expect(confirm.textContent).toBe('Mark as acknowledged');
  });
});
