/**
 * `AuditLogFilters.spec.tsx` — AuditLogFilters component tests.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.I3.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { mockUseAuditLogFilters } = vi.hoisted(() => ({
  mockUseAuditLogFilters: vi.fn(),
}));

vi.mock('../../hooks/useAuditLogFilters', () => ({
  useAuditLogFilters: () => mockUseAuditLogFilters(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/audit',
}));

import { AuditLogFilters } from '../AuditLogFilters';

describe('AuditLogFilters', () => {
  it('renders all filter inputs', () => {
    mockUseAuditLogFilters.mockReturnValue({
      filters: {},
      hasActiveFilters: false,
      setFilter: vi.fn(),
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      getFilter: vi.fn(() => undefined),
    });

    render(<AuditLogFilters />);

    expect(screen.getByTestId('audit-log-filters')).toBeInTheDocument();
    expect(
      screen.getByTestId('audit-log-filter-actorId'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('audit-log-filter-action'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('audit-log-filter-targetType'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('audit-log-filter-targetId'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('audit-log-filter-from'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-filter-to')).toBeInTheDocument();
  });

  it('does not render reset button when no filters are active', () => {
    mockUseAuditLogFilters.mockReturnValue({
      filters: {},
      hasActiveFilters: false,
      setFilter: vi.fn(),
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      getFilter: vi.fn(() => undefined),
    });

    render(<AuditLogFilters />);

    expect(
      screen.queryByTestId('audit-log-filters-reset'),
    ).not.toBeInTheDocument();
  });

  it('renders reset button when filters are active', () => {
    mockUseAuditLogFilters.mockReturnValue({
      filters: { actorId: '00000000-0000-4000-8000-000000000001' },
      hasActiveFilters: true,
      setFilter: vi.fn(),
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      getFilter: vi.fn(() => '00000000-0000-4000-8000-000000000001'),
    });

    render(<AuditLogFilters />);

    expect(screen.getByTestId('audit-log-filters-reset')).toBeInTheDocument();
  });

  it('invokes resetFilters when reset button is clicked', () => {
    const resetFilters = vi.fn();
    mockUseAuditLogFilters.mockReturnValue({
      filters: { actorId: '00000000-0000-4000-8000-000000000001' },
      hasActiveFilters: true,
      setFilter: vi.fn(),
      setFilters: vi.fn(),
      resetFilters,
      getFilter: vi.fn(() => '00000000-0000-4000-8000-000000000001'),
    });

    render(<AuditLogFilters />);
    fireEvent.click(screen.getByTestId('audit-log-filters-reset'));

    expect(resetFilters).toHaveBeenCalled();
  });

  it('invokes setFilter when actor ID changes', () => {
    const setFilter = vi.fn();
    mockUseAuditLogFilters.mockReturnValue({
      filters: {},
      hasActiveFilters: false,
      setFilter,
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      getFilter: vi.fn(() => undefined),
    });

    render(<AuditLogFilters />);

    fireEvent.change(screen.getByTestId('audit-log-filter-actorId'), {
      target: { value: 'new-value' },
    });

    expect(setFilter).toHaveBeenCalledWith('actorId', 'new-value');
  });

  it('hides the form body when collapsed is true', () => {
    mockUseAuditLogFilters.mockReturnValue({
      filters: {},
      hasActiveFilters: false,
      setFilter: vi.fn(),
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      getFilter: vi.fn(() => undefined),
    });

    render(<AuditLogFilters collapsed={true} />);

    expect(
      screen.queryByTestId('audit-log-filter-actorId'),
    ).not.toBeInTheDocument();
  });
});