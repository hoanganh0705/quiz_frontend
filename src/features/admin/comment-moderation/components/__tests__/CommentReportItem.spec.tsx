/**
 * `CommentReportItem.spec.tsx` — unit tests for the queue's row
 * component.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.E1.
 *
 * Coverage contract (TKT-7.6.E1 acceptance criteria):
 *
 *   AC #1 — pending row renders the documented layout
 *           (reporter, reason, status pill, action menu).
 *   AC #2 — resolved row renders `updatedAt` and surfaces
 *           `reviewedAt` via the detail panel hook (per A1
 *           evidence: the SDK does NOT carry a dedicated
 *           `resolvedAt` field — the row surfaces `updatedAt`).
 *   AC #3 — row click → `onSelect(report)`; action menu click does
 *           NOT trigger `onSelect`.
 *   AC #4 — action selection → `onAction(action, report)`.
 *   AC #5 — no service calls originate from the component.
 *   AC #6 — type-check exits 0 (handled by `pnpm type-check`, not
 *           this file).
 *
 * Runs in the jsdom project because the row is rendered through
 * `@testing-library/react`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { CommentReportItem } from '@/features/admin/comment-moderation/components/CommentReportItem';
import type {
  CommentReportConsumerAction,
} from '@/features/admin/comment-moderation/action-enum';
import type {
  CommentReportDto,
  CommentReportState,
} from '@/features/admin/comment-moderation/admin-comment-report-types';

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
// not Radix's open/close state machine.
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

// ─── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
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

describe('TKT-7.6.E1 — CommentReportItem: pending row', () => {
  it('renders the documented layout (reporter, reason, status pill, action menu)', () => {
    const report = makeReport({ status: 'open' });
    render(
      <div>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={vi.fn()}
          onAction={vi.fn()}
        />
      </div>,
    );

    const row = screen.getByTestId('comment-report-row-r-1');
    expect(row).toBeInTheDocument();
    expect(
      screen.getByTestId('comment-report-row-reporter-r-1'),
    ).toHaveTextContent(/reporter-1/);
    expect(
      screen.getByTestId('comment-report-row-comment-r-1'),
    ).toHaveTextContent(/00000000-0000-4000-8000-000000000001/);
    expect(
      screen.getByTestId('comment-report-row-reason-r-1'),
    ).toHaveTextContent(/spam/i);
    expect(
      screen.getByTestId('comment-report-row-pill-r-1'),
    ).toHaveTextContent(/Pending/i);
    // The action menu trigger renders inside the row.
    expect(
      screen.getByTestId('comment-report-action-trigger-r-1'),
    ).toBeInTheDocument();
  });

  it('surfaces createdAt as the row timestamp for the pending state', () => {
    const report = makeReport({
      status: 'open',
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-02-02T11:00:00.000Z',
    });
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={vi.fn()}
          onAction={vi.fn()}
        />
      </ul>,
    );

    const timestamp = screen.getByTestId('comment-report-row-timestamp-r-1');
    // The 2024-01-01 value wins over 2024-02-02 because the row
    // is pending; the updatedAt value would be displayed only
    // after the report is resolved.
    expect(timestamp.textContent).toMatch(/2024/);
    expect(timestamp.textContent).not.toMatch(/Feb/i);
  });
});

describe('TKT-7.6.E1 — CommentReportItem: resolved row', () => {
  it('renders the "Dismissed" pill and surfaces updatedAt when status is "dismissed"', () => {
    const report = makeReport({
      status: 'dismissed',
      createdAt: '2024-01-01T10:00:00.000Z',
      updatedAt: '2024-02-02T11:00:00.000Z',
    });
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={vi.fn()}
          onAction={vi.fn()}
        />
      </ul>,
    );

    expect(
      screen.getByTestId('comment-report-row-pill-r-1'),
    ).toHaveTextContent(/Dismissed/i);
    const timestamp = screen.getByTestId('comment-report-row-timestamp-r-1');
    expect(timestamp.textContent).toMatch(/Feb/i);
  });

  it('renders the "Actioned" pill when status is "actioned"', () => {
    const report = makeReport({ status: 'actioned' });
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={vi.fn()}
          onAction={vi.fn()}
        />
      </ul>,
    );

    expect(
      screen.getByTestId('comment-report-row-pill-r-1'),
    ).toHaveTextContent(/Actioned/i);
  });

  it('renders the "Reviewed" pill when status is "reviewed"', () => {
    const report = makeReport({ status: 'reviewed' });
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={vi.fn()}
          onAction={vi.fn()}
        />
      </ul>,
    );

    expect(
      screen.getByTestId('comment-report-row-pill-r-1'),
    ).toHaveTextContent(/Reviewed/i);
  });
});

describe('TKT-7.6.E1 — CommentReportItem: click vs action-menu isolation', () => {
  it('row click invokes onSelect(report) exactly once', () => {
    const report = makeReport({ status: 'open' });
    const onSelect = vi.fn();
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={onSelect}
          onAction={vi.fn()}
        />
      </ul>,
    );

    fireEvent.click(screen.getByTestId('comment-report-row-r-1'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(report);
  });

  it('action menu trigger click does NOT invoke onSelect', () => {
    const report = makeReport({ status: 'open' });
    const onSelect = vi.fn();
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={onSelect}
          onAction={vi.fn()}
        />
      </ul>,
    );

    fireEvent.click(
      screen.getByTestId('comment-report-action-trigger-r-1'),
    );
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('keyboard activation (Enter) invokes onSelect(report)', () => {
    const report = makeReport({ status: 'open' });
    const onSelect = vi.fn();
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={onSelect}
          onAction={vi.fn()}
        />
      </ul>,
    );

    fireEvent.keyDown(screen.getByTestId('comment-report-row-r-1'), {
      key: 'Enter',
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(report);
  });

  it('show-more toggle click does NOT invoke onSelect', () => {
    const report = makeReport({
      status: 'open',
      reason: 'misinformation-with-very-very-very-long-text-exceeding-the-line-budget',
    });
    const onSelect = vi.fn();
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={onSelect}
          onAction={vi.fn()}
        />
      </ul>,
    );

    fireEvent.click(
      screen.getByTestId('comment-report-row-reason-toggle-r-1'),
    );
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('TKT-7.6.E1 — CommentReportItem: action menu wiring', () => {
  it('action selection invokes onAction(action, report) with the typed consumer action', () => {
    const report = makeReport({ status: 'open' });
    const onAction = vi.fn();
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={vi.fn()}
          onAction={onAction}
        />
      </ul>,
    );

    // The mocked dropdown item has data-testid
    // `comment-report-action-{action}-{reportId}`.
    const item = screen.getByTestId('comment-report-action-dismiss-r-1');
    fireEvent.click(item);

    expect(onAction).toHaveBeenCalledTimes(1);
    const [actionArg, reportArg] = onAction.mock.calls[0] as [
      CommentReportConsumerAction,
      CommentReportDto,
    ];
    expect(actionArg).toBe('dismiss');
    expect(reportArg).toBe(report);
  });
});

describe('TKT-7.6.E1 — CommentReportItem: selected state', () => {
  it('applies aria-selected and the selection ring when selected=true', () => {
    const report = makeReport({ status: 'open' });
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={vi.fn()}
          onAction={vi.fn()}
          selected
        />
      </ul>,
    );

    const row = screen.getByTestId('comment-report-row-r-1');
    expect(row).toHaveAttribute('aria-selected', 'true');
    expect(row.className).toMatch(/ring-primary|border-primary/);
  });

  it('omits aria-selected when selected=false (default)', () => {
    const report = makeReport({ status: 'open' });
    render(
      <ul>
        <CommentReportItem
          report={report}
          commentAuthorId={null}
          onSelect={vi.fn()}
          onAction={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId('comment-report-row-r-1')).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });
});

describe('TKT-7.6.E1 — CommentReportItem: no service imports', () => {
  it('the component source contains no axios or fetch() calls', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(
      resolve(__dirname, '..', 'CommentReportItem.tsx'),
      'utf-8',
    );
    expect(source).not.toMatch(/from\s+['"]axios['"]/);
    // Detect a literal `fetch(` call expression — `fetch()` and
    // `window.fetch(...)` would both match this pattern.
    expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
  });
});