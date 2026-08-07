'use client';

/**
 * `useAdminAuditLog.ts`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.C1.
 *
 * ## What this hook owns
 *
 * - Fetch the paginated audit log list through the admin service layer
 *   (`listAuditLog`).
 * - Expose `{ entries, total, hasMore, isLoading, isValidating, error,
 *   mutate }` for the audit log page.
 * - Feature-flag gating via `phase7_admin_audit`.
 * - Handle the degraded path when audit log is not exposed.
 *
 * ## Pagination
 *
 * Audit log uses offset pagination. The hook wraps `useOffsetPaginated`
 * with a fetcher that adapts to the service layer's response shape.
 *
 * ## Degraded path
 *
 * When the backend returns `NOT_EXPOSED` or the feature flag is
 * set to `placeholder`, the hook returns safe fallback data and
 * signals the degraded state through the result.
 */

import { useCallback, useMemo } from 'react';

import useSWR from 'swr';

import { ApiError } from '@/lib/api';
import { getFeatureFlagValue } from '@/lib/feature-flags';

import {
  listAuditLog,
  type AuditLogEntryDto,
  type AuditLogListDto,
  type AuditLogFilters,
  type AuditLogPagination,
} from '../services';

// ─── Constants ─────────────────────────────────────────────────────────────

const AUDIT_LOG_CACHE_KEY = 'admin-audit-log' as const;

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseAdminAuditLogResult {
  /** Audit log entries for the current page. */
  readonly entries: readonly AuditLogEntryDto[];
  /** Total number of entries matching filters. */
  readonly total: number;
  /** True when more pages exist. */
  readonly hasMore: boolean;
  /** True while the first fetch is in flight. */
  readonly isLoading: boolean;
  /** True while revalidating or loading more. */
  readonly isValidating: boolean;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
  /** True when the audit log is not exposed by the backend. */
  readonly isNotExposed: boolean;
  /** Revalidate the list. */
  readonly mutate: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read the paginated admin audit log list.
 *
 * Returns safe fallback when the flag is off or the endpoint is not exposed.
 */
export function useAdminAuditLog(
  filters: AuditLogFilters = {},
  pagination: AuditLogPagination = { offset: 0, limit: 20 },
): UseAdminAuditLogResult {
  const flagValue = getFeatureFlagValue('phase7_admin_audit');
  const isFlagPlaceholder = flagValue === 'placeholder';

  // Build cache key including filters and pagination
  const key = useMemo(
    () =>
      isFlagPlaceholder
        ? ([AUDIT_LOG_CACHE_KEY, 'disabled'] as const)
        : ([AUDIT_LOG_CACHE_KEY, filters, pagination.offset, pagination.limit] as const),
    [isFlagPlaceholder, filters, pagination.offset, pagination.limit],
  );

  const fetcher = useCallback(async (): Promise<AuditLogListDto | null> => {
    if (isFlagPlaceholder) {
      return null;
    }

    try {
      const result = await listAuditLog({ filters, pagination });
      return result;
    } catch (err) {
      // Check if this is a NOT_EXPOSED error
      if (err instanceof ApiError) {
        if (err.code === 'AUDIT_LOG_NOT_EXPOSED') {
          // Return a special marker that will be handled by the hook
          return createNotExposedMarker();
        }
      }
      throw err;
    }
  }, [isFlagPlaceholder, filters, pagination]);

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    AuditLogListDto | null,
    ApiError
  >(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  // Determine if audit log is not exposed
  const isNotExposed = useMemo(() => {
    if (!data) return false;
    return isNotExposedMarker(data);
  }, [data]);

  // Extract entries from response
  const entries = useMemo<readonly AuditLogEntryDto[]>(() => {
    if (!data || isNotExposedMarker(data)) return [];
    return data.data;
  }, [data, isNotExposed]);

  // Extract total from meta
  const total = useMemo(() => {
    if (!data || isNotExposedMarker(data)) return 0;
    return data.meta.total;
  }, [data, isNotExposed]);

  // Determine if there are more pages
  const hasMore = useMemo(() => {
    if (!data || isNotExposedMarker(data)) return false;
    const { offset, limit, total: totalCount } = data.meta;
    return offset + limit < totalCount;
  }, [data, isNotExposed]);

  return {
    entries,
    total,
    hasMore,
    isLoading,
    isValidating,
    error: error ?? null,
    isNotExposed,
    mutate,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────

/**
 * Marker object to indicate audit log is not exposed.
 *
 * This is a workaround since we can't throw from the fetcher
 * and catch it in the hook without losing the data.
 */
const NOT_EXPOSED_MARKER = Symbol('AUDIT_LOG_NOT_EXPOSED');

function createNotExposedMarker(): null & { [NOT_EXPOSED_MARKER]?: true } {
  const marker = null as unknown as null & { [NOT_EXPOSED_MARKER]?: true };
  Object.defineProperty(marker, NOT_EXPOSED_MARKER, { value: true });
  return marker;
}

function isNotExposedMarker(
  data: AuditLogListDto | null,
): data is null & { [NOT_EXPOSED_MARKER]?: true } {
  if (!data) return false;
  return NOT_EXPOSED_MARKER in (data as unknown as Record<string, unknown>);
}
