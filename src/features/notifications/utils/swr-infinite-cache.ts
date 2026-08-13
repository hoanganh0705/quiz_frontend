"use client";

/**
 * SWRInfinite cache invalidation helpers for notification lists.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 *
 * ## Why these helpers exist
 *
 * `useNotifications` is backed by `useCursorPaginated`, which delegates
 * to `useSWRInfinite`. SWRInfinite registers a real fetcher only on a
 * synthetic aggregate cache key (`$inf$<hash>`); per-page entries in the
 * SWR cache have NO bound revalidator — they are merely a read-through
 * cache that SWRInfinite writes into as pages resolve.
 *
 * Consequence: a predicate-based `globalMutate` that matches
 * `["notifications", "list", <filters>]` only revalidates the per-page
 * keys. SWRInfinite does NOT re-read those per-page entries on the next
 * render cycle — it serves the user from its in-memory `data` array.
 * Without an explicit `mutate(<$inf$hash>, undefined, { revalidate })`,
 * the user sees stale `data` even though the per-page cache was updated.
 *
 * The two-step recipe every notification mutation must follow:
 *
 *   1. Sweep `useSWRConfig().cache` for `$inf$<hash>` entries whose
 *      stored `data[0]` is a `NotificationListPage` (it has `items`).
 *      These are the SWRInfinite aggregate keys for *active* filter
 *      combinations — different filter scopes produce different
 *      `$inf$<hash>` keys, and each scope must be revalidated.
 *   2. For every matched `$inf$<hash>`, call the SWRInfinite-bound
 *      `mutate(key, undefined, { revalidate: true })` so the bound
 *      fetcher re-runs and SWRInfinite rebuilds its `data` from the
 *      fresh per-page entries.
 *
 * Single-item mutations may also want an optimistic splice on the
 * per-page cache for instant UI feedback; the helpers below expose
 * the sweep + revalidation primitives, leaving the optimistic splice
 * to the calling hook so it can shape the splice per-mutation.
 */

import type { NotificationListPage } from "@/features/notifications/types/notification.types";

// ─── Public types ──────────────────────────────────────────────────────────

/**
 * Subset of SWR's `cache` provider we depend on for key enumeration
 * and per-key reads.
 */
export interface NotificationSWRCache {
  keys?: () => IterableIterator<string>;
  get: (k: string) => { _k?: unknown; data?: unknown } | undefined;
}

/**
 * `useSWRConfig()` returns SWR's `FullConfiguration` value. For our
 * revalidation sweep we only need the `cache` and `mutate` members;
 * declaring a structural subset is brittle because SWR's full type
 * has many optional fields whose shapes we cannot reproduce locally.
 *
 * Callers pass the full SWR config; the helper extracts what it
 * needs at runtime and is otherwise a black box.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NotificationSWRConfigLike = any;

// ─── Primitives ────────────────────────────────────────────────────────────

/**
 * Walk the SWR cache for SWRInfinite aggregate keys (`$inf$<hash>`)
 * whose stored `data` array starts with a `NotificationListPage`.
 *
 * SWRInfinite keys always begin with the `$inf$` prefix; the rest of
 * the key is an opaque hash that includes the original SWR key tuple.
 * We do not decode the hash. Instead we rely on the type-shape of
 * `data[0]` (must be an object with `items`) to confirm the entry
 * belongs to the notifications list — every other list backed by
 * `useCursorPaginated` with `NotificationListPage` per page will also
 * match, which is acceptable since they are the same lifecycle.
 *
 * @returns The matched `$inf$<hash>` keys, in cache-iteration order.
 *   Order is not guaranteed to be stable across calls.
 */
export function findNotificationInfiniteKeys(
  cache: unknown,
): string[] {
  const matched: string[] = [];
  try {
    const c = cache as NotificationSWRCache | undefined;
    const iter = c?.keys?.bind(c);
    if (!iter) return matched;

    for (const cacheKey of iter()) {
      // SWRInfinite stores its aggregate cache entries under a synthetic
      // key in the format `$inf$@<key-tuple>`. The `$inf$` prefix is what
      // we use to identify them, and the surrounding `@...` is part of
      // SWR's internal key serialisation. We pass the whole key back to
      // `mutate` exactly as the cache enumerates it, since that is what
      // SWR's internal `cache.set`/`cache.get` is keyed by.
      if (!cacheKey.startsWith("$inf$")) continue;
      const entry = c?.get?.(cacheKey);
      const data = entry?.data;
      if (!Array.isArray(data) || data.length === 0) continue;
      const firstPage = data[0] as { items?: unknown } | null;
      if (
        firstPage &&
        typeof firstPage === "object" &&
        "items" in firstPage
      ) {
        matched.push(cacheKey);
      }
    }
  } catch {
    // Fail-open: return whatever we have so far.
  }
  return matched;
}

