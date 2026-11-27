"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";


import { useAdminAuditLog } from "../hooks/useAdminAuditLog";
import { useAuditLogFilters } from "../hooks/useAuditLogFilters";
import {
  AUDIT_LOG_DEFAULT_PAGE_SIZE,
  useOffsetPaginatedAuditLogs,
} from "../hooks/useOffsetPaginatedAuditLogs";

import type { AuditLogEntryDto } from "../types";

import { AuditLogDetailPanel } from "./AuditLogDetailPanel";
import { AuditLogEmptyState } from "./AuditLogEmptyState";
import { AuditLogErrorState } from "./AuditLogErrorState";
import { AuditLogExportButton } from "./AuditLogExportButton";
import { AuditLogFilters } from "./AuditLogFilters";
import { AuditLogList } from "./AuditLogList";
import { AuditLogNotExposedNotice } from "./AuditLogNotExposedNotice";
import { AuditLogSkeleton } from "./AuditLogSkeleton";


export function AuditLogPage(): React.ReactElement {

  return <AuditLogPageContent />;
}

function AuditLogPageContent(): React.ReactElement {
  const { filters, hasActiveFilters, resetFilters } = useAuditLogFilters();
  const [knownTotal, setKnownTotal] = useState(0);

  const pagination = useOffsetPaginatedAuditLogs({
    initialOffset: 0,
    initialLimit: AUDIT_LOG_DEFAULT_PAGE_SIZE,
    total: knownTotal,
  });

  const {
    entries,
    total,
    isLoading,
    isValidating,
    error,
    isNotExposed,
    mutate,
  } = useAdminAuditLog(filters, {
    offset: pagination.offset,
    limit: pagination.limit,
  });

  useEffect(() => {
    setKnownTotal((prev) => (prev === total ? prev : total));
  }, [total]);

  const filtersSignature = JSON.stringify(filters);
  const resetPagination = pagination.resetPagination;
  useEffect(() => {
    resetPagination();
  }, [filtersSignature, resetPagination]);

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [initialEntry, setInitialEntry] = useState<AuditLogEntryDto | null>(
    null,
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pagination.limit)),
    [total, pagination.limit],
  );

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

  if (isNotExposed) {
    return (
      <div
        className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 space-y-6"
        data-testid="audit-log-page"
      >
        {/* Consistent Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Audit Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time administrative operations, security events, and platform activity trail.
            </p>
          </div>
          <AuditLogExportButton filters={filters} exportSupported={false} />
        </div>
        <AuditLogNotExposedNotice />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 space-y-6"
      data-testid="audit-log-page"
      data-loading={isLoading}
      data-error={error ? "true" : "false"}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time administrative operations, security events, and platform activity trail.
          </p>
        </div>
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
        <div className="space-y-3">
          {/* Status and count bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Showing <span className="font-mono font-medium text-foreground">{entries.length}</span> of{" "}
              <span className="font-mono font-medium text-foreground">{total}</span> events
            </span>
            {isValidating && (
              <span
                className="font-mono text-xs text-muted-foreground animate-pulse"
                data-testid="audit-log-revalidating"
              >
                Refreshing…
              </span>
            )}
          </div>

          <section data-testid="audit-log-list">
            <AuditLogList entries={entries} onEntryClick={handleEntryClick} />
          </section>

          {/* Pagination */}
          <nav
            className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/40"
            aria-label="Audit log pagination"
            data-testid="audit-log-pagination"
          >
            <p className="font-mono text-xs text-muted-foreground">
              Page {pagination.page} of {totalPages} ({total} total)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.prevPage}
                disabled={!pagination.hasPrevPage}
                className="h-8 px-3 text-xs"
                data-testid="audit-log-pagination-prev"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={pagination.nextPage}
                disabled={!pagination.hasNextPage}
                className="h-8 px-3 text-xs"
                data-testid="audit-log-pagination-next"
              >
                Next
              </Button>
            </div>
          </nav>
        </div>
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
