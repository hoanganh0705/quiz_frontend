/**
 * Test harness for the social realtime layer.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.B2.
 *
 * ## Purpose
 *
 * The seven listener hooks of Story 6.10 (`useRelationshipInvalidation`,
 * `useFriendRequestInvalidation`, `useFollowInvalidation`,
 * `useBlockInvalidation`, `useSocialFeedInvalidation`,
 * `useNotificationEventRouter`, plus the shared `useSocialRealtimeEvent`
 * helper) all consume the Phase 5 `/notifications` socket. To test them
 * in isolation, the harness provides:
 *
 *   1. `createRealtimeSocialStubSocket()` — a stubbed Socket.IO socket
 *      that records every `on` / `off` / `emit` / `disconnect` call and
 *      lets tests drive synthetic events through `_emit()`.
 *   2. `createRealtimeSocialStubContext()` — a stubbed
 *      `RealtimeSocialShell` context providing the `EventDeduplicator`
 *      and `EventSequenceGuard` singletons. Both are real (not mocks) —
 *      the singletons in production are imported into the harness so
 *      the listener-hook specs exercise the same dedup / sequence logic
 *      they will exercise in production.
 *
 * ## In-process
 *
 * The harness does not require a live backend. All socket behavior is
 * recorded in-memory; tests assert against the recorded calls.
 *
 * ## Why a harness and not a `vi.mock`
 *
 * `vi.mock` would require every consumer spec to re-establish the mock.
 * The harness provides a single importable factory that returns the same
 * shape the Phase 5 `useSocket` hook returns, so consumer specs can
 * `import { createRealtimeSocialStubSocket } from "@/features/social/realtime/__tests__/realtime-test-harness"`
 * and inject the stub into the listener hook's `useSocket` mock in a
 * single line.
 *
 * ## Scope
 *
 * This harness covers Batches C–G of Epic 6.10. It is intentionally
 * scoped to the social realtime layer; it does not replace the Phase 5
 * `useSocket.spec.tsx` mock infrastructure.
 */

// ─── Stub socket factory ──────────────────────────────────────────────────────

import type { Socket } from "@/lib/realtime/socket-adapter";

/**
 * The internal record of every `on` / `off` / `emit` / `disconnect`
 * call made on a stub socket. Tests assert against this record; the
 * synthetic event driver `_emit()` lives on the same object.
 */
export interface RealtimeSocialStubSocketRecord {
  /** Every `(eventName, handler)` pair registered via `.on()`. */
  onCalls: Array<{ event: string; handlerIndex: number }>;
  /** Every `(eventName, handler)` pair removed via `.off()`. */
  offCalls: Array<{ event: string; handlerIndex: number }>;
  /** Every payload sent via `.emit()`. */
  emitCalls: Array<{ event: string; payload: unknown }>;
  /** Every `.disconnect()` call. */
  disconnectCalls: number;
  /** Every `.connect()` call. */
  connectCalls: number;
}

/**
 * The stub socket returned by `createRealtimeSocialStubSocket()`.
 *
 * Exposes:
 *
 *   - The Phase 5 `Socket` surface (`on`, `off`, `emit`, `disconnect`,
 *     `connect`, `connected`).
 *   - The internal `record` for assertions.
 *   - A `_emit(event, ...args)` driver so tests can synthesize events
 *     that the listener hooks have subscribed to.
 */
export interface RealtimeSocialStubSocket extends Socket {
  /** Recorded calls; mutate freely in tests. */
  record: RealtimeSocialStubSocketRecord;
  /** Drive a synthetic Socket.IO event through the registered handlers. */
  _emit: (event: string, ...args: unknown[]) => void;
  /** Reset the recorded calls without re-registering handlers. */
  _reset: () => void;
}

/**
 * Create a stubbed Socket.IO socket for testing the social realtime layer.
 *
 * The returned socket has the same shape as the Phase 5 `Socket` type so it
 * can be passed directly into `vi.spyOn(createSocket, '...').mockReturnValue(...)`
 * from a listener-hook spec.
 *
 * @returns A `RealtimeSocialStubSocket` whose `record` field tracks every
 *          call for assertions.
 *
 * @example
 * ```ts
 * const stub = createRealtimeSocialStubSocket();
 * vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(stub);
 *
 * renderHook(() => useFriendRequestInvalidation());
 *
 * stub._emit("connect");
 * stub._emit("friend.request.received", {
 *   event: "friend.request.received",
 *   data: { /* payload *\/ },
 * });
 * expect(stub.record.emitCalls).toEqual([]);
 * ```
 */