/**
 * Set the SWRInfinite `_i` (revalidate-all-pages) flag on a cache entry.
 *
 * SWRInfinite's `useSWRInfinite` fetcher (see
 * `node_modules/swr/infinite/index.mjs`) reads `cache[entry]._i` to
 * decide whether to re-fetch every page on the next revalidation.
 * Without this flag set to `true`, a revalidator triggered via
 * `swrConfig.mutate(<key>, undefined, { revalidate: true })` will
 * short-circuit the SWRInfinite fetcher (it sees `forceRevalidateAll =
 * undefined`) and reuse the cached per-page data — the network call
 * never fires.
 *
 * The bound `mutate` returned by `useSWRInfinite` sets `_i: true` on
 * the cache entry *before* delegating to `useSWR`'s revalidator. We
 * must do the same when revalidating from outside the hook.
 *
 * Implementation note: SWR's default cache provider is a `Map`-like
 * proxy that exposes a `set(key, value)` method. We merge the
 * previous entry with `_i: true` so any existing `_l` (page-size) or
 * `_r` (revalidate-this-page-only) flags survive.
 */
export function setInfiniteRevalidateAllFlag(
  cache: unknown,
  cacheKey: string,
): void {
  try {
    const c = cache as NotificationSWRCache | undefined;
    const prev = c?.get?.(cacheKey);
    if (!prev) return;
    const setOnCache = (cache as { set?: (k: string, v: unknown) => void })
      .set;
    if (typeof setOnCache === "function") {
      setOnCache.call(cache, cacheKey, { ...prev, _i: true });
    }
  } catch {
    // Fail-open: the mutate call below will still trigger the
    // revalidator; without the flag, however, the SWRInfinite fetcher
    // will short-circuit on `shouldFetchPage`.
  }
}

/**
 * Build the revalidation promise list for every cached notification list
 * scope.
 *
 * Combines:
 *
 *   - Setting `_i: true` on each `$inf$<hash>` cache entry so the
 *     SWRInfinite fetcher actually re-fetches every page on the next
 *     revalidation. Without this flag the fetcher short-circuits and
 *     the bound `mutate` call below becomes a no-op for the page
 *     data. See `setInfiniteRevalidateAllFlag`.
 *   - `swrConfig.mutate(<each $inf$<hash>>, undefined, { revalidate })`
 *     — the only call that actually triggers the SWRInfinite fetcher.
 *
 * The caller is expected to `Promise.all` the returned promises.
 */
export function buildNotificationListRevalidations(
  swrConfig: NotificationSWRConfigLike,
  infiniteKeys: readonly string[],
): Promise<unknown>[] {
  const revalidations: Promise<unknown>[] = [];
  const mutate = swrConfig.mutate;
  if (!mutate) return revalidations;
  for (const cacheKey of infiniteKeys) {
    // Step 1: flip the `_i` flag so the SWRInfinite fetcher actually
    // re-fetches. Without this, `mutate(<key>, undefined, { revalidate:
    // true })` calls the revalidator, but the fetcher returns the
    // cached per-page array unchanged.
    setInfiniteRevalidateAllFlag(swrConfig.cache, cacheKey);
    // Step 2: trigger the revalidator. With `_i: true` set, the
    // SWRInfinite fetcher re-runs for every page, the network call
    // fires, and the new data lands in the cache.
    revalidations.push(mutate(cacheKey, undefined, { revalidate: true }));
  }
  return revalidations;
}

/**
 * Helper type guard for runtime values that look like a per-page
 * notification cache entry.
 */
export function isNotificationListPage(value: unknown): value is NotificationListPage {
  if (!value || typeof value !== "object") return false;
  const v = value as { items?: unknown };
  return Array.isArray(v.items);
}