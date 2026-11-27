"use client";

import { useCallback, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

import { listAuditLog } from "../services";

import type {
  AuditLogEntryDto,
  AuditLogFilters,
  AuditLogListDto,
  AuditLogPagination,
} from "../services";

const AUDIT_LOG_CACHE_KEY = "admin-audit-log" as const;

type AuditLogQueryResult =
  | { readonly kind: "exposed"; readonly payload: AuditLogListDto }
  | { readonly kind: "not_exposed" };

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
  const key = useMemo(
    () =>
      [
        AUDIT_LOG_CACHE_KEY,
        filters,
        pagination.offset,
        pagination.limit,
      ] as const,
    [filters, pagination.offset, pagination.limit],
  );

  const fetcher = useCallback(async (): Promise<AuditLogQueryResult> => {
    try {
      const payload = await listAuditLog({ filters, pagination });
      return { kind: "exposed", payload };
    } catch (err) {
      if (err instanceof ApiError && err.code === "AUDIT_LOG_NOT_EXPOSED") {
        return { kind: "not_exposed" };
      }
      throw err;
    }
  }, [filters, pagination]);

  const { data, error, isLoading, isFetching, refetch } = useQuery<
    AuditLogQueryResult,
    ApiError
  >(
    {
      queryKey: key,
      queryFn: fetcher,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    getQueryClient(),
  );

  const isNotExposed = data?.kind === "not_exposed";

  const entries = useMemo<readonly AuditLogEntryDto[]>(() => {
    if (!data || data.kind !== "exposed") return [];
    return data.payload.data;
  }, [data]);

  const total = useMemo(() => {
    if (!data || data.kind !== "exposed") return 0;
    return data.payload.meta.total;
  }, [data]);

  const hasMore = useMemo(() => {
    if (!data || data.kind !== "exposed") return false;
    const { offset, limit, total: totalCount } = data.payload.meta;
    return offset + limit < totalCount;
  }, [data]);

  return {
    entries,
    total,
    hasMore,
    isLoading: isLoading && data === undefined,
    isValidating: isFetching,
    error: error ?? null,
    isNotExposed,
    mutate: () => {
      void refetch();
    },
  };
}
