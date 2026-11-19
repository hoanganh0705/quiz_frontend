"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";
import { listInstances } from "@/features/instances/services/instances.service";
import { INSTANCE_CACHE_KEYS } from "@/features/instances/types/instance.types";
import { getFeatureFlagValue } from "@/lib/feature-flags";
import type {
  InstanceListItemDto,
  ListInstancesParams,
} from "@/lib/api/generated/schemas";

export interface UseListInstancesResult {
  instances: InstanceListItemDto[];
  isLoading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

export function extractInstanceItems(data: unknown): InstanceListItemDto[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    if (
      data.length > 0 &&
      typeof data[0] === "object" &&
      data[0] !== null &&
      "items" in data[0] &&
      Array.isArray((data[0] as { items: unknown }).items)
    ) {
      return (data as { items: InstanceListItemDto[] }[]).flatMap(
        (d) => d.items,
      );
    }
    return data as InstanceListItemDto[];
  }
  if (
    typeof data === "object" &&
    data !== null &&
    "items" in data &&
    Array.isArray((data as { items: unknown }).items)
  ) {
    return (data as { items: InstanceListItemDto[] }).items;
  }
  return [];
}

export function useListInstances(
  params?: ListInstancesParams,
): UseListInstancesResult {
  const flagValue = getFeatureFlagValue("multiplayer_instances_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const key = useMemo(
    () => (isFlagPlaceholder ? null : INSTANCE_CACHE_KEYS.list(params)),
    [isFlagPlaceholder, params],
  );

  const fetcher = useCallback(async (): Promise<InstanceListItemDto[]> => {
    if (isFlagPlaceholder) {
      return [];
    }
    const raw = await listInstances(params);
    return extractInstanceItems(raw);
  }, [isFlagPlaceholder, params]);

  const {
    data,
    error: rawError,
    isLoading,
    refetch,
  } = useQuery<InstanceListItemDto[]>(
    {
      queryKey: key ?? ["instances", "list", "disabled"],
      queryFn: fetcher,
      enabled: !isFlagPlaceholder,
      refetchOnWindowFocus: true,
      staleTime: 1000,
    },
    getQueryClient(),
  );

  const error = useMemo(() => {
    if (!rawError) return null;
    return isApiError(rawError) ? rawError : coerceToApiError(rawError);
  }, [rawError]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    instances: data ?? [],
    isLoading,
    error,
    refresh,
  };
}
