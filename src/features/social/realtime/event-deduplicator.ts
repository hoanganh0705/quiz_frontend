/**
 * `EventDeduplicator` — LRU-capped `Set` primitive for socket-event dedup keys.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.D1.
 *
 * ## Purpose
 *
 * Owns the per-tab `Set<string>` of seen `dedupKey` values. The
 * `dedupKey` is the canonical Epic 6.7.G1 / 6.8.G3 contract:
 *
 * ```ts
 * `${type}::${actorUserId}::${targetUserId}::${correlationId}`
 * ```
 *
 * The class exposes `has`, `add`, `clear`, and `size`. When the set
 * reaches 200 entries the **oldest** entry is evicted (FIFO; LRU
 * approximation). Insertion-order iteration on `Set` is guaranteed
 * by the ES spec.
 *
 * ## Single-instance-per-tab
 *
 * The class is provided to listener hooks via the
 * `RealtimeSocialShell` provider (TKT-6.10.G1) and consumed through
 * the `useEventDeduplicator()` hook. The singleton is held by the
 * provider; multiple hooks share the same instance so the dedup
 * budget is global to the tab.
 *
 * ## Why FIFO and not strict LRU
 *
 * Strict LRU requires updating the position of a key on every read,
 * which is `O(n)` and would defeat the `O(1)` invariant on `has` /
 * `add`. FIFO is the documented Epic 6.7.G1 / 6.8.G3 convention and
 * is sufficient for the 200-key budget; a strict LRU is a future
 * optimisation.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The class does NOT construct the dedupKey itself — callers pass
 * the precomputed key. The lint script
 * (`scripts/social-lint-invariants.mjs`, TKT-6.10.G3) greps every
 * file under `src/features/social/realtime/` for `friendshipId` /
 * `followId` and fails the build if any field is added. The
 * `dedupKey` is `string`, so the class has no way to enforce the
 * invariant; it is enforced by the lint script and by caller
 * convention.
 */

"use client";

import { createContext, useContext } from "react";

// ─── Class ────────────────────────────────────────────────────────────────────

/**
 * Maximum number of dedup keys held in memory before the oldest is
 * evicted. Matches the Epic 6.7.G1 / 6.8.G3 spec.
 */
export const EVENT_DEDUP_CAP = 200;

/**
 * Public interface for the deduplicator. Defined as an interface so
 * the singleton consumer (the `RealtimeSocialShell` provider, TKT-
 * 6.10.G1) can inject a no-op or in-memory implementation
 * interchangeably.
 */
export interface EventDeduplicatorInterface {
  has(key: string): boolean;
  add(key: string): void;
  clear(): void;
  size(): number;
}

/**
 * LRU-capped `Set<string>` for socket-event dedup keys.
 *
 * The class is intentionally a plain class (not a React component)
 * so it can be unit-tested in isolation. The single-instance-per-tab
 * invariant is enforced by the `useEventDeduplicator()` hook, which
 * reads the singleton from the `RealtimeSocialShell` context
 * (TKT-6.10.G1).
 *
 * @example
 * ```ts
 * const dedup = new EventDeduplicator();
 * dedup.add("relationship.changed::a::b::c");
 * dedup.has("relationship.changed::a::b::c"); // true
 * ```
 */
export class EventDeduplicator implements EventDeduplicatorInterface {
  private readonly keys = new Set<string>();

  has(key: string): boolean {
    return this.keys.has(key);
  }

  add(key: string): void {
    // Delete first so re-adding an existing key moves it to the
    // back of the insertion-order queue (true LRU semantics).
    if (this.keys.has(key)) {
      this.keys.delete(key);
    } else if (this.keys.size >= EVENT_DEDUP_CAP) {
      // Evict the oldest entry. `Set` iteration is insertion-order;
      // the first value is the oldest.
      const oldest = this.keys.values().next().value;
      if (oldest !== undefined) this.keys.delete(oldest);
    }
    this.keys.add(key);
  }

  clear(): void {
    this.keys.clear();
  }

  size(): number {
    return this.keys.size;
  }
}

// ─── React context ────────────────────────────────────────────────────────────

/**
 * The React context that carries the deduplicator singleton. Defined
 * here alongside the class so the class and its consumer hook live
 * in a single module; the `RealtimeSocialShell` provider
 * (TKT-6.10.G1) owns the actual provider implementation.
 *
 * Default value is `null`; the hook throws when no provider is in
 * the tree. Tests inject a stub via the exported context plus the
 * `createRealtimeSocialStubContext` factory
 * (`__tests__/realtime-test-harness.ts`).
 */
export const EventDeduplicatorContext =
  createContext<EventDeduplicatorInterface | null>(null);

/**
 * Hook that returns the singleton `EventDeduplicator` from the
 * `RealtimeSocialShell` context. Throws when no provider is in the
 * tree (the dedup invariant is meaningless without a singleton).
 */
export function useEventDeduplicator(): EventDeduplicatorInterface {
  const dedup = useContext(EventDeduplicatorContext);
  if (dedup === null) {
    throw new Error(
      "useEventDeduplicator must be called inside a <RealtimeSocialShell> provider. " +
        "Wrap your tree in <RealtimeSocialShell> from " +
        "'@/features/social/realtime/realtime-social-shell' (TKT-6.10.G1).",
    );
  }
  return dedup;
}