'use client';

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

export interface UseAuditLogFiltersResult {

readonly filters: AuditLogFilters;

readonly hasActiveFilters: boolean;

readonly setFilter: (field: AuditLogFilterField, value: string | undefined) => void;

readonly setFilters: (filters: Partial<AuditLogFilters>) => void;

readonly resetFilters: () => void;

readonly getFilter: (field: AuditLogFilterField) => string | undefined;
}

export function useAuditLogFilters(): UseAuditLogFiltersResult {
const searchParams = useSearchParams();
const router = useRouter();

const filters = useMemo<AuditLogFilters>(() => {
const parsed: AuditLogFilters = {};

const actorId = searchParams.get('actorId') ?? undefined;
const action = searchParams.get('action') ?? undefined;
const targetType = searchParams.get('targetType') ?? undefined;
const targetId = searchParams.get('targetId') ?? undefined;
const from = searchParams.get('from') ?? undefined;
const to = searchParams.get('to') ?? undefined;

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

const updateUrl = useCallback(
(newFilters: Partial<AuditLogFilters>) => {
const params = new URLSearchParams();

const merged: AuditLogFilters = {
...filters,
...newFilters,
      };

if (merged.actorId) params.set('actorId', merged.actorId);
if (merged.action) params.set('action', merged.action);
if (merged.targetType) params.set('targetType', merged.targetType);
if (merged.targetId) params.set('targetId', merged.targetId);
if (merged.from) params.set('from', merged.from);
if (merged.to) params.set('to', merged.to);

const queryString = params.toString();
router.push(queryString ? `?${queryString}` : '/admin/audit', {
scroll: false,
      });
    },
[filters, router],
  );

const setFilter = useCallback(
(field: AuditLogFilterField, value: string | undefined) => {
updateUrl({ [field]: value || undefined });
    },
[updateUrl],
  );

const setFilters = useCallback(
(newFilters: Partial<AuditLogFilters>) => {
updateUrl(newFilters);
    },
[updateUrl],
  );

const resetFilters = useCallback(() => {
router.push('/admin/audit', { scroll: false });
  }, [router]);

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
