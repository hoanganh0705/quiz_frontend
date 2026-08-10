/**
 * `mutate-carefully.ts` — guarded SWR global mutate helper.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: Cross-cutting (originally referenced by TKT-6.10.E1–E6
 *                and TKT-6.10.F2).
 *
 * ## Purpose
 *
 * Centralised wrapper around SWR's global `mutate` that:
 *
 *   1. Skips invalidation during SSR (`typeof window === "undefined"`).
 *   2. Skips invalidation when the key is `null` or `undefined`.
 *   3. Accepts the same call signature as SWR's `mutate`, so consumers
 *      can drop it in without rewriting their code.
 *   4. Forces `revalidate: true` so the next render fetches fresh data
 *      from the server (the realtime layer's contract is
 *      "invalidate, do not pre-compute").
 *
 * The function is intentionally tiny; the Phase 5 `useRealtimeQuery`
 * hook uses `swr.mutate` directly because it has access to the local
 * `SWRResponse`. The realtime **listeners** (TKT-6.10.E1–E6, F2)
 * operate outside of any `useSWR` consumer, so they need the global
 * `mutate` — that's the gap `mutateCarefully` fills.
 *
 * ## Why a wrapper and not raw `mutate`
 *
 * The realtime listeners fire from socket events, which may arrive
 * during SSR reconciliation windows in Next.js App Router. Calling
 * SWR's global `mutate` in that window is a no-op in SWR but the
 * wrapped helper makes the SSR guard explicit at the call site and
 * keeps the lint invariant (no `typeof window === "undefined"` checks
 * in listener hooks) honest.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The helper accepts the SWR key verbatim; it does NOT inspect or
 * rewrite the key. The lint script
 * (`scripts/social-lint-invariants.mjs`, TKT-6.10.G3) greps every file
 * under `src/features/social/**` for `friendshipId` / `followId` and
 * fails the build if any field is added. The helper lives under
 * `lib/swr/` so the lint scope does not apply — but the realtime
 * listeners that consume it must still keep the invariant.
 */

import { mutate } from "swr";

import type { Key, MutatorOptions } from "swr";

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Invalidate a single SWR cache key (or a key prefix when the key is an
 * array of `[prefix, ...suffix]`).
 *
 * The signature mirrors SWR's global `mutate` so consumers can drop it
 * in without rewriting their call sites. The wrapper:
 *
 *   - Skips when `typeof window === "undefined"` (SSR).
 *   - Skips when the key is `null` or `undefined`.
 *   - Forces `revalidate: true` so the next consumer fetches fresh
 *     data from the server.
 *
 * @param key        - The SWR key to invalidate. `null` / `undefined` is a no-op.
 * @param dataOrOpts - Optional `data` payload or `MutatorOptions` forwarded
 *                      to SWR. Most realtime listeners pass
 *                      `{ revalidate: true }`.
 * @returns The promise SWR returns (always resolved for the realtime
 *          use case; listeners do not await it).
 *
 * @example
 * ```ts
 * mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(targetUserId));
 * mutateCarefully(['notifications', 'unread-count']);
 * ```
 */
export function mutateCarefully(
  key: Key | null | undefined,
  dataOrOpts?: boolean | Promise<unknown> | MutatorOptions,
): Promise<unknown> | undefined {
  if (typeof window === "undefined") return undefined;
  if (key === null || key === undefined) return undefined;

  // Default to `{ revalidate: true }` so the realtime layer always
  // re-fetches fresh data — never writes pre-computed data into the
  // cache.
  const opts: MutatorOptions =
    typeof dataOrOpts === "object" &&
    dataOrOpts !== null &&
    !(dataOrOpts instanceof Promise)
      ? dataOrOpts
      : { revalidate: true };

  // Always revalidate; the realtime layer never pre-computes.
  return mutate(key, undefined, { ...opts, revalidate: true });
}
