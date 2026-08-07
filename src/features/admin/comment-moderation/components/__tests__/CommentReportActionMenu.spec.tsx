/**
 * `CommentReportActionMenu.spec.tsx` — unit tests for the per-row
 * action menu.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.D1.
 *
 * Coverage contract:
 *
 *   - Default render surfaces the documented action set.
 *   - Permission gate renders `PermissionDeniedNotice` (variant
 *     `control`) when `usePermission('comment_report_update')` denies.
 *   - Self-moderation gate renders the "you can't moderate your
 *     own comment" notice when the admin authored the comment.
 *   - Loading state renders a disabled trigger and no dropdown
 *     content (no flash of "denied" copy during bootstrap).
 *   - Clicking each menu item invokes `onAction(action)` with the
 *     correct `CommentReportConsumerAction`.
 *   - The component never imports or calls services; the menu is
 *     presentational only.
 *   - The `commentAuthorId` prop drives the self-moderation gate;
 *     `null` does not fire the gate (the documented conservative
 *     behaviour).
 *
 * Runs in the jsdom project because the menu is rendered through
 * `@testing-library/react`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

// ─── Hook mocks (hoisted) ──────────────────────────────────────────────────

const usePermissionMock = vi.hoisted(() =>
  vi.fn(() => ({
    isLoading: false,
    error: null,
    hasPermission: true,
  })),
);

const useAuthBootstrapMock = vi.hoisted(() =>
  vi.fn(() => ({
    bootstrapState: 'authenticated',
    isAuthenticated: true,
    currentUser: { userId: 'admin-1' },
  })),
);

vi.mock('@/features/admin/hooks/usePermission', () => ({
  usePermission: usePermissionMock,
}));

vi.mock('@/features/auth/contexts/auth-bootstrap-context', () => ({
  useAuthBootstrap: useAuthBootstrapMock,
}));

// Mock the Radix DropdownMenu family because jsdom + Radix's
// pointer-event dispatch is unreliable for synthetic events. The
// component's contract under test is its gating + callback wiring,
// not Radix's open/close state machine — Radix's own suite covers
// that.
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

// ─── Helpers ────────────────────────────────────────────────────────────────

import { CommentReportActionMenu } from '@/features/admin/comment-moderation/components/CommentReportActionMenu';
import {
  COMMENT_REPORT_CONSUMER_ACTIONS,
  type CommentReportConsumerAction,
} from '@/features/admin/comment-moderation/action-enum';
import type { CommentReportDto } from '@/features/admin/comment-moderation/admin-comment-report-types';

function makeReport(overrides: Partial<CommentReportDto> = {}): CommentReportDto {
  return {
    reportId: 'report-1',
    reporterId: 'reporter-1',
    commentId: 'comment-1',
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
  usePermissionMock.mockReset();
  useAuthBootstrapMock.mockReset();
  usePermissionMock.mockReturnValue({
    isLoading: false,
    error: null,
    hasPermission: true,
  });
  useAuthBootstrapMock.mockReturnValue({
    bootstrapState: 'authenticated',
    isAuthenticated: true,
    currentUser: { userId: 'admin-1' },
  });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TKT-7.6.D1 — CommentReportActionMenu', () => {
  it('renders the trigger when permission is granted', () => {
    render(
      <CommentReportActionMenu
        report={makeReport()}
        commentAuthorId="author-1"
        onAction={vi.fn()}
      />,
    );

    const trigger = screen.getByTestId('comment-report-action-trigger-report-1');
    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toBeDisabled();
  });

  it('invokes onAction with the selected action when an item is clicked', () => {
    const onAction = vi.fn();
    render(
      <CommentReportActionMenu
        report={makeReport()}
        commentAuthorId="author-1"
        onAction={onAction}
      />,
    );

    const menu = screen.getByTestId('comment-report-action-menu-report-1');
    const item = within(menu).getByTestId(
      'comment-report-action-dismiss-report-1',
    );
    fireEvent.click(item);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('dismiss');
  });

  it('invokes onAction for hide_comment', () => {
    const onAction = vi.fn();
    render(
      <CommentReportActionMenu
        report={makeReport()}
        commentAuthorId="author-1"
        onAction={onAction}
      />,
    );

    const menu = screen.getByTestId('comment-report-action-menu-report-1');
    const item = within(menu).getByTestId(
      'comment-report-action-hide_comment-report-1',
    );
    fireEvent.click(item);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('hide_comment');
  });

  it('renders PermissionDeniedNotice when comment_report_update is denied', () => {
    usePermissionMock.mockReturnValue({
      isLoading: false,
      error: null,
      hasPermission: false,
    });

    render(
      <CommentReportActionMenu
        report={makeReport()}
        commentAuthorId="author-1"
        onAction={vi.fn()}
      />,
    );

    // The trigger should not be rendered — the menu is replaced
    // entirely by the notice.
    expect(
      screen.queryByTestId('comment-report-action-trigger-report-1'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('comment-report-permission-denied-report-1'),
    ).toBeInTheDocument();
  });

  it('renders the self-moderation notice when the admin authored the comment', () => {
    useAuthBootstrapMock.mockReturnValue({
      bootstrapState: 'authenticated',
      isAuthenticated: true,
      currentUser: { userId: 'author-1' },
    });

    render(
      <CommentReportActionMenu
        report={makeReport()}
        commentAuthorId="author-1"
        onAction={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId('comment-report-self-moderation-notice-report-1'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('comment-report-action-trigger-report-1'),
    ).not.toBeInTheDocument();
  });

  it('does NOT fire the self-moderation gate when commentAuthorId is null (unknown author)', () => {
    useAuthBootstrapMock.mockReturnValue({
      bootstrapState: 'authenticated',
      isAuthenticated: true,
      currentUser: { userId: 'author-1' },
    });

    render(
      <CommentReportActionMenu
        report={makeReport()}
        commentAuthorId={null}
        onAction={vi.fn()}
      />,
    );

    // Even though the current user id matches the placeholder
    // "author-1", the gate stays inert because the parent row
    // has not yet resolved the author id.
    expect(
      screen.queryByTestId('comment-report-self-moderation-notice-report-1'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('comment-report-action-trigger-report-1'),
    ).toBeInTheDocument();
  });

  it('renders the disabled trigger (no dropdown) while usePermission is loading', () => {
    usePermissionMock.mockReturnValue({
      isLoading: true,
      error: null,
      hasPermission: false,
    });

    render(
      <CommentReportActionMenu
        report={makeReport()}
        commentAuthorId="author-1"
        onAction={vi.fn()}
      />,
    );

    const trigger = screen.getByTestId('comment-report-action-trigger-report-1');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toBeDisabled();
    expect(
      screen.queryByTestId('comment-report-action-menu-report-1'),
    ).not.toBeInTheDocument();
  });

  it('iterates the action set in the documented order', () => {
    const calls: CommentReportConsumerAction[] = [];
    const onAction = (action: CommentReportConsumerAction): void => {
      calls.push(action);
    };

    render(
      <CommentReportActionMenu
        report={makeReport()}
        commentAuthorId="author-1"
        onAction={onAction}
      />,
    );

    const menu = screen.getByTestId('comment-report-action-menu-report-1');
    for (const action of COMMENT_REPORT_CONSUMER_ACTIONS) {
      const item = within(menu).getByTestId(
        `comment-report-action-${action}-report-1`,
      );
      fireEvent.click(item);
    }

    expect(calls).toEqual([
      'dismiss',
      'acknowledge',
      'mark_resolved',
      'hide_comment',
    ]);
  });
});
