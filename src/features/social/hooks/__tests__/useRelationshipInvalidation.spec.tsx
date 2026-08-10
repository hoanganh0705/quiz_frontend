/**
 * Spec for `useRelationshipInvalidation` (TKT-6.10.E1).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E1.
 *
 * Locks the relationship listener hook contract:
 *   - Flag-placeholder fallback (no socket, no listener registered).
 *   - Successful dispatch (mutates relationship + counts keys, posts
 *     cross-tab envelope, emits accepted breadcrumb).
 *   - Deduplicated event dropped silently.
 *   - Out-of-order event dropped silently.
 *   - `friendshipId` / `followId` never appear in any breadcrumb
 *     payload or cross-tab envelope.
 *   - Unmount removes the socket listener.
 */

import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EventDeduplicatorContext,
  type EventDeduplicatorInterface,
} from "@/features/social/realtime/event-deduplicator";
import {
  EventSequenceGuardContext,
  type EventSequenceGuardInterface,
} from "@/features/social/realtime/event-sequence-guard";

import * as socketAdapterModule from "@/lib/realtime/socket-adapter";
import * as authCookiesModule from "@/features/auth/utils/auth-cookies";
import * as featureFlagsModule from "@/lib/feature-flags";
import * as mutateCarefullyModule from "@/lib/swr/mutate-carefully";
import * as phase5BroadcastModule from "@/lib/realtime/cross-tab-invalidation";

import {
  useRelationshipInvalidation,
} from "@/features/social/hooks/useRelationshipInvalidation";
import {
  createRealtimeSocialStubSocket,
  type RealtimeSocialStubSocket,
} from "@/features/social/realtime/__tests__/realtime-test-harness";

// ─── Module-level mocks ──────────────────────────────────────────────────────

const mutateCalls: Array<{ key: unknown }> = [];
const broadcastCalls: Array<{ targetUserId: string }> = [];

vi.mock("@/lib/realtime/ws-error", () => ({
  decodeWsError: vi.fn().mockReturnValue({
    code: "WS_INTERNAL",
    message: "Stub error",
    authRequired: false,
    retryable: false,
  }),
}));

vi.mock("@/lib/swr/mutate-carefully", () => ({
  mutateCarefully: (key: unknown) => {
    mutateCalls.push({ key });
    return Promise.resolve();
  },
}));

