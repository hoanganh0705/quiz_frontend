/**
 * `AuditLogEmptyState.spec.tsx` — AuditLogEmptyState component tests.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.I3.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuditLogEmptyState } from '../AuditLogEmptyState';

describe('AuditLogEmptyState', () => {
  // ─── Without filters ────────────────────────────────────────────────

  it('renders "no entries" copy when no filters are active', () => {
    render(<AuditLogEmptyState hasActiveFilters={false} />);

    expect(screen.getByTestId('audit-log-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-empty-state-title')).toHaveTextContent(
      'No audit entries yet',
    );
  });

  it('does not show clear filters button when no filters', () => {
    render(<AuditLogEmptyState hasActiveFilters={false} />);

    expect(
      screen.queryByTestId('audit-log-empty-state-clear-filters'),
    ).not.toBeInTheDocument();
  });

  // ─── With filters ───────────────────────────────────────────────────

  it('renders "no results" copy when filters are active', () => {
    render(<AuditLogEmptyState hasActiveFilters={true} />);

    expect(
      screen.getByTestId('audit-log-empty-state-filtered'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('audit-log-empty-state-filtered-title'),
    ).toHaveTextContent('No entries match your filters');
  });

  it('shows clear filters button when filters are active', () => {
    render(
      <AuditLogEmptyState hasActiveFilters={true} onClearFilters={vi.fn()} />,
    );

    expect(
      screen.getByTestId('audit-log-empty-state-clear-filters'),
    ).toBeInTheDocument();
  });

  it('invokes onClearFilters when clear button is clicked', () => {
    const onClearFilters = vi.fn();
    render(
      <AuditLogEmptyState
        hasActiveFilters={true}
        onClearFilters={onClearFilters}
      />,
    );

    fireEvent.click(
      screen.getByTestId('audit-log-empty-state-clear-filters'),
    );

    expect(onClearFilters).toHaveBeenCalled();
  });

  it('does not crash when clear button clicked without onClearFilters', () => {
    // Without onClearFilters, the button is not rendered at all
    const { container } = render(
      <AuditLogEmptyState hasActiveFilters={true} />,
    );

    expect(
      container.querySelector(
        '[data-testid="audit-log-empty-state-clear-filters"]',
      ),
    ).toBeNull();
  });
});