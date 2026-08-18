

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { ReviewReportItem } from '@/features/admin/review-moderation/components/ReviewReportItem';
import type {
ReportConsumerAction,
} from '@/features/admin/review-moderation/action-enum';
import type { AdminReportDto, ReportState } from '@/features/admin/review-moderation/admin-report-types';

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
overrides: Partial<AdminReportDto> & { status: ReportState },
): AdminReportDto {
return {
reportId: overrides.reportId ?? 'r-1',
reviewId: overrides.reviewId ?? 'review-1',
quizId: overrides.quizId ?? 'q-1',
quizTitle: overrides.quizTitle ?? 'Sample Quiz',
reviewerUsername: overrides.reviewerUsername ?? 'reporter-1',
reportedUserId: overrides.reportedUserId ?? 'author-1',
rating: overrides.rating ?? 1,
comment: overrides.comment ?? null,
reason: overrides.reason ?? 'spam',
details: overrides.details ?? null,
status: overrides.status,
createdAt: overrides.createdAt ?? '2024-01-01T10:00:00.000Z',
updatedAt: overrides.updatedAt ?? '2024-01-01T11:00:00.000Z',
  };
}

beforeEach(() => {
vi.clearAllMocks();
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

describe('TKT-7.5.E1 — ReviewReportItem: pending row', () => {
it('renders the documented layout (reporter, reason, status pill, action menu)', () => {
const report = makeReport({ status: 'open' });
render(
<div>
<ReviewReportItem
report={report}
onSelect={vi.fn()}
onAction={vi.fn()}
        />
</div>,
    );

const row = screen.getByTestId('review-report-row-r-1');
expect(row).toBeInTheDocument();
expect(
screen.getByTestId('review-report-row-reporter-r-1'),
    ).toHaveTextContent('reporter-1');
expect(
screen.getByTestId('review-report-row-quiz-r-1'),
    ).toHaveTextContent('Sample Quiz');
expect(
screen.getByTestId('review-report-row-reason-r-1'),
    ).toHaveTextContent(/spam/i);
expect(
screen.getByTestId('review-report-row-pill-r-1'),
    ).toHaveTextContent(/Pending/i);

expect(
screen.getByTestId('review-report-action-trigger-r-1'),
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
<ReviewReportItem
report={report}
onSelect={vi.fn()}
onAction={vi.fn()}
        />
</ul>,
    );

const timestamp = screen.getByTestId('review-report-row-timestamp-r-1');

expect(timestamp.textContent).toMatch(/2024/);
expect(timestamp.textContent).not.toMatch(/Feb/i);
  });
});

describe('TKT-7.5.E1 — ReviewReportItem: resolved row', () => {
it('renders the "Dismissed" pill and surfaces updatedAt when status is "dismissed"', () => {
const report = makeReport({
status: 'dismissed',
createdAt: '2024-01-01T10:00:00.000Z',
updatedAt: '2024-02-02T11:00:00.000Z',
    });
render(
<ul>
<ReviewReportItem
report={report}
onSelect={vi.fn()}
onAction={vi.fn()}
        />
</ul>,
    );

expect(
screen.getByTestId('review-report-row-pill-r-1'),
    ).toHaveTextContent(/Dismissed/i);
const timestamp = screen.getByTestId('review-report-row-timestamp-r-1');
expect(timestamp.textContent).toMatch(/Feb/i);
  });

it('renders the "Actioned" pill when status is "actioned"', () => {
const report = makeReport({ status: 'actioned' });
render(
<ul>
<ReviewReportItem
report={report}
onSelect={vi.fn()}
onAction={vi.fn()}
        />
</ul>,
    );

expect(
screen.getByTestId('review-report-row-pill-r-1'),
    ).toHaveTextContent(/Actioned/i);
  });

it('renders the "Reviewed" pill when status is "reviewed"', () => {
const report = makeReport({ status: 'reviewed' });
render(
<ul>
<ReviewReportItem
report={report}
onSelect={vi.fn()}
onAction={vi.fn()}
        />
</ul>,
    );

expect(
screen.getByTestId('review-report-row-pill-r-1'),
    ).toHaveTextContent(/Reviewed/i);
  });
});

describe('TKT-7.5.E1 — ReviewReportItem: click vs action-menu isolation', () => {
it('row click invokes onSelect(report) exactly once', () => {
const report = makeReport({ status: 'open' });
const onSelect = vi.fn();
render(
<ul>
<ReviewReportItem
report={report}
onSelect={onSelect}
onAction={vi.fn()}
        />
</ul>,
    );

fireEvent.click(screen.getByTestId('review-report-row-r-1'));
expect(onSelect).toHaveBeenCalledTimes(1);
expect(onSelect).toHaveBeenCalledWith(report);
  });

it('action menu trigger click does NOT invoke onSelect', () => {
const report = makeReport({ status: 'open' });
const onSelect = vi.fn();
render(
<ul>
<ReviewReportItem
report={report}
onSelect={onSelect}
onAction={vi.fn()}
        />
</ul>,
    );

fireEvent.click(
screen.getByTestId('review-report-action-trigger-r-1'),
    );
expect(onSelect).not.toHaveBeenCalled();
  });

it('keyboard activation (Enter) invokes onSelect(report)', () => {
const report = makeReport({ status: 'open' });
const onSelect = vi.fn();
render(
<ul>
<ReviewReportItem
report={report}
onSelect={onSelect}
onAction={vi.fn()}
        />
</ul>,
    );

fireEvent.keyDown(screen.getByTestId('review-report-row-r-1'), {
key: 'Enter',
    });
expect(onSelect).toHaveBeenCalledTimes(1);
expect(onSelect).toHaveBeenCalledWith(report);
  });
});

describe('TKT-7.5.E1 — ReviewReportItem: action menu wiring', () => {
it('action selection invokes onAction(action, report) with the typed consumer action', () => {
const report = makeReport({ status: 'open' });
const onAction = vi.fn();
render(
<ul>
<ReviewReportItem
report={report}
onSelect={vi.fn()}
onAction={onAction}
        />
</ul>,
    );

const item = screen.getByTestId('review-report-action-dismiss-r-1');
fireEvent.click(item);

expect(onAction).toHaveBeenCalledTimes(1);
const [actionArg, reportArg] = onAction.mock.calls[0] as [
ReportConsumerAction,
AdminReportDto,
    ];
expect(actionArg).toBe('dismiss');
expect(reportArg).toBe(report);
  });
});

describe('TKT-7.5.E1 — ReviewReportItem: selected state', () => {
it('applies aria-selected and the selection ring when selected=true', () => {
const report = makeReport({ status: 'open' });
render(
<ul>
<ReviewReportItem
report={report}
onSelect={vi.fn()}
onAction={vi.fn()}
selected
        />
</ul>,
    );

const row = screen.getByTestId('review-report-row-r-1');
expect(row).toHaveAttribute('aria-selected', 'true');
expect(row.className).toMatch(/ring-primary|border-primary/);
  });

it('omits aria-selected when selected=false (default)', () => {
const report = makeReport({ status: 'open' });
render(
<ul>
<ReviewReportItem
report={report}
onSelect={vi.fn()}
onAction={vi.fn()}
        />
</ul>,
    );

expect(screen.getByTestId('review-report-row-r-1')).toHaveAttribute(
'aria-selected',
'false',
    );
  });
});

describe('TKT-7.5.E1 — ReviewReportItem: no service imports', () => {
it('the component source contains no axios or fetch() calls', async () => {
const { readFileSync } = await import('node:fs');
const { resolve } = await import('node:path');
const source = readFileSync(
resolve(__dirname, '..', 'ReviewReportItem.tsx'),
'utf-8',
    );
expect(source).not.toMatch(/from\s+['"]axios['"]/);

expect(source).not.toMatch(/(?:^|[^.\w])fetch\s*\(/);
  });
});