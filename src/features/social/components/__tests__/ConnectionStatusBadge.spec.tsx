/**
 * Spec for `ConnectionStatusBadge` (TKT-6.10.E9).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E9.
 *
 * Locks the connection-status badge contract:
 *   - Renders nothing visually when state is `connected` or `idle`.
 *   - Renders a connecting pill on `connecting`.
 *   - Renders a reconnecting pill on `reconnecting`.
 *   - Renders a generic unavailable pill on `disconnected`.
 *   - Renders an actionable auth-required link on `auth_required`.
 *   - All rendered pills carry `role="status"` and `aria-live="polite"`.
 *   - `friendshipId` / `followId` never appear in any rendered copy.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as useSocketModule from "@/lib/realtime/useSocket";
import type {
  ConnectionStateContext,
} from "@/lib/realtime/connection-state";

import {
  ConnectionStatusBadge,
  STATUS_COPY,
  shouldRenderStatusBadge,
} from "@/features/social/components/ConnectionStatusBadge";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockUseSocketReturn(
  state: ConnectionStateContext["state"],
): ReturnType<typeof useSocketModule.useSocket> {
  return {
    connectionState: state,
    context: {
      state,
      retryCount: 0,
      lastError: null,
      startedAt: null,
      connectedAt: null,
    } as ConnectionStateContext,
    socket: null,
    error: null,
    reconnect: () => undefined,
    disconnect: () => undefined,
  };
}

// ─── Test setup ──────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ConnectionStatusBadge (TKT-6.10.E9)", () => {
  it("renders nothing when state is `connected`", () => {
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn("connected"),
    );

    const { container } = render(<ConnectionStatusBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when state is `idle`", () => {
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn("idle"),
    );

    const { container } = render(<ConnectionStatusBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a `connecting` pill when state is `connecting`", () => {
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn("connecting"),
    );

    render(<ConnectionStatusBadge />);
    const pill = screen.getByTestId("connection-status-badge-connecting");
    expect(pill.textContent).toBe("Connecting…");
    expect(pill.getAttribute("role")).toBe("status");
    expect(pill.getAttribute("aria-live")).toBe("polite");
    expect(pill.tagName.toLowerCase()).toBe("span");
  });

  it("renders a `reconnecting` pill when state is `reconnecting`", () => {
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn("reconnecting"),
    );

    render(<ConnectionStatusBadge />);
    const pill = screen.getByTestId("connection-status-badge-reconnecting");
    expect(pill.textContent).toBe("Reconnecting…");
    expect(pill.getAttribute("role")).toBe("status");
    expect(pill.getAttribute("aria-live")).toBe("polite");
    expect(pill.tagName.toLowerCase()).toBe("span");
  });

  it("renders an unavailable pill when state is `disconnected`", () => {
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn("disconnected"),
    );

    render(<ConnectionStatusBadge />);
    const pill = screen.getByTestId("connection-status-badge-disconnected");
    expect(pill.textContent).toBe("Live updates unavailable");
    expect(pill.getAttribute("role")).toBe("status");
    expect(pill.getAttribute("aria-live")).toBe("polite");
    expect(pill.tagName.toLowerCase()).toBe("span");
  });

  it("renders an actionable auth-required link when state is `auth_required`", () => {
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn("auth_required"),
    );

    render(<ConnectionStatusBadge />);
    const link = screen.getByTestId("connection-status-badge-auth_required");
    expect(link.tagName.toLowerCase()).toBe("a");
    expect(link.getAttribute("href")).toBe(
      STATUS_COPY.auth_required?.href ?? "",
    );
    expect(link.textContent).toBe("Sign in again to see live updates");
    expect(link.getAttribute("role")).toBe("status");
    expect(link.getAttribute("aria-live")).toBe("polite");
  });

  it("STATUS_COPY never includes `friendshipId` or `followId`", () => {
    for (const entry of Object.values(STATUS_COPY)) {
      if (entry === null) continue;
      const serialised = JSON.stringify(entry);
      expect(serialised).not.toMatch(/friendshipId/);
      expect(serialised).not.toMatch(/followId/);
    }
  });

  it("shouldRenderStatusBadge returns false only for `connected` and `idle`", () => {
    expect(shouldRenderStatusBadge("connected")).toBe(false);
    expect(shouldRenderStatusBadge("idle")).toBe(false);
    expect(shouldRenderStatusBadge("connecting")).toBe(true);
    expect(shouldRenderStatusBadge("reconnecting")).toBe(true);
    expect(shouldRenderStatusBadge("disconnected")).toBe(true);
    expect(shouldRenderStatusBadge("auth_required")).toBe(true);
  });
});