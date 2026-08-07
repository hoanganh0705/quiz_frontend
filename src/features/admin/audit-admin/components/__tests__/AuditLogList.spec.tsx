/**
 * `AuditLogList.spec.tsx` — AuditLogList component tests.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.I3.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuditLogList } from '../AuditLogList';

const MOCK_ENTRY = {
  id: 'audit-1',
  actorId: '00000000-0000-4000-8000-000000000001',
  action: 'role.grant',
  targetType: 'user',
  targetId: '00000000-0000-4000-8000-000000000002',
  requestId: 'req-1',
  timestamp: '2026-08-01T00:00:00.000Z',
  payload: {},
};

describe('AuditLogList', () => {
  it('renders a list with one item per entry', () => {
    const entries = [MOCK_ENTRY, { ...MOCK_ENTRY, id: 'audit-2' }];
    render(<AuditLogList entries={entries} onEntryClick={vi.fn()} />);

    expect(screen.getByTestId('audit-log-list')).toBeInTheDocument();
    expect(screen.getAllByTestId('audit-log-item')).toHaveLength(2);
  });

  it('uses entry ID as the key', () => {
    const entries = [MOCK_ENTRY];
    render(<AuditLogList entries={entries} onEntryClick={vi.fn()} />);

    expect(
      screen.getByTestId('audit-log-item').getAttribute('data-entry-id'),
    ).toBe('audit-1');
  });

  it('renders an empty list when entries is empty', () => {
    render(<AuditLogList entries={[]} onEntryClick={vi.fn()} />);

    expect(screen.getByTestId('audit-log-list')).toBeInTheDocument();
    expect(screen.queryAllByTestId('audit-log-item')).toHaveLength(0);
  });

  it('uses role="list" for ARIA semantics', () => {
    render(<AuditLogList entries={[MOCK_ENTRY]} onEntryClick={vi.fn()} />);

    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});