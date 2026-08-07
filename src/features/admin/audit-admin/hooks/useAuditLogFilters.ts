'use client';

/**
 * `useAuditLogFilters.ts`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.C3.
 *
 * ## What this hook owns
 *
 * - Manage audit log filter state in URL query parameters.
 * - Provide typed filter getters and setters.
 * - Handle initial URL state parsing and validation.
 * - Reset filters on navigation.
 *
 * ## URL state management
 *
 * Filters are persisted in URL search params for:
 * - Shareable URLs (bookmarkable)
 * - Browser back/forward navigation
 * - Deep linking
 *
 * The URL params used are:
 * - `actorId` — Filter by actor's user ID
 * - `action` — Filter by action type
 * - `targetType` — Filter by target entity type
 * - `targetId` — Filter by target entity ID
 * - `from` — Start of date range (ISO 8601)
 * - `to` — End of date range (ISO 8601)
 */

import { useCallback, useMemo } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import type {
  AuditLogFilters,
  AuditLogFilterField,
} from '../types';
import {
  DEFAULT_AUDIT_LOG_FILTERS,
} from '../types';
import {
  isValidActorId,
  isValidTargetId,
  isValidAction,
  isValidTargetType,
  isValidFromDate,
  isValidToDate,
  isValidDateRange,
} from '../utils';

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseAuditLogFiltersResult {
  /** Current filter values. */
  readonly filters: AuditLogFilters;
  /** True if any filter is active. */
  readonly hasActiveFilters: boolean;
  /** Set a single filter value. */
  readonly setFilter: (field: AuditLogFilterField, value: string | undefined) => void;
  /** Set multiple filter values at once. */
  readonly setFilters: (filters: Partial<AuditLogFilters>) => void;
  /** Reset all filters to defaults. */
  readonly resetFilters: () => void;
  /** Get a single filter value. */
  readonly getFilter: (field: AuditLogFilterField) => string | undefined;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Manage audit log filter state via URL query parameters.
 *
 * @returns Filter state and manipulation functions.
 */
export function useAuditLogFilters(): UseAuditLogFiltersResult {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Parse initial filters from URL
  const filters = useMemo<AuditLogFilters>(() => {
    const parsed: AuditLogFilters = {};

    const actorId = searchParams.get('actorId') ?? undefined;
    const action = searchParams.get('action') ?? undefined;
    const targetType = searchParams.get('targetType') ?? undefined;
    const targetId = searchParams.get('targetId') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;

    // Validate and only set if valid
    if (actorId && isValidActorId(actorId)) {
      (parsed as Record<string, unknown>).actorId = actorId;
    }
    if (action && isValidAction(action)) {
      (parsed as Record<string, unknown>).action = action;
    }
    if (targetType && isValidTargetType(targetType)) {
      (parsed as Record<string, unknown>).targetType = targetType;
    }
    if (targetId && isValidTargetId(targetId)) {
      (parsed as Record<string, unknown>).targetId = targetId;
    }
    if (from && isValidFromDate(from)) {
      (parsed as Record<string, unknown>).from = from;
    }
    if (to && isValidToDate(to)) {
      (parsed as Record<string, unknown>).to = to;
    }

    return parsed;
  }, [searchParams]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.actorId ||
      filters.targetId ||
      filters.action ||
      filters.targetType ||
      filters.from ||
      filters.to
    );
  }, [filters]);

  // Update URL with new filters
  const updateUrl = useCallback(
    (newFilters: Partial<AuditLogFilters>) => {
      const params = new URLSearchParams();

      // Merge with existing filters
      const merged: AuditLogFilters = {
        ...filters,
        ...newFilters,
      };

      // Set params for non-empty values
      if (merged.actorId) params.set('actorId', merged.actorId);
      if (merged.action) params.set('action', merged.action);
      if (merged.targetType) params.set('targetType', merged.targetType);
      if (merged.targetId) params.set('targetId', merged.targetId);
      if (merged.from) params.set('from', merged.from);
      if (merged.to) params.set('to', merged.to);

      // Navigate to new URL
      const queryString = params.toString();
      router.push(queryString ? `?${queryString}` : '/admin/audit', {
        scroll: false,
      });
    },
    [filters, router],
  );

  // Set a single filter
  const setFilter = useCallback(
    (field: AuditLogFilterField, value: string | undefined) => {
      updateUrl({ [field]: value || undefined });
    },
    [updateUrl],
  );

  // Set multiple filters at once
  const setFilters = useCallback(
    (newFilters: Partial<AuditLogFilters>) => {
      updateUrl(newFilters);
    },
    [updateUrl],
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    router.push('/admin/audit', { scroll: false });
  }, [router]);

  // Get a single filter value
  const getFilter = useCallback(
    (field: AuditLogFilterField): string | undefined => {
      return filters[field];
    },
    [filters],
  );

  return {
    filters,
    hasActiveFilters,
    setFilter,
    setFilters,
    resetFilters,
    getFilter,
  };
}