export function createRealtimeSocialStubSocket(): RealtimeSocialStubSocket {
  const record: RealtimeSocialStubSocketRecord = {
    onCalls: [],
    offCalls: [],
    emitCalls: [],
    disconnectCalls: 0,
    connectCalls: 0,
  };

  // Each entry is the handler registered for a given event. We keep the
  // handlers in insertion order so `_emit` dispatches in registration
  // order — matching Socket.IO semantics.
  const handlers = new Map<string, Array<(...args: unknown[]) => void>>();
  let handlerCounter = 0;
  // Map from handler identity → stable index for assertions.
  const handlerIndex = new Map<(...args: unknown[]) => void, number>();

  // Internal-only interface — does NOT extend the Socket.IO Socket
  // type because Socket has ~50 internal fields we don't need. The
  // final return value is asserted to `RealtimeSocialStubSocket`
  // (which DOES extend Socket) using a single `as unknown as` cast
  // at the boundary, mirroring the pattern in
  // `lib/realtime/__tests__/useSocket.spec.tsx` line 46.
  interface InternalStub {
    on<Ev extends string>(
      event: Ev,
      handler: (...args: unknown[]) => void,
    ): InternalStub;
    off<Ev extends string>(
      event: Ev,
      handler: (...args: unknown[]) => void,
    ): InternalStub;
    emit(event: string, payload?: unknown): InternalStub;
    disconnect(): InternalStub;
    connect(): InternalStub;
    connected: boolean;
    record: RealtimeSocialStubSocketRecord;
    _emit(event: string, ...args: unknown[]): void;
    _reset(): void;
  }

  const stub: InternalStub = {
    on(event, handler) {
      record.onCalls.push({ event, handlerIndex: handlerCounter });
      handlerIndex.set(handler, handlerCounter);
      handlerCounter += 1;
      const list = handlers.get(event);
      if (list) {
        list.push(handler);
      } else {
        handlers.set(event, [handler]);
      }
      return stub;
    },
    off(event, handler) {
      const index = handlerIndex.get(handler);
      if (index !== undefined) {
        record.offCalls.push({ event, handlerIndex: index });
      }
      const list = handlers.get(event);
      if (list) {
        const idx = list.indexOf(handler);
        if (idx >= 0) list.splice(idx, 1);
      }
      return stub;
    },
    emit(event, payload) {
      record.emitCalls.push({ event, payload });
      return stub;
    },
    disconnect() {
      record.disconnectCalls += 1;
      return stub;
    },
    connect() {
      record.connectCalls += 1;
      return stub;
    },
    connected: false,
    record,
    _emit(event, ...args) {
      const list = handlers.get(event);
      if (!list) return;
      // Copy the list so handlers that register / unregister during dispatch
      // don't mutate the iteration.
      for (const handler of [...list]) {
        handler(...args);
      }
    },
    _reset() {
      record.onCalls.length = 0;
      record.offCalls.length = 0;
      record.emitCalls.length = 0;
      record.disconnectCalls = 0;
      record.connectCalls = 0;
    },
  };

  // The single boundary cast: the stub is structurally a Socket, and
  // Phase 5's `useSocket` hook only ever calls `on`, `off`, `emit`,
  // `disconnect`, `connect`, and reads `connected`. The rest of the
  // Socket.IO surface (io, id, _pid, _lastOffset, …) is never touched
  // in the social realtime layer.
  return stub as unknown as RealtimeSocialStubSocket;
}

// ─── Stub context factory ─────────────────────────────────────────────────────

