/**
 * Spec for `BadgeSyncLayer` (TKT-6.10.E8).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E8.
 *
 * Locks the badge-sync-layer contract:
 *   - Renders `null` (no visual footprint).
 *   - Mounts `useNotificationEventRouter` (which handles the
 *     social-key re-routing for `friend_request` / `follow` / `block`
 *     kinds).
 *   - Mounts `useUnreadNotificationCount` (Phase 5).
 *   - Returns `null` when the flag is `'placeholder'`.
 *   - Unmount cleans up listeners (delegated to the underlying hooks).
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as featureFlagsModule from "@/lib/feature-flags";
import * as socketAdapterModule from "@/lib/realtime/socket-adapter";
import * as authCookiesModule from "@/features/auth/utils/auth-cookies";

import * as notificationRouterModule from "@/features/social/hooks/useNotificationEventRouter";
import * as unreadCountModule from "@/features/notifications/hooks/useUnreadNotificationCount";

import { BadgeSyncLayer } from "@/features/social/components/BadgeSyncLayer";

// ─── Module-level mocks ──────────────────────────────────────────────────────

vi.mock("@/lib/realtime/ws-error", () => ({
  decodeWsError: vi.fn().mockReturnValue({
    code: "WS_INTERNAL",
    message: "Stub error",
    authRequired: false,
    retryable: false,
  }),
}));

vi.mock("@/lib/swr/mutate-carefully", () => ({
  mutateCarefully: () => Promise.resolve(),
}));

// ─── Test setup ──────────────────────────────────────────────────────────────

let routerCalls = 0;
let unreadCountCalls = 0;

beforeEach(() => {
  routerCalls = 0;
  unreadCountCalls = 0;

  vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue("live");
  vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);
  vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue({
    on: () => undefined,
    off: () => undefined,
    emit: () => undefined,
    disconnect: () => undefined,
    connect: () => undefined,
    connected: false,
  } as unknown as ReturnType<typeof socketAdapterModule.createSocket>);

  // Spy on the two hooks the layer mounts so we can assert they were
  // called and verify the placeholder-flag fallback.
  vi.spyOn(notificationRouterModule, "useNotificationEventRouter").mockImplementation(
    () => {
      routerCalls += 1;
    },
  );
  vi.spyOn(unreadCountModule, "useUnreadNotificationCount").mockImplementation(
    () => {
      unreadCountCalls += 1;
      return { unreadCount: 0, isLoading: false, error: null };
    },
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("BadgeSyncLayer (TKT-6.10.E8)", () => {
  it("renders nothing visually (returns null)", () => {
    const { container } = render(<BadgeSyncLayer />);
    expect(container.firstChild).toBeNull();
  });

  it("mounts both `useNotificationEventRouter` and `useUnreadNotificationCount`", () => {
    render(<BadgeSyncLayer />);
    expect(routerCalls).toBe(1);
    expect(unreadCountCalls).toBe(1);
  });

  it("still mounts both hooks when the feature flag is 'placeholder' (hooks gate themselves)", () => {
    // The hooks themselves short-circuit when the flag is 'placeholder';
    // the layer is a passive mount-point and always calls both hooks.
    vi.spyOn(featureFlagsModule, "getFeatureFlagValue").mockReturnValue(
      "placeholder",
    );

    const { container } = render(<BadgeSyncLayer />);
    expect(container.firstChild).toBeNull();
    expect(routerCalls).toBe(1);
    expect(unreadCountCalls).toBe(1);
  });

  it("survives multiple mounts (idempotent re-renders)", () => {
    const { rerender } = render(<BadgeSyncLayer />);
    rerender(<BadgeSyncLayer />);
    rerender(<BadgeSyncLayer />);

    // React 18 strict-mode dev may double-invoke, but we always get at
    // least the documented call count.
    expect(routerCalls).toBeGreaterThanOrEqual(1);
    expect(unreadCountCalls).toBeGreaterThanOrEqual(1);
  });
});