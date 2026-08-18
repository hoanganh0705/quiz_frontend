'use client';

import { useMemo } from 'react';

import useSWR from 'swr';

import { ApiError } from '@/lib/api';
import { getFeatureFlagValue } from '@/lib/feature-flags';

import {
getAuditLogEntry,
type AuditLogEntryDto,
} from '../services';

const AUDIT_LOG_ENTRY_CACHE_KEY = 'admin-audit-log-entry' as const;

export interface UseAdminAuditLogEntryResult {

readonly entry: AuditLogEntryDto | null;

readonly isLoading: boolean;

readonly isValidating: boolean;

readonly error: ApiError | null;
}

export function useAdminAuditLogEntry(
entryId: string | null,
): UseAdminAuditLogEntryResult {
const flagValue = getFeatureFlagValue('admin_audit_live');
const isFlagPlaceholder = flagValue === 'placeholder';

const isDisabled = isFlagPlaceholder || entryId === null;

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
