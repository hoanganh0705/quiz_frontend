"use client";

import { useCallback } from "react";
import { Filter } from "lucide-react";
import { useAuditLogFilters } from "../hooks/useAuditLogFilters";
import type { AuditLogFilterField } from "../types";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

const TARGET_TYPE_OPTIONS = [
  "user",
  "tournament",
  "tag",
  "category",
  "achievement",
  "comment",
  "review",
] as const;

export interface AuditLogFiltersProps {
  collapsed?: boolean;
}

export function AuditLogFilters({
  collapsed = false,
}: AuditLogFiltersProps): React.ReactElement {
  const { filters, hasActiveFilters, setFilter, resetFilters, getFilter } =
    useAuditLogFilters();

  const handleFieldChange = useCallback(
    (field: AuditLogFilterField) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilter(field, event.target.value || undefined);
      },
    [setFilter],
  );

  return (
    <div
      className="rounded-xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs"
      data-testid="audit-log-filters"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">Filters</h2>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
            onClick={resetFilters}
            data-testid="audit-log-filters-reset"
          >
            Reset all
          </Button>
        )}
      </div>

      {!collapsed && (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Actor ID */}
          <div className="space-y-1.5">
            <Label
              htmlFor="audit-log-filter-actorId"
              className="text-xs font-medium text-muted-foreground"
            >
              Actor ID
            </Label>
            <Input
              id="audit-log-filter-actorId"
              type="text"
              value={getFilter("actorId") ?? ""}
              onChange={handleFieldChange("actorId")}
              placeholder="e.g. user-uuid"
              className="h-9 font-mono text-xs"
              data-testid="audit-log-filter-actorId"
            />
          </div>

          {/* Action */}
          <div className="space-y-1.5">
            <Label
              htmlFor="audit-log-filter-action"
              className="text-xs font-medium text-muted-foreground"
            >
              Action
            </Label>
            <Input
              id="audit-log-filter-action"
              type="text"
              value={getFilter("action") ?? ""}
              onChange={handleFieldChange("action")}
              placeholder="e.g. role.grant"
              className="h-9 font-mono text-xs"
              data-testid="audit-log-filter-action"
            />
          </div>

          {/* Target Type */}
          <div className="space-y-1.5">
            <Label
              htmlFor="audit-log-filter-targetType"
              className="text-xs font-medium text-muted-foreground"
            >
              Target type
            </Label>
            <select
              id="audit-log-filter-targetType"
              value={getFilter("targetType") ?? ""}
              onChange={handleFieldChange("targetType")}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground cursor-pointer"
              data-testid="audit-log-filter-targetType"
            >
              <option value="" className="bg-popover text-popover-foreground">
                All Targets
              </option>
              {TARGET_TYPE_OPTIONS.map((opt) => (
                <option
                  key={opt}
                  value={opt}
                  className="bg-popover text-popover-foreground"
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Target ID */}
          <div className="space-y-1.5">
            <Label
              htmlFor="audit-log-filter-targetId"
              className="text-xs font-medium text-muted-foreground"
            >
              Target ID
            </Label>
            <Input
              id="audit-log-filter-targetId"
              type="text"
              value={getFilter("targetId") ?? ""}
              onChange={handleFieldChange("targetId")}
              placeholder="UUID"
              className="h-9 font-mono text-xs"
              data-testid="audit-log-filter-targetId"
            />
          </div>

          {/* From date */}
          <div className="space-y-1.5">
            <Label
              htmlFor="audit-log-filter-from"
              className="text-xs font-medium text-muted-foreground"
            >
              From Date
            </Label>
            <Input
              id="audit-log-filter-from"
              type="date"
              value={getFilter("from")?.split("T")[0] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  setFilter("from", undefined);
                } else {
                  setFilter("from", `${value}T00:00:00Z`);
                }
              }}
              className="h-9 text-xs dark:[color-scheme:dark]"
              data-testid="audit-log-filter-from"
            />
          </div>

          {/* To date */}
          <div className="space-y-1.5">
            <Label
              htmlFor="audit-log-filter-to"
              className="text-xs font-medium text-muted-foreground"
            >
              To Date
            </Label>
            <Input
              id="audit-log-filter-to"
              type="date"
              value={getFilter("to")?.split("T")[0] ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  setFilter("to", undefined);
                } else {
                  setFilter("to", `${value}T23:59:59Z`);
                }
              }}
              className="h-9 text-xs dark:[color-scheme:dark]"
              data-testid="audit-log-filter-to"
            />
          </div>
        </div>
      )}

      {/* Surface filter presence indicator */}
      {hasActiveFilters && (
        <p
          className="mt-3 font-mono text-xs text-muted-foreground"
          data-testid="audit-log-filters-active-count"
        >
          {Object.values(filters).filter(Boolean).length} filter(s) active
        </p>
      )}
    </div>
  );
}
