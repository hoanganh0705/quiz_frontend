'use client';

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
className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 p-8 text-center"
data-testid="audit-log-empty-state-filtered"
      >
<svg
className="mb-3 h-10 w-10 text-muted-foreground/50"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
strokeWidth={1.5}
aria-hidden="true"
        >
<path
strokeLinecap="round"
strokeLinejoin="round"
d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
</svg>
<p
className="text-sm font-medium text-muted-foreground"
data-testid="audit-log-empty-state-filtered-title"
        >
No entries match your filters
        </p>
<p
className="mt-1 text-xs text-muted-foreground/70"
data-testid="audit-log-empty-state-filtered-description"
        >
Try adjusting your filters or clearing them to see all entries.
        </p>
{onClearFilters && (
<button
type="button"
className="mt-4 inline-flex items-center justify-center rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
onClick={onClearFilters}
data-testid="audit-log-empty-state-clear-filters"
          >
Clear filters
          </button>
        )}
</div>
    );
  }

return (
<div
className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/20 p-8 text-center"
data-testid="audit-log-empty-state"
    >
<svg
className="mb-3 h-10 w-10 text-muted-foreground/50"
fill="none"
viewBox="0 0 24 24"
stroke="currentColor"
strokeWidth={1.5}
aria-hidden="true"
      >
<path
strokeLinecap="round"
strokeLinejoin="round"
d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        />
</svg>
<p
className="text-sm font-medium text-muted-foreground"
data-testid="audit-log-empty-state-title"
      >
No audit entries yet
      </p>
<p
className="mt-1 text-xs text-muted-foreground/70"
data-testid="audit-log-empty-state-description"
      >
Admin actions will appear here as they are performed.
      </p>
</div>
  );
}