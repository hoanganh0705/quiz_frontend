"use client";

import { SearchX, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface AuditLogEmptyStateProps {
  hasActiveFilters: boolean;

  onClearFilters?: () => void;
}

export function AuditLogEmptyState({
  hasActiveFilters,
  onClearFilters,
}: AuditLogEmptyStateProps) {
  if (hasActiveFilters) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/50 py-12 px-6 text-center"
        data-testid="audit-log-empty-state-filtered"
      >
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <p
          className="text-sm font-semibold text-foreground"
          data-testid="audit-log-empty-state-filtered-title"
        >
          No entries match your filters
        </p>
        <p
          className="mt-1 text-xs text-muted-foreground max-w-sm"
          data-testid="audit-log-empty-state-filtered-description"
        >
          Try adjusting your filters or clearing them to see all entries.
        </p>
        {onClearFilters && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 text-xs h-8 px-3"
            onClick={onClearFilters}
            data-testid="audit-log-empty-state-clear-filters"
          >
            Clear filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/50 py-12 px-6 text-center"
      data-testid="audit-log-empty-state"
    >
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <ShieldCheck className="h-6 w-6" aria-hidden="true" />
      </div>
      <p
        className="text-sm font-semibold text-foreground"
        data-testid="audit-log-empty-state-title"
      >
        No audit entries yet
      </p>
      <p
        className="mt-1 text-xs text-muted-foreground max-w-sm"
        data-testid="audit-log-empty-state-description"
      >
        Admin actions will appear here as they are performed.
      </p>
    </div>
  );
}
