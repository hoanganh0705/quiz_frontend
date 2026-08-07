/**
 * Spec for `RealtimeSocialShell` (TKT-6.10.G1).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.G1.
 *
 * Locks the integration shell contract:
 *   - Renders `children` regardless of the feature flag.
 *   - Provides the dedup + sequence-guard singletons via context when
 *     the flag is `'live'` AND the viewer is authenticated.
 *   - Provides `null` to both contexts when the flag is `'placeholder'`
 *     OR the viewer is unauthenticated.
 *   - Always renders the three UI primitives (which themselves
 *     short-circuit on the flag).
 *   - Cleans up on unmount.
 *
 * ## Mocking strategy
 *
 * `vi.mock` is hoisted to the top of the file before any variable
 * declarations. To avoid "Cannot access 'X' before initialization", the
 * mock function is passed as a factory parameter: `vi.fn()` → hoisted
 * automatically; `mockReturnValue(...)` in `beforeEach` overrides the
 * return value set by the factory. This is the established pattern in
 * every other social feature spec.
 */

import React from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RealtimeSocialShell } from "@/features/social/components/RealtimeSocialShell";

import {
  EventDeduplicatorContext,
} from "@/features/social/realtime/event-deduplicator";
import {
  EventSequenceGuardContext,
} from "@/features/social/realtime/event-sequence-guard";

// ─── Module-level mocks ────────────────────────────────────────────────────

// Mock the UI primitives with stable data-testid renders.
vi.mock("@/features/social/components/BadgeSyncLayer", () => ({
  BadgeSyncLayer: () => <div data-testid="badge-sync-layer" />,
}));
vi.mock("@/features/social/components/ConnectionStatusBadge", () => ({
  ConnectionStatusBadge: () => <div data-testid="connection-status-badge" />,
}));
vi.mock("@/features/social/components/RealtimeWsErrorToast", () => ({
  RealtimeWsErrorToast: () => <div data-testid="realtime-ws-error-toast" />,
}));

// Feature flag mock — vi.fn() is hoisted; mockReturnValue in beforeEach.
const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags/feature-flags", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getFeatureFlagValue: (...args: any[]) => mockGetFeatureFlagValue(...args),
}));

// Auth bootstrap mock — vi.fn() is hoisted; mockReturnValue in beforeEach.
const mockUseAuthBootstrap = vi.fn();
vi.mock("@/features/auth/contexts/auth-bootstrap-context", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useAuthBootstrap: (...args: any[]) => mockUseAuthBootstrap(...args),
}));

// ─── Probe component ─────────────────────────────────────────────────────────

/**
 * Reads both context values and surfaces them via `data-*` so the spec
 * can assert what the shell provided.
 */
function ContextProbe(): React.ReactElement {
  const dedup = React.useContext(EventDeduplicatorContext);
  const guard = React.useContext(EventSequenceGuardContext);
  if (dedup === null && guard === null) {
    return <div data-testid="context-null" />;
  }
  if (dedup !== null && guard !== null) {
    return <div data-testid="context-live" />;
  }
  return <div data-testid="context-partial" />;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset and set defaults: live + authenticated.
  mockGetFeatureFlagValue.mockReset();
  mockGetFeatureFlagValue.mockReturnValue("live");
  mockUseAuthBootstrap.mockReset();
  mockUseAuthBootstrap.mockReturnValue({
    currentUser: { userId: "11111111-1111-4111-8111-111111111111" },
    status: "ready",
  });
});

afterEach(() => {
  cleanup();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("RealtimeSocialShell (TKT-6.10.G1)", () => {
  it("renders `children` regardless of the feature flag", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    const { getByTestId } = render(
      <RealtimeSocialShell>
        <div data-testid="child-page" />
      </RealtimeSocialShell>,
    );
    expect(getByTestId("child-page")).toBeTruthy();
  });

  it("provides null contexts when the flag is 'placeholder'", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    const { getByTestId } = render(
      <RealtimeSocialShell>
        <ContextProbe />
      </RealtimeSocialShell>,
    );
    expect(getByTestId("context-null")).toBeTruthy();
  });

  it("provides null contexts when the viewer is unauthenticated", () => {
    mockUseAuthBootstrap.mockReturnValue({ currentUser: null, status: "idle" });

    const { getByTestId } = render(
      <RealtimeSocialShell>
        <ContextProbe />
      </RealtimeSocialShell>,
    );
    expect(getByTestId("context-null")).toBeTruthy();
  });

  it("provides live contexts when the flag is 'live' AND the viewer is authenticated", () => {
    mockGetFeatureFlagValue.mockReturnValue("live");
    mockUseAuthBootstrap.mockReturnValue({
      currentUser: { userId: "11111111-1111-4111-8111-111111111111" },
      status: "ready",
    });

    const { getByTestId } = render(
      <RealtimeSocialShell>
        <ContextProbe />
      </RealtimeSocialShell>,
    );
    // Live contexts = real singleton instances (not null).
    expect(getByTestId("context-live")).toBeTruthy();
  });

  it("always renders the three UI primitives regardless of the flag", () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");

    const { getByTestId } = render(
      <RealtimeSocialShell>
        <div data-testid="child-page" />
      </RealtimeSocialShell>,
    );
    expect(getByTestId("badge-sync-layer")).toBeTruthy();
    expect(getByTestId("connection-status-badge")).toBeTruthy();
    expect(getByTestId("realtime-ws-error-toast")).toBeTruthy();
  });

  it("cleans up on unmount without throwing", () => {
    const { unmount } = render(
      <RealtimeSocialShell>
        <div data-testid="child-page" />
      </RealtimeSocialShell>,
    );
    expect(() => unmount()).not.toThrow();
  });

  it("never includes `friendshipId` or `followId` in rendered text", () => {
    const { container } = render(
      <RealtimeSocialShell>
        <div data-testid="child-page">child</div>
      </RealtimeSocialShell>,
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/friendshipId/);
    expect(html).not.toMatch(/followId/);
  });
});
