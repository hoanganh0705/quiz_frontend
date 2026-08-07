/**
 * `AuditLogItem.spec.tsx` — AuditLogItem component tests.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.I3.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuditLogItem } from '../AuditLogItem';

const MOCK_ENTRY = {
  id: 'audit-1',
  actorId: '00000000-0000-4000-8000-000000000001',
  action: 'role.grant',
  targetType: 'user',
  targetId: '00000000-0000-4000-8000-000000000002',
  requestId: 'req-123-abc',
  timestamp: '2026-08-01T00:00:00.000Z',
  payload: {},
};

describe('AuditLogItem', () => {
  // ─── Rendering ──────────────────────────────────────────────────────

  it('renders an item with the correct id', () => {
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={vi.fn()} />);
    expect(
      screen.getByTestId('audit-log-item').getAttribute('data-entry-id'),
    ).toBe('audit-1');
  });

  it('displays the action', () => {
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={vi.fn()} />);
    expect(screen.getByTestId('audit-log-item-action')).toHaveTextContent(
      'Role',
    );
  });

  it('displays the target', () => {
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={vi.fn()} />);
    expect(screen.getByTestId('audit-log-item-target')).toBeInTheDocument();
  });

  it('displays the timestamp in localized format', () => {
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={vi.fn()} />);
    expect(
      screen.getByTestId('audit-log-item-timestamp'),
    ).toBeInTheDocument();
  });

  it('displays request ID when available', () => {
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={vi.fn()} />);
    expect(
      screen.getByTestId('audit-log-item-request-id'),
    ).toBeInTheDocument();
  });

  it('never renders raw payload content', () => {
    const entry = {
      ...MOCK_ENTRY,
      payload: { secretToken: 'should-not-appear' },
    };
    const { container } = render(
      <AuditLogItem entry={entry} onClick={vi.fn()} />,
    );
    expect(container.innerHTML).not.toContain('secretToken');
    expect(container.innerHTML).not.toContain('should-not-appear');
  });

  // ─── Interaction ────────────────────────────────────────────────────

  it('invokes onClick when clicked', () => {
    const onClick = vi.fn();
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={onClick} />);

    fireEvent.click(screen.getByTestId('audit-log-item'));

    expect(onClick).toHaveBeenCalledWith(MOCK_ENTRY);
  });

  it('invokes onClick on Enter keypress', () => {
    const onClick = vi.fn();
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={onClick} />);

    fireEvent.keyDown(screen.getByTestId('audit-log-item'), { key: 'Enter' });

    expect(onClick).toHaveBeenCalledWith(MOCK_ENTRY);
  });

  it('invokes onClick on Space keypress', () => {
    const onClick = vi.fn();
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={onClick} />);

    fireEvent.keyDown(screen.getByTestId('audit-log-item'), { key: ' ' });

    expect(onClick).toHaveBeenCalledWith(MOCK_ENTRY);
  });

  it('does not invoke onClick on other keys', () => {
    const onClick = vi.fn();
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={onClick} />);

    fireEvent.keyDown(screen.getByTestId('audit-log-item'), { key: 'a' });

    expect(onClick).not.toHaveBeenCalled();
  });

  // ─── Accessibility ──────────────────────────────────────────────────

  it('has role="button" for keyboard accessibility', () => {
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={vi.fn()} />);
    expect(
      screen.getByTestId('audit-log-item').getAttribute('role'),
    ).toBe('button');
  });

  it('is keyboard focusable via tabIndex', () => {
    render(<AuditLogItem entry={MOCK_ENTRY} onClick={vi.fn()} />);
    expect(
      screen.getByTestId('audit-log-item').getAttribute('tabindex'),
    ).toBe('0');
  });
});