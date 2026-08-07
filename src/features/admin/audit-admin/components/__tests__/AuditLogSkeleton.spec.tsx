/**
 * `AuditLogSkeleton.spec.tsx` — AuditLogSkeleton component tests.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.I3.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuditLogSkeleton } from '../AuditLogSkeleton';

describe('AuditLogSkeleton', () => {
  it('renders 5 skeleton rows by default', () => {
    render(<AuditLogSkeleton />);

    expect(screen.getAllByTestId('audit-log-skeleton-row')).toHaveLength(5);
  });

  it('renders the requested number of rows', () => {
    render(<AuditLogSkeleton count={10} />);

    expect(screen.getAllByTestId('audit-log-skeleton-row')).toHaveLength(10);
  });

  it('has role="status" for accessibility', () => {
    render(<AuditLogSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has an aria-label', () => {
    render(<AuditLogSkeleton />);

    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-label',
      'Loading audit log entries…',
    );
  });
});