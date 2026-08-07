/**
 * `CommentVisibilityDialogs.spec.tsx` — unit tests for
 * `HideCommentDialog` and `RestoreCommentDialog`.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.D3.
 *
 * Coverage contract:
 *
 *   - Dialog renders nothing when `commentId` is null.
 *   - Dialog renders the offending-comment summary when open.
 *   - Confirm click runs the matching hook (`hide` / `restore`).
 *   - Cancel button calls `onClose`.
 *   - No typed-confirm input is rendered today (the catalogue
 *     ships with no irreversible comment-side actions).
 *
 * Runs in the jsdom project because the dialog is rendered through
 * `@testing-library/react`. The Radix family is stubbed so the
 * dialog body is rendered eagerly.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

// ─── Hook mocks ──────────────────────────────────────────────────────────────

const hideMock = vi.hoisted(() => vi.fn());
const restoreMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/admin/comment-moderation/hooks/useHideComment', () => ({
  useHideComment: () => ({
    hide: hideMock,
    isPending: false,
    error: null,
    lastOutcome: null,
    reset: vi.fn(),
    audit: { beforeCommentId: null, afterCommentId: null },
  }),
  useRestoreComment: () => ({
    restore: restoreMock,
    isPending: false,
    error: null,
    lastOutcome: null,
    reset: vi.fn(),
    audit: { beforeCommentId: null, afterCommentId: null },
  }),
}));

// Stub the Radix AlertDialog family so the dialog body is rendered
// eagerly.
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

// Stub the AuditActionShell primitive.
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

import {
  HideCommentDialog,
  RestoreCommentDialog,
} from '@/features/admin/comment-moderation/components/CommentVisibilityDialogs';

beforeEach(() => {
  hideMock.mockReset();
  restoreMock.mockReset();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.6.D3 — HideCommentDialog', () => {
  it('renders nothing when commentId is null', () => {
    const { container } = render(
      <HideCommentDialog open commentId={null} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the offending-comment summary when open', () => {
    render(
      <HideCommentDialog
        open
        commentId="00000000-0000-4000-8000-000000000010"
        threadId="00000000-0000-4000-8000-000000000020"
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText('00000000-0000-4000-8000-000000000010'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('00000000-0000-4000-8000-000000000020'),
    ).toBeInTheDocument();
  });

  it('invokes hide() with the comment id on confirm', async () => {
    hideMock.mockResolvedValueOnce({ commentId: 'c-1', hidden: true });

    render(
      <HideCommentDialog
        open
        commentId="00000000-0000-4000-8000-000000000010"
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId(
      'comment-hide-confirm-action-00000000-0000-4000-8000-000000000010',
    );

    await act(async () => {
      fireEvent.click(confirm);
    });

    expect(hideMock).toHaveBeenCalledTimes(1);
    expect(hideMock).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000010',
    );
  });

  it('calls onClose when the cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <HideCommentDialog
        open
        commentId="00000000-0000-4000-8000-000000000010"
        onClose={onClose}
      />,
    );

    const cancel = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancel);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not render a typed-confirm input (catalogue has no irreversible entries)', () => {
    render(
      <HideCommentDialog
        open
        commentId="00000000-0000-4000-8000-000000000010"
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId(
        'comment-hide-confirm-typed-input-00000000-0000-4000-8000-000000000010',
      ),
    ).not.toBeInTheDocument();
  });
});

describe('TKT-7.6.D3 — RestoreCommentDialog', () => {
  it('renders nothing when commentId is null', () => {
    const { container } = render(
      <RestoreCommentDialog open commentId={null} onClose={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the offending-comment summary when open', () => {
    render(
      <RestoreCommentDialog
        open
        commentId="00000000-0000-4000-8000-000000000010"
        threadId="00000000-0000-4000-8000-000000000020"
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByText('00000000-0000-4000-8000-000000000010'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('00000000-0000-4000-8000-000000000020'),
    ).toBeInTheDocument();
  });

  it('invokes restore() with the comment id on confirm', async () => {
    restoreMock.mockResolvedValueOnce({ commentId: 'c-1', hidden: false });

    render(
      <RestoreCommentDialog
        open
        commentId="00000000-0000-4000-8000-000000000010"
        onClose={vi.fn()}
      />,
    );

    const confirm = screen.getByTestId(
      'comment-restore-confirm-action-00000000-0000-4000-8000-000000000010',
    );

    await act(async () => {
      fireEvent.click(confirm);
    });

    expect(restoreMock).toHaveBeenCalledTimes(1);
    expect(restoreMock).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000010',
    );
  });

  it('calls onClose when the cancel button is clicked', () => {
    const onClose = vi.fn();
    render(
      <RestoreCommentDialog
        open
        commentId="00000000-0000-4000-8000-000000000010"
        onClose={onClose}
      />,
    );

    const cancel = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancel);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not render a typed-confirm input (catalogue has no irreversible entries)', () => {
    render(
      <RestoreCommentDialog
        open
        commentId="00000000-0000-4000-8000-000000000010"
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId(
        'comment-restore-confirm-typed-input-00000000-0000-4000-8000-000000000010',
      ),
    ).not.toBeInTheDocument();
  });
});
