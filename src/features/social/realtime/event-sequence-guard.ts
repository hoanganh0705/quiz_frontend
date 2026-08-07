/**
 * `EventSequenceGuard` — per-pair monotonic counter for socket events.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.D2.
 *
 * ## Purpose
 *
 * Drops out-of-order events that would invalidate the relationship
 * state machine. The guard is keyed on
 * `(eventType, actorUserId, targetUserId)` (NOT including
 * `correlationId` — that is the dedup key in TKT-6.10.D1) and tracks
 * the last accepted `sequence` per key.
 *
 * `accept(key, sequence)` returns `'allow'` when `sequence >
 * lastAcceptedSequence` and `'drop'` when `sequence ≤
 * lastAcceptedSequence`. The counter advances only on `'allow'`.
 *
 * ## Sentry telemetry
 *
 * The class is pure with respect to Sentry — `accept` returns the
 * decision only. The caller is responsible for logging the Sentry
 * soft warning when the decision is `'drop'`, tagged with
 * `category: 'phase6:6.10:sequence-guard-drop'` (see
 * `phase6_sentry` helpers, TKT-6.10.G2).
 *
 * ## State survives reconnects within the tab session
 *
 * The `Map<SequenceKey, number>` is held in memory for the lifetime
 * of the tab. There is no automatic `clear()` — a socket reconnect
 * does NOT reset the counters because out-of-order events are still
 * out-of-order regardless of the transport. Callers who explicitly
 * want to reset (e.g., on logout) call `clear()` themselves.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The key string format is `${eventType}::${actorUserId}::${targetUserId}`;
 * the lint script
 * (`scripts/phase6-lint-invariants.mjs`, TKT-6.10.G3) greps every
 * file under `src/features/social/realtime/` for `friendshipId` /
 * `followId` and fails the build if any field is added. The class
 * has no way to enforce the invariant on the wire payload; it is
 * enforced by the lint script and by caller convention.
 */

"use client";

import { createContext, useContext } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * The decision returned by `EventSequenceGuard.accept()`.
 *
 *   - `'allow'` — the event's sequence is strictly greater than
 *                 the last accepted sequence for the key; the
 *                 counter advances.
 *   - `'drop'`  — the event's sequence is less than or equal to
 *                 the last accepted sequence; the counter does not
 *                 advance.
 */
export type SequenceGuardDecision = "allow" | "drop";

/**
 * The string format for the per-pair key. Callers construct the key
 * before calling `accept()`; the class does NOT parse the key.
 */
export type SequenceKey = `${string}::${string}::${string}`;

/**
 * Public interface for the guard. Defined as an interface so the
 * singleton consumer (the `RealtimeSocialShell` provider, TKT-
 * 6.10.G1) can inject a no-op or in-memory implementation
 * interchangeably.
 */
export interface EventSequenceGuardInterface {
  accept(key: SequenceKey, sequence: number): SequenceGuardDecision;
  clear(): void;
  size(): number;
}

// ─── Class ────────────────────────────────────────────────────────────────────

/**
 * Per-pair monotonic sequence counter.
 *
 * The class is a plain class (not a React component) so it can be
 * unit-tested in isolation. The single-instance-per-tab invariant
 * is enforced by the `useEventSequenceGuard()` hook, which reads
 * the singleton from the `RealtimeSocialShell` context
 * (TKT-6.10.G1).
 *
 * @example
 * ```ts
 * const guard = new EventSequenceGuard();
 * guard.accept("relationship.changed::a::b", 1); // 'allow'
 * guard.accept("relationship.changed::a::b", 2); // 'allow'
 * guard.accept("relationship.changed::a::b", 2); // 'drop'
 * ```
 */
export class EventSequenceGuard implements EventSequenceGuardInterface {
  private readonly counters = new Map<SequenceKey, number>();

  accept(key: SequenceKey, sequence: number): SequenceGuardDecision {
    const last = this.counters.get(key) ?? 0;
    if (sequence <= last) return "drop";
    this.counters.set(key, sequence);
    return "allow";
  }

  clear(): void {
    this.counters.clear();
  }

  size(): number {
    return this.counters.size;
  }
}

// ─── React context ────────────────────────────────────────────────────────────

/**
 * The React context that carries the guard singleton. Defined here
 * alongside the class so the class and its consumer hook live in a
 * single module; the `RealtimeSocialShell` provider (TKT-6.10.G1)
 * owns the actual provider implementation.
 *
 * Default value is `null`; the hook throws when no provider is in
 * the tree. Tests inject a stub via the exported context plus the
 * `createRealtimeSocialStubContext` factory
 * (`__tests__/realtime-test-harness.ts`).
 */
export const EventSequenceGuardContext =
  createContext<EventSequenceGuardInterface | null>(null);

/**
 * Hook that returns the singleton `EventSequenceGuard` from the
 * `RealtimeSocialShell` context. Throws when no provider is in the
 * tree (the sequence invariant is meaningless without a singleton).
 */
export function useEventSequenceGuard(): EventSequenceGuardInterface {
  const guard = useContext(EventSequenceGuardContext);
  if (guard === null) {
    throw new Error(
      "useEventSequenceGuard must be called inside a <RealtimeSocialShell> provider. " +
        "Wrap your tree in <RealtimeSocialShell> from " +
        "'@/features/social/realtime/realtime-social-shell' (TKT-6.10.G1).",
    );
  }
  return guard;
}