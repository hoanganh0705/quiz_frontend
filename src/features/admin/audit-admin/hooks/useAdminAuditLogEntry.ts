"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError } from "@/lib/api";

import { getAuditLogEntry, type AuditLogEntryDto } from "../services";

const AUDIT_LOG_ENTRY_CACHE_KEY = "admin-audit-log-entry" as const;

export interface UseAdminAuditLogEntryResult {
  readonly entry: AuditLogEntryDto | null;

  readonly isLoading: boolean;

  readonly isValidating: boolean;

  readonly error: ApiError | null;
}

export function useAdminAuditLogEntry(
  entryId: string | null,
): UseAdminAuditLogEntryResult {
  const isDisabled = entryId === null;

  const key = useMemo(
    () =>
      isDisabled
        ? ([AUDIT_LOG_ENTRY_CACHE_KEY, "disabled"] as const)
        : ([AUDIT_LOG_ENTRY_CACHE_KEY, entryId] as const),
    [isDisabled, entryId],
  );

  const fetcher = useMemo(
    () =>
      isDisabled
        ? async () => null as unknown as AuditLogEntryDto
        : async (): Promise<AuditLogEntryDto> => {
            return getAuditLogEntry(entryId!);
          },
    [isDisabled, entryId],
  );

  const { data, error, isLoading, isFetching } = useQuery<
    AuditLogEntryDto,
    ApiError
  >(
    {
      queryKey: key,
      queryFn: fetcher,
      enabled: !isDisabled,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    getQueryClient(),
  );

  return {
    entry: data ?? null,
    isLoading: !isDisabled && isLoading && data === undefined,
    isValidating: isFetching,
    error: error ?? null,
  };
}