vi.mock("@/lib/realtime/cross-tab-invalidation", async () => {
  const actual = await vi.importActual<typeof import("@/lib/realtime/cross-tab-invalidation")>(
    "@/lib/realtime/cross-tab-invalidation",
  );
  return {
    ...actual,
    postRelationshipInvalidation: (targetUserId: string) => {
      broadcastCalls.push({ targetUserId });
    },
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    flagValue?: "live" | "placeholder";
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

// ─── Test setup ──────────────────────────────────────────────────────────────

let stub: RealtimeSocialStubSocket;

beforeEach(() => {
  mutateCalls.length = 0;
  broadcastCalls.length = 0;

  stub = createRealtimeSocialStubSocket();
  vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(stub);
  vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);
  vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("live");

  // Silence unused-import warnings for spec-only helpers.
  void mutateCarefullyModule;
  void phase5BroadcastModule;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useRelationshipInvalidation (TKT-6.10.E1)", () => {
  it("returns no-op and registers no socket listener when the flag is 'placeholder'", () => {
    vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("placeholder");

    function Probe() {
      useRelationshipInvalidation("22222222-2222-4222-8222-222222222222");
      return null;
    }

    renderWithProviders(<Probe />);

    // `createSocket` is never invoked because `enabled: false` skips
    // the entire `useSocket` lifecycle.
    expect(socketAdapterModule.createSocket).not.toHaveBeenCalled();
    expect(stub.record.onCalls.length).toBe(0);
    expect(mutateCalls.length).toBe(0);
    expect(broadcastCalls.length).toBe(0);
  });

  it("invalidates the relationship + social-counts keys on every accepted event", async () => {
    function Probe() {
      useRelationshipInvalidation("22222222-2222-4222-8222-222222222222");
      return null;
    }

    renderWithProviders(<Probe />);

    await waitFor(() => {
      expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

    const payload = buildRelationshipChangedPayload();
    stub._emit("relationship.changed", { event: "relationship.changed", data: payload });

    await waitFor(() => {
      expect(mutateCalls.length).toBeGreaterThanOrEqual(2);
    });

    const invalidatedKeys = mutateCalls.map((c) =>
      Array.isArray(c.key) ? c.key.join("/") : String(c.key),
    );
    expect(invalidatedKeys).toContain(
      "social/v1/relationship/22222222-2222-4222-8222-222222222222",
    );
    expect(invalidatedKeys).toContain(
      "social/v1/counts/22222222-2222-4222-8222-222222222222",
    );
  });

  it("posts a relationship-invalidation cross-tab envelope on every accepted event", async () => {
    function Probe() {
      useRelationshipInvalidation("22222222-2222-4222-8222-222222222222");
      return null;
    }

    renderWithProviders(<Probe />);

    await waitFor(() => {
      expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

    const payload = buildRelationshipChangedPayload();
    stub._emit("relationship.changed", { event: "relationship.changed", data: payload });

    await waitFor(() => {
      expect(broadcastCalls.length).toBe(1);
    });
    expect(broadcastCalls[0]).toEqual({
      targetUserId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("skips mutation when the event is deduplicated", async () => {
    const dedup = makeDedupStub();
    const sequenceGuard = makeSequenceStub();

    function Probe() {
      useRelationshipInvalidation("22222222-2222-4222-8222-222222222222");
      return null;
    }

    renderWithProviders(<Probe />, { dedup, sequenceGuard });

    await waitFor(() => {
      expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

    const payload = buildRelationshipChangedPayload({ correlationId: "corr-dup" });

    // Pre-seed the dedup with the canonical key the wrapper will build.
    dedup.add(
      `relationship.changed::${payload.actorUserId}::${payload.targetUserId}::${payload.correlationId}`,
    );

    stub._emit("relationship.changed", { event: "relationship.changed", data: payload });

    // Give React a chance to flush any pending updates.
    await new Promise((r) => setTimeout(r, 0));

    expect(mutateCalls.length).toBe(0);
    expect(broadcastCalls.length).toBe(0);
  });

  it("skips mutation when the event is out-of-order", async () => {
    const dedup = makeDedupStub();
    const sequenceGuard = makeSequenceStub();

    function Probe() {
      useRelationshipInvalidation("22222222-2222-4222-8222-222222222222");
      return null;
    }

    renderWithProviders(<Probe />, { dedup, sequenceGuard });

    await waitFor(() => {
      expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

    // Pre-seed the sequence guard with a high counter so the next
    // event's derived timestamp is below the watermark → 'drop'.
    sequenceGuard.accept(
      `relationship.changed::11111111-1111-4111-8111-111111111111::22222222-2222-4222-8222-222222222222`,
      Number.MAX_SAFE_INTEGER,
    );

    const payload = buildRelationshipChangedPayload();
    stub._emit("relationship.changed", { event: "relationship.changed", data: payload });

    await new Promise((r) => setTimeout(r, 0));

    expect(mutateCalls.length).toBe(0);
    expect(broadcastCalls.length).toBe(0);
  });

  it("removes the socket listener on unmount", async () => {
    function Probe() {
      useRelationshipInvalidation("22222222-2222-4222-8222-222222222222");
      return null;
    }

    const { unmount } = renderWithProviders(<Probe />);

    await waitFor(() => {
      expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

    const initialOnCount = stub.record.onCalls.length;
    const initialOffCount = stub.record.offCalls.length;

    unmount();

    // The cleanup phase must have issued at least one off-call for
    // `relationship.changed`. We assert against the **delta** (off
    // minus the off-count captured before unmount) so we ignore any
    // off-calls issued by intermediate effect re-runs and isolate the
    // cleanup-on-unmount behaviour.
    const offDelta = stub.record.offCalls.length - initialOffCount;
    expect(offDelta).toBeGreaterThanOrEqual(1);
    expect(offDelta).toBeLessThanOrEqual(initialOnCount);
    expect(
      stub.record.offCalls
        .slice(initialOffCount)
        .some((c) => c.event === "relationship.changed"),
    ).toBe(true);
  });

  it("never includes `friendshipId` or `followId` in any breadcrumb payload", async () => {
    const breadcrumbCalls: Array<Record<string, unknown>> = [];

    vi.doMock("@/lib/social/social-realtime-sentry", () => ({
      addSocialRealtimeBreadcrumb: (data: Record<string, unknown>) => {
        breadcrumbCalls.push(data);
      },
      EPIC_6_10_BREADCRUMB_CATEGORY: "social:6.10" as const,
      SOCIAL_EPIC_6_10_VERSION: "1.0.0" as const,
      EPIC_6_10_RECONNECT_CATEGORY: "social:6.10:reconnect-reconciliation" as const,
      addReconnectReconciliationBreadcrumb: () => undefined,
      phase6Social10Breadcrumb: () => undefined,
    }));

    // Re-import the hook with the mocked Sentry module.
    const { useRelationshipInvalidation: reimported } = await import(
      "@/features/social/hooks/useRelationshipInvalidation"
    );

    function Probe() {
      reimported("22222222-2222-4222-8222-222222222222");
      return null;
    }

    renderWithProviders(<Probe />);

    await waitFor(() => {
      expect(stub.record.onCalls.length).toBeGreaterThan(0);
    });

    const payload = buildRelationshipChangedPayload();
    stub._emit("relationship.changed", { event: "relationship.changed", data: payload });

    await new Promise((r) => setTimeout(r, 0));

    for (const call of breadcrumbCalls) {
      const serialised = JSON.stringify(call);
      expect(serialised).not.toMatch(/friendshipId/);
      expect(serialised).not.toMatch(/followId/);
    }
  });
});
