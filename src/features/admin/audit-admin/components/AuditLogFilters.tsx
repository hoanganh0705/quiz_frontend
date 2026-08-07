'use client';

/**
 * `AuditLogFilters.tsx`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.D4.
 *
 * ## What this component owns
 *
 * Filter form for audit log search:
 *   - Actor ID (text input)
 *   - Action (text input)
 *   - Target type (dropdown)
 *   - Target ID (text input)
 *   - Date range (from / to)
 *   - Reset filters button
 *
 * Filter changes update URL state via `useAuditLogFilters` hook.
 */

import { useCallback } from 'react';

import { useAuditLogFilters } from '../hooks/useAuditLogFilters';

import type { AuditLogFilterField } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const TARGET_TYPE_OPTIONS = [
  'user',
  'tournament',
  'tag',
  'category',
  'achievement',
  'comment',
  'review',
] as const;

// ─── Props ──────────────────────────────────────────────────────────────────

export interface AuditLogFiltersProps {
  /** Whether the filter form is collapsed. */
  collapsed?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AuditLogFilters({
  collapsed = false,
}: AuditLogFiltersProps): React.ReactElement {
  const {
    filters,
    hasActiveFilters,
    setFilter,
    resetFilters,
    getFilter,
  } = useAuditLogFilters();

  const handleFieldChange = useCallback(
    (field: AuditLogFilterField) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilter(field, event.target.value || undefined);
      },
    [setFilter],
  );

  return (
    <div
      className="rounded-md border border-border bg-background p-4"
      data-testid="audit-log-filters"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-foreground">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary"
            onClick={resetFilters}
            data-testid="audit-log-filters-reset"
          >
            Reset
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Actor ID */}
          <div>
            <label
              htmlFor="audit-log-filter-actorId"
              className="block text-xs font-medium text-muted-foreground"
            >
              Actor ID
            </label>
            <input
              id="audit-log-filter-actorId"
              type="text"
              value={getFilter('actorId') ?? ''}
              onChange={handleFieldChange('actorId')}
              placeholder="UUID"
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="audit-log-filter-actorId"
            />
          </div>

          {/* Action */}
          <div>
            <label
              htmlFor="audit-log-filter-action"
              className="block text-xs font-medium text-muted-foreground"
            >
              Action
            </label>
            <input
              id="audit-log-filter-action"
              type="text"
              value={getFilter('action') ?? ''}
              onChange={handleFieldChange('action')}
              placeholder="role.grant"
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="audit-log-filter-action"
            />
          </div>

          {/* Target Type */}
          <div>
            <label
              htmlFor="audit-log-filter-targetType"
              className="block text-xs font-medium text-muted-foreground"
            >
              Target type
            </label>
            <select
              id="audit-log-filter-targetType"
              value={getFilter('targetType') ?? ''}
              onChange={handleFieldChange('targetType')}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="audit-log-filter-targetType"
            >
              <option value="">All</option>
              {TARGET_TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Target ID */}
          <div>
            <label
              htmlFor="audit-log-filter-targetId"
              className="block text-xs font-medium text-muted-foreground"
            >
              Target ID
            </label>
            <input
              id="audit-log-filter-targetId"
              type="text"
              value={getFilter('targetId') ?? ''}
              onChange={handleFieldChange('targetId')}
              placeholder="UUID"
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="audit-log-filter-targetId"
            />
          </div>

          {/* From date */}
          <div>
            <label
              htmlFor="audit-log-filter-from"
              className="block text-xs font-medium text-muted-foreground"
            >
              From
            </label>
            <input
              id="audit-log-filter-from"
              type="date"
              value={getFilter('from')?.split('T')[0] ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  setFilter('from', undefined);
                } else {
                  setFilter('from', `${value}T00:00:00Z`);
                }
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="audit-log-filter-from"
            />
          </div>

          {/* To date */}
          <div>
            <label
              htmlFor="audit-log-filter-to"
              className="block text-xs font-medium text-muted-foreground"
            >
              To
            </label>
            <input
              id="audit-log-filter-to"
              type="date"
              value={getFilter('to')?.split('T')[0] ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) {
                  setFilter('to', undefined);
                } else {
                  setFilter('to', `${value}T23:59:59Z`);
                }
              }}
              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="audit-log-filter-to"
            />
          </div>
        </div>
      )}

      {/* Hidden: surface filter presence indicator */}
      {hasActiveFilters && (
        <p
          className="mt-2 text-xs text-muted-foreground"
          data-testid="audit-log-filters-active-count"
        >
          {Object.values(filters).filter(Boolean).length} filter(s) active
        </p>
      )}
    </div>
  );
}