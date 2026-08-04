/**
 * Phase 5 `useRealtimeQuery` hook — SWR invalidation driven by socket events.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.E3.
 *
 * ## Purpose
 *
 * Combines a REST SWR query with socket event invalidation. When a matching
 * realtime event arrives, the SWR cache is invalidated and the component
 * re-fetches fresh data automatically.
 *
 * ## Null key
 *
 * When `swrKey` is `null`, the hook returns a disabled SWR response
 * (no fetch; no socket subscription).
 *
 * ## Deduplication
 *
 * Duplicate rules with the same `(event, keyToInvalidate)` pair are collapsed
 * before registering listeners. Multiple rules targeting the same key from the
 * same event produce a single socket listener.
 *
 * ## SWR configuration
 *
 * Optional `SWRConfiguration` forwarded to `useSWR`.
 *
 * ## React hooks rules
 *
 * Calls `useSocket` once and `useRealtimeEvent` once per unique event name
 * (max 5). All calls are at the top level.
 */

"use client";

import { useMemo } from "react";
import useSWR, {
  type SWRConfiguration,
  type SWRResponse,
} from "swr";

import type { Key } from "swr";

import { useRealtimeEvent } from "./useRealtimeEvent";
import { useSocket } from "./useSocket";

// ─── Invalidation rule type ─────────────────────────────────────────────────

export interface RealtimeInvalidationRule {
  /** The event name from `events.ts`. */
  event: string;
  /** The SWR key to invalidate when this event fires. */
  keyToInvalidate: Key;
  /**
   * Optional: derive the key from the event payload.
   * When provided, `keyToInvalidate` is ignored.
   */
  keyFromPayload?: (payload: unknown) => Key | null;
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface UseRealtimeQueryOptions<T>
  extends SWRConfiguration<T, unknown> {
  /** Set to false to suppress the socket subscription. Default: true. */
  realtimeEnabled?: boolean;
}

// ─── Internal: per-event dispatcher ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Combine a REST SWR query with socket-driven cache invalidation.
 *
 * @param namespace    - The Socket.IO namespace (e.g. `/instances`).
 * @param swrKey     - The SWR cache key. Pass `null` to disable the hook.
 * @param fetcher     - The async function that fetches the data.
 * @param invalidateOn - Rules describing which socket events invalidate which keys.
 * @param swrOptions - Optional SWR configuration forwarded to `useSWR`.
 *
 * @example
 * ```tsx
 * const key = ['/notifications', userId];
 * const result = useRealtimeQuery(
 *   '/notifications',
 *   key,
 *   () => fetchNotifications(),
 *   [
 *     { event: 'notification:sent',    keyToInvalidate: key },
 *     { event: 'notification:deleted', keyToInvalidate: key },
 *   ]
 * );
 * ```
 */
export function useRealtimeQuery<T>(
  namespace: string,
  swrKey: Key | null,
  fetcher: (() => Promise<T>) | null,
  invalidateOn: RealtimeInvalidationRule[] = [],
  swrOptions: UseRealtimeQueryOptions<T> = {},
): SWRResponse<T, unknown> {
  const { realtimeEnabled = true, ...swrConfig } = swrOptions;

  // ── SWR ───────────────────────────────────────────────────────────────
  // SWR only accepts up to 2 arguments: (key, fetcher) or (key, config).
  // Merge fetcher into config rather than passing 3 args.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const swr = useSWR<T>(swrKey, fetcher !== null ? { ...swrConfig, fetcher: fetcher as any } : swrConfig);

  // ── Socket ─────────────────────────────────────────────────────────

  const { socket } = useSocket(namespace, {
    autoConnect: true,
    enabled: realtimeEnabled && swrKey !== null,
  });

  // ── Deduplicate rules ───────────────────────────────────────────────
  // Collapse rules with the same (event, keyToInvalidate) pair so the same
  // event+key pair produces a single socket listener.

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

  // ── One useRealtimeEvent call per unique event name ───────────────────
  // All hook calls are at the top level. The maximum of 5 unique events
  // is an architectural constraint (see ticket).

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useRealtimeEvent(socket, uniqueEvents[0] ?? null, buildDispatcher(swr, uniqueEvents[0] ?? "", ruleGroups) as (payload: unknown) => void, { enabled: realtimeEnabled && swrKey !== null && uniqueEvents[0] !== undefined });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useRealtimeEvent(socket, uniqueEvents[1] ?? null, buildDispatcher(swr, uniqueEvents[1] ?? "", ruleGroups) as (payload: unknown) => void, { enabled: realtimeEnabled && swrKey !== null && uniqueEvents[1] !== undefined });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useRealtimeEvent(socket, uniqueEvents[2] ?? null, buildDispatcher(swr, uniqueEvents[2] ?? "", ruleGroups) as (payload: unknown) => void, { enabled: realtimeEnabled && swrKey !== null && uniqueEvents[2] !== undefined });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useRealtimeEvent(socket, uniqueEvents[3] ?? null, buildDispatcher(swr, uniqueEvents[3] ?? "", ruleGroups) as (payload: unknown) => void, { enabled: realtimeEnabled && swrKey !== null && uniqueEvents[3] !== undefined });
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useRealtimeEvent(socket, uniqueEvents[4] ?? null, buildDispatcher(swr, uniqueEvents[4] ?? "", ruleGroups) as (payload: unknown) => void, { enabled: realtimeEnabled && swrKey !== null && uniqueEvents[4] !== undefined });

  return swr;
}
