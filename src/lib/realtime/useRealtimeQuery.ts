

"use client";

import { useMemo } from "react";
import useSWR, {
type SWRConfiguration,
type SWRResponse,
} from "swr";

import type { Key } from "swr";

import { useRealtimeEvent } from "./useRealtimeEvent";
import { useSocket } from "./useSocket";

export interface RealtimeInvalidationRule {

event: string;

keyToInvalidate: Key;

keyFromPayload?: (payload: unknown) => Key | null;
}

export interface UseRealtimeQueryOptions<T>
extends SWRConfiguration<T, unknown> {

realtimeEnabled?: boolean;
}

function buildDispatcher(swr: SWRResponse<any, any>, eventName: string, ruleGroups: Map<string, RealtimeInvalidationRule[]>): () => void {
return () => {
const rules = ruleGroups.get(eventName);
if (!rules) return;

for (const rule of rules) {
const resolvedKey = rule.keyToInvalidate;
if (resolvedKey === null) continue;
void swr.mutate(resolvedKey, { revalidate: true });
    }
  };
}

export function useRealtimeQuery<T>(
namespace: string,
swrKey: Key | null,
fetcher: (() => Promise<T>) | null,
invalidateOn: RealtimeInvalidationRule[] = [],
swrOptions: UseRealtimeQueryOptions<T> = {},
): SWRResponse<T, unknown> {
const { realtimeEnabled = true, ...swrConfig } = swrOptions;

const swr = useSWR<T>(swrKey, fetcher !== null ? { ...swrConfig, fetcher: fetcher as any } : swrConfig);

const { socket } = useSocket(namespace, {
autoConnect: true,
enabled: realtimeEnabled && swrKey !== null,
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

useRealtimeEvent(socket, uniqueEvents[0] ?? null, buildDispatcher(swr, uniqueEvents[0] ?? "", ruleGroups) as (payload: unknown) => void, { enabled: realtimeEnabled && swrKey !== null && uniqueEvents[0] !== undefined });

useRealtimeEvent(socket, uniqueEvents[1] ?? null, buildDispatcher(swr, uniqueEvents[1] ?? "", ruleGroups) as (payload: unknown) => void, { enabled: realtimeEnabled && swrKey !== null && uniqueEvents[1] !== undefined });

useRealtimeEvent(socket, uniqueEvents[2] ?? null, buildDispatcher(swr, uniqueEvents[2] ?? "", ruleGroups) as (payload: unknown) => void, { enabled: realtimeEnabled && swrKey !== null && uniqueEvents[2] !== undefined });

useRealtimeEvent(socket, uniqueEvents[3] ?? null, buildDispatcher(swr, uniqueEvents[3] ?? "", ruleGroups) as (payload: unknown) => void, { enabled: realtimeEnabled && swrKey !== null && uniqueEvents[3] !== undefined });

useRealtimeEvent(socket, uniqueEvents[4] ?? null, buildDispatcher(swr, uniqueEvents[4] ?? "", ruleGroups) as (payload: unknown) => void, { enabled: realtimeEnabled && swrKey !== null && uniqueEvents[4] !== undefined });

return swr;
}
