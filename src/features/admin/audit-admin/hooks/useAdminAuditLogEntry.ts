'use client';

/**
 * `useAdminAuditLogEntry.ts`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.C2.
 *
 * ## What this hook owns
 *
 * - Fetch a single audit log entry by ID through the admin service layer
 *   (`getAuditLogEntry`).
 * - Expose `{ entry, isLoading, isValidating, error }` for the
 *   audit log detail panel.
 * - Feature-flag gating via `admin_audit_live`.
 */

import { useMemo } from 'react';

import useSWR from 'swr';

import { ApiError } from '@/lib/api';
import { getFeatureFlagValue } from '@/lib/feature-flags';

import {
  getAuditLogEntry,
  type AuditLogEntryDto,
} from '../services';

// ─── Constants ─────────────────────────────────────────────────────────────

const AUDIT_LOG_ENTRY_CACHE_KEY = 'admin-audit-log-entry' as const;

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseAdminAuditLogEntryResult {
  /** The audit log entry, if loaded. */
  readonly entry: AuditLogEntryDto | null;
  /** True while the fetch is in flight. */
  readonly isLoading: boolean;
  /** True while revalidating. */
  readonly isValidating: boolean;
  /** The most recent error, if any. */
  readonly error: ApiError | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Read a single admin audit log entry by ID.
 *
 * Returns safe fallback when the flag is off or entryId is null.
 */
export function useAdminAuditLogEntry(
  entryId: string | null,
): UseAdminAuditLogEntryResult {
  const flagValue = getFeatureFlagValue('admin_audit_live');
  const isFlagPlaceholder = flagValue === 'placeholder';

  const isDisabled = isFlagPlaceholder || entryId === null;

  // Build cache key
  const key = useMemo(
    () =>
      isDisabled
        ? ([AUDIT_LOG_ENTRY_CACHE_KEY, 'disabled'] as const)
        : ([AUDIT_LOG_ENTRY_CACHE_KEY, entryId] as const),
    [isDisabled, entryId],
  );

  const fetcher = useMemo(
    () =>
      isDisabled
        ? null
        : async (): Promise<AuditLogEntryDto> => {
            return getAuditLogEntry(entryId!);
          },
    [isDisabled, entryId],
  );

  const { data, error, isLoading, isValidating } = useSWR<
    AuditLogEntryDto,
    ApiError
  >(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    entry: data ?? null,
    isLoading,
    isValidating,
    error: error ?? null,
  };
}
