"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { ApiError, coerceToApiError, isApiError } from "@/lib/api";
import { listInstances } from "@/features/instances/services/instances.service";
import { INSTANCE_CACHE_KEYS } from "@/features/instances/types/instance.types";
import { INSTANCES_NAMESPACE, useSocket } from "@/lib/realtime";
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
  const isSocketEnabled = true;

  const { socket } = useSocket(INSTANCES_NAMESPACE, {
    enabled: isSocketEnabled,
  });

  const key = useMemo(
    () => (INSTANCE_CACHE_KEYS.list(params)),
    [params],
  );

  const fetcher = useCallback(async (): Promise<InstanceListItemDto[]> => {
    const raw = await listInstances(params);
    return extractInstanceItems(raw);
  }, [params]);

  const {
    data,
    error: rawError,
    isLoading,
    refetch,
  } = useQuery<InstanceListItemDto[]>(
    {
      queryKey: key ?? ["instances", "list", "disabled"],
      queryFn: fetcher,
      enabled: true,
      refetchOnWindowFocus: true,
      staleTime: 1000,
    },
    getQueryClient(),
  );

  useEffect(() => {
    if (!socket) return;

    const handlePlayerCountUpdated = (data: {
      instanceId: string;
      playerCount: number;
      status?: string;
    }) => {
      if (!data?.instanceId) return;
      const queryClient = getQueryClient();
      queryClient.setQueriesData<InstanceListItemDto[]>(
        { queryKey: ["instances", "list"] },
        (old) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((item) => {
            if (item.instanceId === data.instanceId) {
              return {
                ...item,
                playerCount: data.playerCount,
                ...(data.status
                  ? { status: data.status as InstanceListItemDto["status"] }
                  : {}),
              };
            }
            return item;
          });
        },
      );
    };

    const handleInstanceClosed = (data: {
      instanceId: string;
      status?: string;
    }) => {
      if (!data?.instanceId) return;
      const terminalStatus =
        data.status === "finished" ? "finished" : "closed";
      const queryClient = getQueryClient();
      queryClient.setQueriesData<InstanceListItemDto[]>(
        { queryKey: ["instances", "list"] },
        (old) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map((item) => {
            if (item.instanceId === data.instanceId) {
              return {
                ...item,
                status: terminalStatus as InstanceListItemDto["status"],
                playerCount: 0,
              };
            }
            return item;
          });
        },
      );
    };

    const handleInstanceCreated = () => {
      void getQueryClient().invalidateQueries({
        queryKey: ["instances", "list"],
      });
    };

    socket.on("instance_player_count_updated", handlePlayerCountUpdated);
    socket.on("instance_closed", handleInstanceClosed);
    socket.on("instance_created", handleInstanceCreated);

    return () => {
      socket.off("instance_player_count_updated", handlePlayerCountUpdated);
      socket.off("instance_closed", handleInstanceClosed);
      socket.off("instance_created", handleInstanceCreated);
    };
  }, [socket]);

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
