/**
 * `AuditLogExportButton.spec.tsx` — AuditLogExportButton component tests.
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.I3.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuditLogExportButton } from '../AuditLogExportButton';

describe('AuditLogExportButton', () => {
  // ─── Disabled state ─────────────────────────────────────────────────

  it('is disabled when exportSupported is false', () => {
    render(<AuditLogExportButton exportSupported={false} />);

    expect(
      screen.getByTestId('audit-log-export-trigger'),
    ).toBeDisabled();
  });

  it('renders the "not supported" notice when exportSupported is false', () => {
    render(<AuditLogExportButton exportSupported={false} />);

    expect(
      screen.getByTestId('audit-log-export-unsupported'),
    ).toBeInTheDocument();
  });

  it('does not render format buttons when exportSupported is false', () => {
    render(<AuditLogExportButton exportSupported={false} />);

    expect(
      screen.queryByTestId('audit-log-export-csv'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('audit-log-export-json'),
    ).not.toBeInTheDocument();
  });

  // ─── Enabled state ──────────────────────────────────────────────────

  it('renders CSV and JSON format buttons when exportSupported is true', () => {
    render(<AuditLogExportButton exportSupported={true} />);

    expect(screen.getByTestId('audit-log-export-csv')).toBeInTheDocument();
    expect(screen.getByTestId('audit-log-export-json')).toBeInTheDocument();
  });

  it('invokes onExport with the correct format when format button clicked', () => {
    const onExport = vi.fn().mockResolvedValue(undefined);
    render(
      <AuditLogExportButton exportSupported={true} onExport={onExport} />,
    );

    fireEvent.click(screen.getByTestId('audit-log-export-csv'));

    expect(onExport).toHaveBeenCalledWith('csv', {});
  });

  it('passes filters to onExport', () => {
    const onExport = vi.fn().mockResolvedValue(undefined);
    const filters = { actorId: '00000000-0000-4000-8000-000000000001' };
    render(
      <AuditLogExportButton
        exportSupported={true}
        onExport={onExport}
        filters={filters}
      />,
    );

    fireEvent.click(screen.getByTestId('audit-log-export-json'));

    expect(onExport).toHaveBeenCalledWith('json', filters);
  });
});