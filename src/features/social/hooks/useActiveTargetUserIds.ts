/**
 * `useActiveTargetUserIds` — registration hook that tracks the set of
 * `targetUserId` values currently being rendered by a relationship
 * consumer.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.F2.
 *
 * ## Purpose
 *
 * When the socket reconnects, the `useReconnectReconciliation` hook
 * (TKT-6.10.F2) needs to know which `targetUserId` values the viewer
 * is currently looking at so it can dispatch a per-user
 * re-hydration for `makeRelationshipKey(targetUserId)` and
 * `makeSocialCountsKey(targetUserId)`. Without this set the
 * reconciliation would have to either invalidate every key (slow
 * and wasteful) or maintain a server-side "viewer is looking at
 * X" hint (out of scope).
 *
 * The hook is consumed by:
 *
 *   - `useRelationship(targetUserId)` — calls
 *     `useActiveTargetUserIds(targetUserId)` so the user's profile
 *     page re-hydrates on reconnect.
 *   - `useFriendsList()`, `useFollowers(userId)`, `useFollowing(userId)`
 *     — call `useActiveTargetUserIds(userId)` to keep the list
 *     fresh on reconnect.
 *
 * The hook is intentionally side-effect-only and returns `void`. The
 * active set lives in module-level state so every component
 * participating in a given render shares the same `Set`.
 *
 * ## Set semantics
 *
 * The set is a plain `Set<string>`. Reads and writes are not
 * synchronised across React renders — they are simply synchronous
 * JS operations that complete before the next render. This is
 * safe because the consumer (the reconciliation hook) only reads
 * the set on a `connectionState === 'connected'` transition, which
 * happens between renders.
 *
 * ## SSR
 *
 * The hook no-ops during SSR via the `typeof window === 'undefined'`
 * guard. The active set is empty during SSR by construction.
 *
 * ## Test isolation
 *
 * The set is intentionally module-level so it is shared across
 * consumers. The hook exposes a `__resetActiveTargetUserIdsForTests`
 * helper that the spec uses to clear the set between tests.
 */

"use client";

import { useEffect } from "react";

const ACTIVE_TARGET_USER_IDS_KEY = Symbol.for(
  "phase6_6_10_activeTargetUserIds",
);

interface ActiveTargetUserIdsGlobal {
  set: Set<string>;
}

const globalRef = globalThis as typeof globalThis & {
  [ACTIVE_TARGET_USER_IDS_KEY]?: ActiveTargetUserIdsGlobal;
};

function getActiveSet(): Set<string> {
  if (globalRef[ACTIVE_TARGET_USER_IDS_KEY] === undefined) {
    globalRef[ACTIVE_TARGET_USER_IDS_KEY] = {
      set: new Set<string>(),
    };
  }
  return globalRef[ACTIVE_TARGET_USER_IDS_KEY]!.set;
}

/**
 * Read the current set of active `targetUserId` values. The function
 * is exported so `useReconnectReconciliation` (TKT-6.10.F2) can
 * snapshot the set at the moment a reconnect transition fires.
 */
export function getActiveTargetUserIds(): readonly string[] {
  if (typeof window === "undefined") return [];
  return Array.from(getActiveSet());
}

/**
 * Reset the active set. Intended for unit-test isolation; production
 * code never calls this directly.
 */
export function __resetActiveTargetUserIdsForTests(): void {
  if (globalRef[ACTIVE_TARGET_USER_IDS_KEY] !== undefined) {
    globalRef[ACTIVE_TARGET_USER_IDS_KEY]!.set.clear();
  }
}

/**
 * Register a `targetUserId` for the lifetime of the calling
 * component. The hook adds the id to the module-level active set on
 * mount and removes it on unmount.
 *
 * The hook signature is `useActiveTargetUserIds(targetUserId?: string | null): void`.
 * When `targetUserId` is `null` or `undefined` the hook short-circuits
 * (no registration). When the id changes between renders, the old id
 * is unregistered and the new one is registered in the same effect.
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   useActiveTargetUserIds(userId);
 *   const { data } = useRelationship(userId);
 *   return <RelationshipView relationship={data} />;
 * }
 * ```
 */
export function useActiveTargetUserIds(
  targetUserId: string | null | undefined,
): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (targetUserId === null || targetUserId === undefined) return;
    if (targetUserId.length === 0) return;

    const set = getActiveSet();
    set.add(targetUserId);

    return () => {
      set.delete(targetUserId);
    };
  }, [targetUserId]);
}