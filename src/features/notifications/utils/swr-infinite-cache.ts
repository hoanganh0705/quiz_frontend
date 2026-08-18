"use client";

import type { NotificationListPage } from "@/features/notifications/types/notification.types";

export interface NotificationSWRCache {
keys?: () => IterableIterator<string>;
get: (k: string) => { _k?: unknown; data?: unknown } | undefined;
}

export type NotificationSWRConfigLike = any;

export function findNotificationInfiniteKeys(
cache: unknown,
): string[] {
const matched: string[] = [];
try {
const c = cache as NotificationSWRCache | undefined;
const iter = c?.keys?.bind(c);
if (!iter) return matched;

for (const cacheKey of iter()) {

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

export function buildNotificationListRevalidations(
swrConfig: NotificationSWRConfigLike,
infiniteKeys: readonly string[],
): Promise<unknown>[] {
const revalidations: Promise<unknown>[] = [];
const mutate = swrConfig.mutate;
if (!mutate) return revalidations;
for (const cacheKey of infiniteKeys) {

setInfiniteRevalidateAllFlag(swrConfig.cache, cacheKey);

revalidations.push(mutate(cacheKey, undefined, { revalidate: true }));
  }
return revalidations;
}

export function isNotificationListPage(value: unknown): value is NotificationListPage {
if (!value || typeof value !== "object") return false;
const v = value as { items?: unknown };
return Array.isArray(v.items);
}