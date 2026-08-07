'use client';

/**
 * `AuditLogPage.tsx`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.D1.
 *
 * ## What this component owns
 *
 * Main page component for the audit log viewer route. Orchestrates:
 *   - List state (loading / error / empty / success)
 *   - Filters panel
 *   - Pagination
 *   - Detail panel (open / close)
 *   - Export button
 *
 * ## States
 *
 *   - `loading`    — initial fetch in flight
 *   - `error`      — fetch failed
 *   - `empty`      — no entries (or no entries for current filters)
 *   - `success`    — entries loaded
 *
 * ## Feature flag
 *
 * Reads `phase7_admin_audit` flag. When flag is `'placeholder'`, renders
 * the disabled notice instead of the audit log surface.
 */

import { useCallback, useMemo, useState } from 'react';

import { useAdminFeatureFlag } from '@/features/admin/hooks/useAdminFeatureFlag';

import { useAdminAuditLog } from '../hooks/useAdminAuditLog';
import { useAuditLogFilters } from '../hooks/useAuditLogFilters';
import {
  AUDIT_LOG_DEFAULT_PAGE_SIZE,
  useOffsetPaginatedAuditLogs,
} from '../hooks/useOffsetPaginatedAuditLogs';

import type { AuditLogEntryDto } from '../types';

import { AuditLogDetailPanel } from './AuditLogDetailPanel';
import { AuditLogEmptyState } from './AuditLogEmptyState';
import { AuditLogErrorState } from './AuditLogErrorState';
import { AuditLogExportButton } from './AuditLogExportButton';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogList } from './AuditLogList';
import { AuditLogNotExposedNotice } from './AuditLogNotExposedNotice';
import { AuditLogSkeleton } from './AuditLogSkeleton';

// ─── Disabled notice ───────────────────────────────────────────────────────

function AuditLogDisabledNotice() {
  return (
    <div
      data-testid="audit-log-disabled-notice"
      className="flex items-start gap-3 rounded-md border border-dashed border-muted-foreground/40 bg-muted/40 px-4 py-6"
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Audit log coming soon
        </p>
        <p className="text-sm text-muted-foreground">
          The{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            phase7_admin_audit
          </code>{' '}
          flag is at its default value. Enable it to expose the audit log
          surface.
        </p>
      </div>
    </div>
  );
}

// ─── Main page component ───────────────────────────────────────────────────

export function AuditLogPage(): React.ReactElement {
  const { value: flagValue } = useAdminFeatureFlag('phase7_admin_audit');

  // Feature flag gate
  if (flagValue !== 'live') {
    return <AuditLogDisabledNotice />;
  }

  return <AuditLogPageContent />;
}

// ─── Active page content (flag is live) ─────────────────────────────────────

function AuditLogPageContent(): React.ReactElement {
  // Filters via URL state
  const { filters, hasActiveFilters, resetFilters } = useAuditLogFilters();

  // Pagination
  const pagination = useOffsetPaginatedAuditLogs({
    initialOffset: 0,
    initialLimit: AUDIT_LOG_DEFAULT_PAGE_SIZE,
    total: 0, // Will be updated via setOffset logic
  });

  // Data
  const { entries, total, isLoading, isValidating, error, isNotExposed, mutate } =
    useAdminAuditLog(filters, {
      offset: pagination.offset,
      limit: pagination.limit,
    });

  // Detail panel state
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [initialEntry, setInitialEntry] = useState<AuditLogEntryDto | null>(
    null,
  );

  // Pagination total calculation
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pagination.limit)),
    [total, pagination.limit],
  );

  // Handlers
  const handleEntryClick = useCallback((entry: AuditLogEntryDto) => {
    setInitialEntry(entry);
    setSelectedEntryId(entry.id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedEntryId(null);
    setInitialEntry(null);
  }, []);

  const handleRetry = useCallback(() => {
    void mutate();
  }, [mutate]);

  // ─── Render ─────────────────────────────────────────────────────────────

  // Degradation path: backend does not expose the audit log endpoint
  if (isNotExposed) {
    return (
      <div
        className="space-y-4"
        data-testid="audit-log-page"
      >
        <h1 className="text-xl font-semibold text-foreground">
          Audit log
        </h1>
        <AuditLogNotExposedNotice />
      </div>
    );
  }

  return (
    <div
      className="space-y-4"
      data-testid="audit-log-page"
      data-loading={isLoading}
      data-error={error ? 'true' : 'false'}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">
          Audit log
        </h1>
        <AuditLogExportButton filters={filters} exportSupported={false} />
      </div>

      {/* Filters */}
      <AuditLogFilters />

      {/* List states */}
      {isLoading ? (
        <section data-testid="audit-log-list-loading">
          <AuditLogSkeleton />
        </section>
      ) : error ? (
        <section data-testid="audit-log-list-error">
          <AuditLogErrorState error={error} onRetry={handleRetry} />
        </section>
      ) : entries.length === 0 ? (
        <section data-testid="audit-log-list-empty">
          <AuditLogEmptyState
            hasActiveFilters={hasActiveFilters}
            onClearFilters={resetFilters}
          />
        </section>
      ) : (
        <>
          <section data-testid="audit-log-list">
            <AuditLogList entries={entries} onEntryClick={handleEntryClick} />
            {isValidating && (
              <p
                className="mt-2 text-xs text-muted-foreground"
                data-testid="audit-log-revalidating"
              >
                Refreshing…
              </p>
            )}
          </section>

          {/* Pagination */}
          <nav
            className="flex items-center justify-between gap-2"
            aria-label="Audit log pagination"
            data-testid="audit-log-pagination"
          >
            <p className="text-xs text-muted-foreground">
              Page {pagination.page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={pagination.prevPage}
                disabled={!pagination.hasPrevPage}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="audit-log-pagination-prev"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={pagination.nextPage}
                disabled={!pagination.hasNextPage}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                data-testid="audit-log-pagination-next"
              >
                Next
              </button>
            </div>
          </nav>
        </>
      )}

      {/* Detail panel */}
      <AuditLogDetailPanel
        entryId={selectedEntryId}
        initialEntry={initialEntry}
        onClose={handleCloseDetail}
      />
    </div>
  );
}