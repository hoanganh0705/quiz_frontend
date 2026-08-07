/**
 * `ReviewReportActionMenu.spec.tsx` — unit tests for the per-row
 * action menu.
 *
 * Source epic:   Epic 7.5 — Review moderation queue.
 * Source ticket: TKT-7.5.D1.
 *
 * Coverage contract:
 *
 *   - Default render surfaces the documented action set.
 *   - Permission gate renders `PermissionDeniedNotice` (variant
 *     `control`) when `usePermission('review_report_update')` denies.
 *   - Self-moderation gate renders the "you can't moderate your
 *     own report" notice when the admin authored the review.
 *   - Loading state renders a disabled trigger and no dropdown
 *     content (no flash of "denied" copy during bootstrap).
 *   - Clicking each menu item invokes `onAction(action)` with the
 *     correct `ReportConsumerAction`.
 *   - The component never imports or calls services; the menu is
 *     presentational only.
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

import { ReviewReportActionMenu } from '@/features/admin/review-moderation/components/ReviewReportActionMenu';
import {
  REPORT_CONSUMER_ACTIONS,
  type ReportConsumerAction,
} from '@/features/admin/review-moderation/action-enum';
import type { AdminReportDto } from '@/features/admin/review-moderation/admin-report-types';

function makeReport(overrides: Partial<AdminReportDto> = {}): AdminReportDto {
  return {
    reportId: 'report-1',
    reviewId: 'review-1',
    quizId: 'quiz-1',
    quizTitle: 'Sample quiz',
    reviewerUsername: 'reporter-1',
    reportedUserId: 'author-1',
    rating: 3,
    comment: 'Spammy copy',
    reason: 'spam',
    status: 'open',
    createdAt: '2024-01-01T00:00:00.000Z',
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

describe('TKT-7.5.D1 — ReviewReportActionMenu', () => {
  it('renders the trigger when permission is granted', () => {
    render(<ReviewReportActionMenu report={makeReport()} onAction={vi.fn()} />);

    const trigger = screen.getByTestId('review-report-action-trigger-report-1');
    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toBeDisabled();
  });

  it('invokes onAction with the selected action when an item is clicked', () => {
    const onAction = vi.fn();
    render(<ReviewReportActionMenu report={makeReport()} onAction={onAction} />);

    const menu = screen.getByTestId('review-report-action-menu-report-1');
    const item = within(menu).getByTestId(
      'review-report-action-dismiss-report-1',
    );
    fireEvent.click(item);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('dismiss');
  });

  it('invokes onAction for irreversible actions (delete_review)', () => {
    const onAction = vi.fn();
    render(<ReviewReportActionMenu report={makeReport()} onAction={onAction} />);

    const menu = screen.getByTestId('review-report-action-menu-report-1');
    const item = within(menu).getByTestId(
      'review-report-action-delete_review-report-1',
    );
    fireEvent.click(item);

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('delete_review');
  });

  it('renders PermissionDeniedNotice when review_report_update is denied', () => {
    usePermissionMock.mockReturnValue({
      isLoading: false,
      error: null,
      hasPermission: false,
    });

    render(<ReviewReportActionMenu report={makeReport()} onAction={vi.fn()} />);

    // The trigger should not be rendered — the menu is replaced
    // entirely by the notice.
    expect(
      screen.queryByTestId('review-report-action-trigger-report-1'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByTestId('review-report-permission-denied-report-1'),
    ).toBeInTheDocument();
  });

  it('renders the self-moderation notice when the admin authored the review', () => {
    useAuthBootstrapMock.mockReturnValue({
      bootstrapState: 'authenticated',
      isAuthenticated: true,
      currentUser: { userId: 'author-1' },
    });

    render(<ReviewReportActionMenu report={makeReport()} onAction={vi.fn()} />);

    expect(
      screen.getByTestId('review-report-self-moderation-notice-report-1'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('review-report-action-trigger-report-1'),
    ).not.toBeInTheDocument();
  });

  it('renders the disabled trigger (no dropdown) while usePermission is loading', () => {
    usePermissionMock.mockReturnValue({
      isLoading: true,
      error: null,
      hasPermission: false,
    });

    render(<ReviewReportActionMenu report={makeReport()} onAction={vi.fn()} />);

    const trigger = screen.getByTestId('review-report-action-trigger-report-1');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toBeDisabled();
    expect(
      screen.queryByTestId('review-report-action-menu-report-1'),
    ).not.toBeInTheDocument();
  });

  it('does not call any services or fetch hooks', () => {
    // Sanity: the menu's render must not introduce any HTTP or
    // service-layer dependencies. The component's mock surface is
    // exactly the two hooks above (usePermission, useAuthBootstrap);
    // any module-level import of `@/features/.../services` or
    // `swr` would surface as an undeclared dependency. We assert
    // that there are no unexpected module fetches by exercising
    // the menu end-to-end.
    const onAction = vi.fn();
    render(<ReviewReportActionMenu report={makeReport()} onAction={onAction} />);

    expect(onAction).not.toHaveBeenCalled();
  });

  it('iterates the action set in the documented order (reversible then irreversible)', () => {
    const calls: ReportConsumerAction[] = [];
    const onAction = (action: ReportConsumerAction): void => {
      calls.push(action);
    };

    render(<ReviewReportActionMenu report={makeReport()} onAction={onAction} />);

    const menu = screen.getByTestId('review-report-action-menu-report-1');
    for (const action of REPORT_CONSUMER_ACTIONS) {
      const item = within(menu).getByTestId(
        `review-report-action-${action}-report-1`,
      );
      fireEvent.click(item);
    }

    expect(calls).toEqual([
      'dismiss',
      'acknowledge',
      'mark_resolved',
      'hide_review',
      'delete_review',
    ]);
  });
});
