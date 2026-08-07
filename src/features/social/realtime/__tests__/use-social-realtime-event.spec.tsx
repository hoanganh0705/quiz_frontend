/**
 * Spec for `useSocialRealtimeEvent` (TKT-6.10.E7).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E7.
 *
 * Locks the shared listener wrapper contract:
 *   - Accepted event → `dispatch` callback fires with the typed payload.
 *   - Deduplicated event → `dispatch` is skipped; Sentry breadcrumb
 *     tagged `deduplicated: true` is emitted.
 *   - Out-of-order event → `dispatch` is skipped; breadcrumb tagged
 *     `sequenceGuard: 'drop'` is emitted.
 *   - Malformed event → `dispatch` is skipped; breadcrumb with the
 *     validation reason is emitted.
 *   - Unmount cleanup → the socket listener is removed.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EventDeduplicatorContext,
  type EventDeduplicatorInterface,
} from "../event-deduplicator";
import {
  EventSequenceGuardContext,
  type EventSequenceGuardInterface,
} from "../event-sequence-guard";
import {
  useSocialRealtimeEvent,
} from "../use-social-realtime-event";

import {
  createRealtimeSocialStubSocket,
  type RealtimeSocialStubSocket,
} from "./realtime-test-harness";

// ─── Stub primitives ───────────────────────────────────────────────────────

function makeDedupStub(): EventDeduplicatorInterface {
  const seen = new Set<string>();
  return {
    has: (key) => seen.has(key),
    add: (key) => {
      seen.add(key);
    },
    clear: () => seen.clear(),
    size: () => seen.size,
  };
}

function makeSequenceStub(): EventSequenceGuardInterface {
  const counters = new Map<string, number>();
  return {
    accept(key, sequence) {
      const last = counters.get(key) ?? 0;
      if (sequence <= last) return "drop";
      counters.set(key, sequence);
      return "allow";
    },
    clear: () => counters.clear(),
    size: () => counters.size,
  };
}

// ─── Sentry mock ────────────────────────────────────────────────────────────

const breadcrumbCalls: Array<{
  category: string;
  data: Record<string, unknown>;
}> = [];

vi.mock("@/lib/social/phase6_6_10_sentry", () => ({
  addSocialRealtimeBreadcrumb: (data: {
    eventType: string;
    actorUserId?: string;
    targetUserId?: string;
    correlationId?: string;
    deduplicated?: boolean;
    sequenceGuard?: "allow" | "drop";
    reason?: string;
  }) => {
    breadcrumbCalls.push({ category: "phase6:6.10", data: data as unknown as Record<string, unknown> });
  },
  EPIC_6_10_BREADCRUMB_CATEGORY: "phase6:6.10" as const,
  EPIC_6_10_VERSION: "1.0.0" as const,
  EPIC_6_10_RECONNECT_CATEGORY: "phase6:6.10:reconnect-reconciliation" as const,
  addReconnectReconciliationBreadcrumb: () => undefined,
  phase6Social10Breadcrumb: () => undefined,
}));

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildRelationshipChangedPayload(overrides?: {
  correlationId?: string;
  changedAt?: string;
}) {
  return {
    version: 1,
    actorUserId: "11111111-1111-4111-8111-111111111111",
    targetUserId: "22222222-2222-4222-8222-222222222222",
    correlationId: overrides?.correlationId ?? "corr-1",
    relationship: "friend",
    previousRelationship: "none",
    changedAt: overrides?.changedAt ?? "2026-08-07T09:41:00.000Z",
  };
}

function renderWithProviders(
  node: React.ReactNode,
  options: {
    dedup?: EventDeduplicatorInterface;
    sequenceGuard?: EventSequenceGuardInterface;
  } = {},
) {
  const dedup = options.dedup ?? makeDedupStub();
  const sequenceGuard = options.sequenceGuard ?? makeSequenceStub();
  return {
    dedup,
    sequenceGuard,
    ...render(
      <EventDeduplicatorContext.Provider value={dedup}>
        <EventSequenceGuardContext.Provider value={sequenceGuard}>
          {node}
        </EventSequenceGuardContext.Provider>
      </EventDeduplicatorContext.Provider>,
    ),
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("useSocialRealtimeEvent — shared listener wrapper (TKT-6.10.E7)", () => {
  let stub: RealtimeSocialStubSocket;

  beforeEach(() => {
    breadcrumbCalls.length = 0;
    stub = createRealtimeSocialStubSocket();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("registers a socket listener on mount and removes it on unmount", () => {
    const dispatch = vi.fn();

    function Probe() {
      useSocialRealtimeEvent(stub, "relationship.changed", dispatch);
      return null;
    }

    const { unmount } = renderWithProviders(<Probe />);
    expect(stub.record.onCalls.length).toBe(1);
    expect(stub.record.onCalls[0]?.event).toBe("relationship.changed");

    unmount();
    expect(stub.record.offCalls.length).toBe(1);
    expect(stub.record.offCalls[0]?.event).toBe("relationship.changed");
  });

  it("calls dispatch with the validated payload when the event passes the trio", () => {
    const dispatch = vi.fn();

    function Probe() {
      useSocialRealtimeEvent(stub, "relationship.changed", dispatch);
      return null;
    }

    renderWithProviders(<Probe />);

    const payload = buildRelationshipChangedPayload();
    // `useRealtimeEvent` unwraps `{ event, data }` envelopes — emit the
    // structured socket frame so the wrapper receives the bare payload.
    stub._emit("relationship.changed", { event: "relationship.changed", data: payload });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(payload);

    const acceptedBreadcrumbs = breadcrumbCalls.filter(
      (b) => b.data.sequenceGuard === "allow",
    );
    expect(acceptedBreadcrumbs.length).toBe(1);
    expect(acceptedBreadcrumbs[0]?.data.eventType).toBe("relationship.changed");
  });

  it("skips dispatch when the dedup primitive reports a duplicate", () => {
    const dispatch = vi.fn();
    const dedup = makeDedupStub();
    const sequenceGuard = makeSequenceStub();

    function Probe() {
      useSocialRealtimeEvent(stub, "relationship.changed", dispatch);
      return null;
    }

    renderWithProviders(<Probe />, { dedup, sequenceGuard });

    const payload = buildRelationshipChangedPayload({ correlationId: "corr-dup" });

    // Pre-seed the dedup with the exact key the wrapper will build.
    dedup.add(
      `relationship.changed::${payload.actorUserId}::${payload.targetUserId}::${payload.correlationId}`,
    );

    stub._emit("relationship.changed", { event: "relationship.changed", data: payload });
    expect(dispatch).not.toHaveBeenCalled();

    const dedupBreadcrumb = breadcrumbCalls.find(
      (b) => b.data.deduplicated === true,
    );
    expect(dedupBreadcrumb).toBeDefined();
    expect(dedupBreadcrumb?.data.eventType).toBe("relationship.changed");
  });

  it("skips dispatch when the sequence guard returns 'drop'", () => {
    const dispatch = vi.fn();
    const dedup = makeDedupStub();
    const sequenceGuard = makeSequenceStub();

    function Probe() {
      useSocialRealtimeEvent(stub, "relationship.changed", dispatch);
      return null;
    }

    renderWithProviders(<Probe />, { dedup, sequenceGuard });

    // Pre-seed the sequence counter with a higher value so the next
    // event's derived timestamp falls below it → 'drop'.
    sequenceGuard.accept(
      `relationship.changed::11111111-1111-4111-8111-111111111111::22222222-2222-4222-8222-222222222222`,
      Number.MAX_SAFE_INTEGER,
    );

    const payload = buildRelationshipChangedPayload();
    stub._emit("relationship.changed", { event: "relationship.changed", data: payload });

    expect(dispatch).not.toHaveBeenCalled();

    const dropBreadcrumb = breadcrumbCalls.find(
      (b) => b.data.sequenceGuard === "drop",
    );
    expect(dropBreadcrumb).toBeDefined();
    expect(dropBreadcrumb?.data.eventType).toBe("relationship.changed");
  });

  it("skips dispatch and emits a validation-failure breadcrumb for a malformed payload", () => {
    const dispatch = vi.fn();

    function Probe() {
      useSocialRealtimeEvent(stub, "relationship.changed", dispatch);
      return null;
    }

    renderWithProviders(<Probe />);

    // Missing `actorUserId` → validator returns `{ ok: false, reason: 'malformed' }`.
    stub._emit("relationship.changed", {
      event: "relationship.changed",
      data: {
        version: 1,
        targetUserId: "22222222-2222-4222-8222-222222222222",
        correlationId: "corr-malformed",
        relationship: "friend",
        previousRelationship: "none",
        changedAt: "2026-08-07T09:41:00.000Z",
      },
    });

    expect(dispatch).not.toHaveBeenCalled();

    const malformedBreadcrumb = breadcrumbCalls.find(
      (b) => b.data.reason === "malformed",
    );
    expect(malformedBreadcrumb).toBeDefined();
  });

  it("skips dispatch when `enabled: false` is passed", () => {
    const dispatch = vi.fn();

    function Probe() {
      useSocialRealtimeEvent(stub, "relationship.changed", dispatch, {
        enabled: false,
      });
      return null;
    }

    renderWithProviders(<Probe />);

    expect(stub.record.onCalls.length).toBe(0);

    stub._emit("relationship.changed", {
      event: "relationship.changed",
      data: buildRelationshipChangedPayload(),
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("accepts events whose payload is wrapped in a `{ data: ... }` frame", () => {
    // The wrapper additionally defensively unwraps a `{ data: ... }` shape
    // in case a caller passes the wrapped frame directly to `_emit`
    // (bypassing `useRealtimeEvent`'s envelope unwrapping).
    const dispatch = vi.fn();

    function Probe() {
      useSocialRealtimeEvent(stub, "relationship.changed", dispatch);
      return null;
    }

    renderWithProviders(<Probe />);

    const payload = buildRelationshipChangedPayload();
    stub._emit("relationship.changed", { data: payload });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(payload);
  });
});
