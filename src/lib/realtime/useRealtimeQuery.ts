"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { useRealtimeEvent } from "./useRealtimeEvent";
import { useSocket } from "./useSocket";

export type RealtimeQueryKey = readonly unknown[] | string;

export interface RealtimeInvalidationRule {
  event: string;
  keyToInvalidate: RealtimeQueryKey | null;
  keyFromPayload?: (payload: unknown) => RealtimeQueryKey | null;
}

export interface UseRealtimeQueryOptions<T> {
  realtimeEnabled?: boolean;
  revalidateOnFocus?: boolean;
  staleTime?: number;
  [key: string]: unknown;
}

export interface RealtimeQueryResult<T> {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (
    data?: any,
    shouldRevalidate?: boolean | { revalidate?: boolean },
  ) => Promise<T | undefined>;
}

function normalizeKey(key: RealtimeQueryKey | null): readonly unknown[] | null {
  if (key === null) return null;
  if (Array.isArray(key)) return key;
  return [key];
}

export function useRealtimeQuery<T>(
  namespace: string,
  key: RealtimeQueryKey | null,
  fetcher: (() => Promise<T>) | null,
  invalidateOn: RealtimeInvalidationRule[] = [],
  options: UseRealtimeQueryOptions<T> = {},
): RealtimeQueryResult<T> {
  const { realtimeEnabled = true, revalidateOnFocus = false } = options;
  const queryClient = getQueryClient();
  const normalizedKey = normalizeKey(key);
  const enabled = normalizedKey !== null && fetcher !== null;

  const query = useQuery(
    {
      queryKey: (normalizedKey ?? [
        "__realtime_query_disabled__",
      ]) as readonly unknown[],
      queryFn: async () => {
        if (!fetcher) return undefined as unknown as T;
        return fetcher();
      },
      enabled,
      refetchOnWindowFocus: revalidateOnFocus,
    },
    queryClient,
  );

  const { socket } = useSocket(namespace, {
    autoConnect: true,
    enabled: realtimeEnabled && normalizedKey !== null,
  });

  const { uniqueEvents, ruleGroups } = useMemo(() => {
    const seen = new Map<string, RealtimeInvalidationRule>();
    const uniqueEvents: string[] = [];
    const ruleGroups = new Map<string, RealtimeInvalidationRule[]>();

    for (const rule of invalidateOn) {
      const ruleKey = `${rule.event}::${String(rule.keyToInvalidate)}`;
      if (!seen.has(ruleKey)) {
        seen.set(ruleKey, rule);
        uniqueEvents.push(rule.event);
        ruleGroups.set(rule.event, [rule]);
      } else {
        ruleGroups.get(rule.event)!.push(rule);
      }
    }

    return { uniqueEvents, ruleGroups };
  }, [invalidateOn]);

  const dispatchInvalidation = useCallback(
    (eventName: string) => {
      const rules = ruleGroups.get(eventName);
      if (!rules) return;

      for (const rule of rules) {
        const resolvedKey = normalizeKey(rule.keyToInvalidate);
        if (resolvedKey === null) continue;
        void queryClient.invalidateQueries({ queryKey: resolvedKey });
      }
    },
    [queryClient, ruleGroups],
  );

  useRealtimeEvent(
    socket,
    uniqueEvents[0] ?? null,
    useCallback(
      () => dispatchInvalidation(uniqueEvents[0] ?? ""),
      [dispatchInvalidation, uniqueEvents],
    ),
    {
      enabled:
        realtimeEnabled &&
        normalizedKey !== null &&
        uniqueEvents[0] !== undefined,
    },
  );

  useRealtimeEvent(
    socket,
    uniqueEvents[1] ?? null,
    useCallback(
      () => dispatchInvalidation(uniqueEvents[1] ?? ""),
      [dispatchInvalidation, uniqueEvents],
    ),
    {
      enabled:
        realtimeEnabled &&
        normalizedKey !== null &&
        uniqueEvents[1] !== undefined,
    },
  );

  useRealtimeEvent(
    socket,
    uniqueEvents[2] ?? null,
    useCallback(
      () => dispatchInvalidation(uniqueEvents[2] ?? ""),
      [dispatchInvalidation, uniqueEvents],
    ),
    {
      enabled:
        realtimeEnabled &&
        normalizedKey !== null &&
        uniqueEvents[2] !== undefined,
    },
  );

  useRealtimeEvent(
    socket,
    uniqueEvents[3] ?? null,
    useCallback(
      () => dispatchInvalidation(uniqueEvents[3] ?? ""),
      [dispatchInvalidation, uniqueEvents],
    ),
    {
      enabled:
        realtimeEnabled &&
        normalizedKey !== null &&
        uniqueEvents[3] !== undefined,
    },
  );

  useRealtimeEvent(
    socket,
    uniqueEvents[4] ?? null,
    useCallback(
      () => dispatchInvalidation(uniqueEvents[4] ?? ""),
      [dispatchInvalidation, uniqueEvents],
    ),
    {
      enabled:
        realtimeEnabled &&
        normalizedKey !== null &&
        uniqueEvents[4] !== undefined,
    },
  );

  const mutate = useCallback(
    async (
      newData?: any,
      shouldRevalidate?: boolean | { revalidate?: boolean },
    ): Promise<T | undefined> => {
      if (normalizedKey && newData !== undefined) {
        queryClient.setQueryData(normalizedKey, newData);
      }
      const doRevalidate =
        typeof shouldRevalidate === "boolean"
          ? shouldRevalidate
          : shouldRevalidate?.revalidate !== false;
      if (doRevalidate) {
        const res = await query.refetch();
        return res.data;
      }
      return query.data;
    },
    [normalizedKey, query, queryClient],
  );

  return {
    data: query.data,
    error: query.error ?? undefined,
    isLoading: query.isLoading,
    isValidating: query.isFetching,
    mutate,
  };
}
