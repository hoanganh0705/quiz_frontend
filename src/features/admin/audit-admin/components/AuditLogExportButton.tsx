'use client';

/**
 * `AuditLogExportButton.tsx`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.D9.
 *
 * ## What this component owns
 *
 * Export button for the audit log (CSV/JSON).
 *
 * Per TKT-7.11.A1: backend export capability is unverified at this commit.
 * The button renders but is disabled by default until the verification
 * sign-off is complete and `exportSupported` is set to `true`.
 *
 * When export is enabled, the dropdown lets the user pick CSV or JSON.
 * The download handler uses the current filter state.
 */

import { useCallback, useState } from 'react';

import { Download } from 'lucide-react';

import type { AuditLogFilters } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const EXPORT_FORMATS = ['csv', 'json'] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

// ─── Props ──────────────────────────────────────────────────────────────────

export interface AuditLogExportButtonProps {
  /** Current filter state (exported entries will match these filters). */
  filters?: AuditLogFilters;
  /** Whether backend export capability is verified. Defaults to false. */
  exportSupported?: boolean;
  /** Invoked to perform the actual export. Stubbed at this commit. */
  onExport?: (format: ExportFormat, filters: AuditLogFilters) => Promise<void>;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AuditLogExportButton({
  filters = {},
  exportSupported = false,
  onExport,
}: AuditLogExportButtonProps): React.ReactElement {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!exportSupported || isExporting) return;
      try {
        setIsExporting(true);
        if (onExport) {
          await onExport(format, filters);
        } else {
          // Stubbed: log to console until backend export is wired
          // eslint-disable-next-line no-console
          console.warn(
            `[AuditLogExportButton] Export not yet implemented (format=${format})`,
          );
        }
      } finally {
        setIsExporting(false);
      }
    },
    [exportSupported, isExporting, onExport, filters],
  );

  return (
    <div className="relative" data-testid="audit-log-export-button">
      <button
        type="button"
        disabled={!exportSupported || isExporting}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        data-testid="audit-log-export-trigger"
        title={
          exportSupported
            ? 'Export audit log'
            : 'Export is not yet supported by the backend'
        }
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {isExporting ? 'Exporting…' : 'Export'}
      </button>

      {!exportSupported && (
        <p
          className="mt-1 text-xs text-muted-foreground/70"
          data-testid="audit-log-export-unsupported"
        >
          Export not yet supported by backend.
        </p>
      )}

      {exportSupported && (
        <div className="mt-2 flex gap-2">
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              disabled={isExporting}
              onClick={() => handleExport(format)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs uppercase text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              data-testid={`audit-log-export-${format}`}
            >
              {format}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}