/**
 * The shape of the `RealtimeSocialShell` context (TKT-6.10.G1). The
 * exact field set will be finalized when TKT-6.10.G1 lands; this
 * harness provides a forward-compatible shape that every listener hook
 * in Batches C–G can consume.
 *
 * Note: at the time TKT-6.10.B2 lands, `EventDeduplicator` and
 * `EventSequenceGuard` do not yet exist (they land in TKT-6.10.D1 and
 * TKT-6.10.D2 respectively). The harness provides **placeholder**
 * implementations that satisfy the same minimal contract — `has`,
 * `add`, `clear`, `size` for the dedup; `accept`, `clear`, `size` for
 * the sequence guard — so listener-hook specs can be authored in
 * parallel with the primitives' arrival. When TKT-6.10.D1 / D2 land,
 * the harness is updated to import the real singletons.
 */
export interface RealtimeSocialStubDedup {
  has(key: string): boolean;
  add(key: string): void;
  clear(): void;
  size(): number;
}

export interface RealtimeSocialStubSequenceGuard {
  accept(key: string, sequence: number): "allow" | "drop";
  clear(): void;
  size(): number;
}

export interface RealtimeSocialStubContext {
  /** Stubbed dedup primitive — `has` / `add` / `clear` / `size`. */
  dedup: RealtimeSocialStubDedup;
  /** Stubbed sequence guard — `accept` / `clear` / `size`. */
  sequenceGuard: RealtimeSocialStubSequenceGuard;
  /** Reset both primitives to their initial state. */
  reset(): void;
}

/**
 * Create a stubbed `RealtimeSocialShell` context for testing the
 * social realtime layer in isolation.
 *
 * The dedup primitive uses an in-memory `Set<string>` capped at 200
 * entries (matching the production cap documented in Epic 6.7.G1 /
 * Epic 6.8.G3 deferral notes). The sequence guard tracks a monotonic
 * counter per key and accepts strictly-increasing sequences.
 *
 * @returns A `RealtimeSocialStubContext` whose `reset()` method clears
 *          both primitives.
 */
export function createRealtimeSocialStubContext(): RealtimeSocialStubContext {
  // Per-tab dedup set — capped at 200 keys (matches production).
  const dedupSet = new Set<string>();
  const DEDUP_CAP = 200;

  // Per-pair monotonic sequence counter.
  const sequenceCounters = new Map<string, number>();

  const dedup: RealtimeSocialStubDedup = {
    has(key: string) {
      return dedupSet.has(key);
    },
    add(key: string) {
      if (dedupSet.size >= DEDUP_CAP) {
        // Evict the oldest entry (insertion order).
        const oldest = dedupSet.values().next().value;
        if (oldest !== undefined) dedupSet.delete(oldest);
      }
      dedupSet.add(key);
    },
    clear() {
      dedupSet.clear();
    },
    size() {
      return dedupSet.size;
    },
  };

  const sequenceGuard: RealtimeSocialStubSequenceGuard = {
    accept(key: string, sequence: number) {
      const last = sequenceCounters.get(key) ?? 0;
      if (sequence <= last) return "drop";
      sequenceCounters.set(key, sequence);
      return "allow";
    },
    clear() {
      sequenceCounters.clear();
    },
    size() {
      return sequenceCounters.size;
    },
  };

  return {
    dedup,
    sequenceGuard,
    reset() {
      dedup.clear();
      sequenceGuard.clear();
    },
  };
}

// ─── Tab-id helper ────────────────────────────────────────────────────────────

/**
 * Get a stable, in-process tab id for cross-tab propagation tests.
 *
 * Real cross-tab propagation uses `getCurrentTabId()` from
 * `@/lib/api/core/broadcast-channel` (Phase 2). For tests that need a
 * deterministic tab id without depending on `sessionStorage`, this
 * helper returns the supplied `tabId` if provided, otherwise a freshly
 * generated one.
 *
 * @param tabId - Optional explicit tab id.
 * @returns A stable string suitable for use as a `tabId` discriminator
 *          in `cross-tab-invalidation` invalidation envelopes.
 */
export function makeStubTabId(tabId?: string): string {
  if (tabId !== undefined) return tabId;
  // Generate a short, unique-looking id without `crypto.randomUUID`
  // (which is jsdom-flaky in older jsdom versions).
  return `stub-${Math.random().toString(36).slice(2, 10)}`;
}
