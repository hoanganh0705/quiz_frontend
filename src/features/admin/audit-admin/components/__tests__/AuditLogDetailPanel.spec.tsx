

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockGetFeatureFlagValue, mockUseAdminAuditLogEntry } = vi.hoisted(() => ({
mockGetFeatureFlagValue: vi.fn(),
mockUseAdminAuditLogEntry: vi.fn(),
}));

vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

vi.mock('../../hooks/useAdminAuditLogEntry', () => ({
useAdminAuditLogEntry: (...args: unknown[]) => mockUseAdminAuditLogEntry(...args),
}));

import { AuditLogDetailPanel } from '../AuditLogDetailPanel';

const MOCK_ENTRY = {
id: 'audit-1',
actorId: '00000000-0000-4000-8000-000000000001',
action: 'role.grant',
targetType: 'user',
targetId: '00000000-0000-4000-8000-000000000002',
requestId: 'req-abc-123',
correlationId: 'corr-xyz-789',
timestamp: '2026-08-01T00:00:00.000Z',
payload: {},
};

afterEach(() => {
vi.restoreAllMocks();
});

describe('AuditLogDetailPanel', () => {

it('renders null when entryId is null', () => {
mockGetFeatureFlagValue.mockReturnValue('live');
mockUseAdminAuditLogEntry.mockReturnValue({
entry: null,
isLoading: false,
isValidating: false,
error: null,
    });

const { container } = render(
<AuditLogDetailPanel entryId={null} onClose={vi.fn()} />,
    );

expect(container.firstChild).toBeNull();
  });

it('renders the panel when entryId is provided', () => {
mockGetFeatureFlagValue.mockReturnValue('live');
mockUseAdminAuditLogEntry.mockReturnValue({
entry: MOCK_ENTRY,
isLoading: false,
isValidating: false,
error: null,
    });

render(
<AuditLogDetailPanel entryId="audit-1" onClose={vi.fn()} />,
    );

expect(screen.getByTestId('audit-log-detail-panel')).toBeInTheDocument();
  });

it('displays request ID', () => {
mockGetFeatureFlagValue.mockReturnValue('live');
mockUseAdminAuditLogEntry.mockReturnValue({
entry: MOCK_ENTRY,
isLoading: false,
isValidating: false,
error: null,
    });

render(<AuditLogDetailPanel entryId="audit-1" onClose={vi.fn()} />);

expect(
screen.getByTestId('audit-log-detail-request-id'),
    ).toHaveTextContent('req-abc-123');
  });

it('displays correlation ID when available', () => {
mockGetFeatureFlagValue.mockReturnValue('live');
mockUseAdminAuditLogEntry.mockReturnValue({
entry: MOCK_ENTRY,
isLoading: false,
isValidating: false,
error: null,
    });

render(<AuditLogDetailPanel entryId="audit-1" onClose={vi.fn()} />);

expect(
screen.getByTestId('audit-log-detail-correlation-id'),
    ).toHaveTextContent('corr-xyz-789');
  });

it('never renders raw payload content', () => {
mockGetFeatureFlagValue.mockReturnValue('live');
const entry = {
...MOCK_ENTRY,
payload: { secret: 'should-not-appear-in-dom' },
    };
mockUseAdminAuditLogEntry.mockReturnValue({
entry,
isLoading: false,
isValidating: false,
error: null,
    });

const { container } = render(
<AuditLogDetailPanel entryId="audit-1" onClose={vi.fn()} />,
    );

expect(container.innerHTML).not.toContain('should-not-appear-in-dom');
  });

it('invokes onClose when close button is clicked', () => {
mockGetFeatureFlagValue.mockReturnValue('live');
mockUseAdminAuditLogEntry.mockReturnValue({
entry: MOCK_ENTRY,
isLoading: false,
isValidating: false,
error: null,
    });

const onClose = vi.fn();
render(<AuditLogDetailPanel entryId="audit-1" onClose={onClose} />);

fireEvent.click(screen.getByTestId('audit-log-detail-close'));

expect(onClose).toHaveBeenCalled();
  });

it('invokes onClose when Escape key is pressed', () => {
mockGetFeatureFlagValue.mockReturnValue('live');
mockUseAdminAuditLogEntry.mockReturnValue({
entry: MOCK_ENTRY,
isLoading: false,
isValidating: false,
error: null,
    });

const onClose = vi.fn();
render(<AuditLogDetailPanel entryId="audit-1" onClose={onClose} />);

fireEvent.keyDown(document, { key: 'Escape' });

expect(onClose).toHaveBeenCalled();
  });

it('renders loading text when fetching', () => {
mockGetFeatureFlagValue.mockReturnValue('live');
mockUseAdminAuditLogEntry.mockReturnValue({
entry: null,
isLoading: true,
isValidating: false,
error: null,
    });

render(<AuditLogDetailPanel entryId="audit-1" onClose={vi.fn()} />);

expect(
screen.getByTestId('audit-log-detail-loading'),
    ).toBeInTheDocument();
  });

it('uses initialEntry when fetched entry is not yet available', () => {
mockGetFeatureFlagValue.mockReturnValue('live');
mockUseAdminAuditLogEntry.mockReturnValue({
entry: null,
isLoading: true,
isValidating: false,
error: null,
    });

render(
<AuditLogDetailPanel
entryId="audit-1"
initialEntry={MOCK_ENTRY}
onClose={vi.fn()}
      />,
    );

expect(
screen.getByTestId('audit-log-detail-request-id'),
    ).toHaveTextContent('req-abc-123');
  });
});