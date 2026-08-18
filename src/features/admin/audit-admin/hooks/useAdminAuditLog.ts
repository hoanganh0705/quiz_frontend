'use client';

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

const AUDIT_LOG_CACHE_KEY = 'admin-audit-log' as const;

export interface UseAdminAuditLogResult {

readonly entries: readonly AuditLogEntryDto[];

readonly total: number;

readonly hasMore: boolean;

readonly isLoading: boolean;

readonly isValidating: boolean;

readonly error: ApiError | null;

readonly isNotExposed: boolean;

readonly mutate: () => void;
}

export function useAdminAuditLog(
filters: AuditLogFilters = {},
pagination: AuditLogPagination = { offset: 0, limit: 20 },
): UseAdminAuditLogResult {
const flagValue = getFeatureFlagValue('admin_audit_live');
const isFlagPlaceholder = flagValue === 'placeholder';

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

if (err instanceof ApiError) {
if (err.code === 'AUDIT_LOG_NOT_EXPOSED') {

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

const isNotExposed = useMemo(() => {
if (!data) return false;
return isNotExposedMarker(data);
  }, [data]);

const entries = useMemo<readonly AuditLogEntryDto[]>(() => {
if (!data || isNotExposedMarker(data)) return [];
return data.data;
  }, [data, isNotExposed]);

const total = useMemo(() => {
if (!data || isNotExposedMarker(data)) return 0;
return data.meta.total;
  }, [data, isNotExposed]);

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
