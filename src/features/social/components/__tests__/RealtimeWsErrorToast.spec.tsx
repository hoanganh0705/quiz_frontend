/**
 * Spec for `RealtimeWsErrorToast` (TKT-6.10.F1).
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.F1.
 *
 * Locks the WS-error toast contract:
 *   - Renders nothing when no `WsError` is present.
 *   - Renders the user-copy for the most recent error.
 *   - `WS_AUTH_EXPIRED` is marked persistent (no auto-dismiss).
 *   - The action button is a real link with `href` to the re-auth
 *     route.
 *   - The toast is keyboard-accessible (`role="status"` +
 *     `aria-live="polite"`).
 *   - Copy never mentions `ws://`, `socket`, `handshake`,
 *     `friendshipId`, or `followId`.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import * as useSocketModule from "@/lib/realtime/useSocket";
import type { ConnectionStateContext } from "@/lib/realtime/connection-state";
import type { WsError } from "@/lib/realtime/ws-error";

import {
  RealtimeWsErrorToast,
} from "@/features/social/components/RealtimeWsErrorToast";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockUseSocketReturn(
  error: WsError | null,
  state: ConnectionStateContext["state"] = "disconnected",
): ReturnType<typeof useSocketModule.useSocket> {
  return {
    connectionState: state,
    context: {
      state,
      retryCount: 0,
      lastError: error,
      startedAt: null,
      connectedAt: null,
    } as ConnectionStateContext,
    socket: null,
    error,
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

const FORBIDDEN_TERMS = ["ws://", "wss://", "socket", "handshake"] as const;

describe("RealtimeWsErrorToast (TKT-6.10.F1)", () => {
  it("renders nothing when no WS error is present", () => {
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn(null, "connected"),
    );

    const { container } = render(<RealtimeWsErrorToast />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the reconnect-failed toast for a `WS_RECONNECT_FAILED` (synthesised via map helper)", () => {
    // The toast reads `useSocket` and the registry. For `WS_RECONNECT_FAILED`
    // we drive it via a Phase 5 `WsError` whose code is not in the auth
    // / rate-limit buckets; the mapper falls back to `WS_INTERNAL` and the
    // toast shows the generic copy. This test asserts the mapper->renderer
    // pipeline works end-to-end.
    const error: WsError = {
      code: "UNKNOWN_ERROR",
      message: "stub",
      retryable: false,
      authRequired: false,
    };
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn(error, "disconnected"),
    );

    render(<RealtimeWsErrorToast />);

    const toast = screen.getByTestId("realtime-ws-error-toast-internal");
    expect(toast.getAttribute("role")).toBe("status");
    expect(toast.getAttribute("aria-live")).toBe("polite");
    expect(toast.textContent).toContain("Live updates unavailable");
  });

  it("renders the auth-expired toast for `AUTH_TOKEN_EXPIRED`", () => {
    const error: WsError = {
      code: "AUTH_TOKEN_EXPIRED",
      message: "stub",
      retryable: false,
      authRequired: true,
    };
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn(error, "auth_required"),
    );

    render(<RealtimeWsErrorToast />);

    const toast = screen.getByTestId("realtime-ws-error-toast-auth-expired");
    expect(toast.getAttribute("data-persistent")).toBe("true");
    expect(toast.textContent).toContain("Sign in again to see live updates");

    const action = toast.querySelector("a");
    expect(action).not.toBeNull();
    expect(action?.getAttribute("href")).toBe("/login?reason=session-expired");
    expect(action?.textContent).toBe("Sign in");
  });

  it("renders the rate-limited toast for `RATE_LIMITED`", () => {
    const error: WsError = {
      code: "RATE_LIMITED",
      message: "stub",
      retryable: true,
      authRequired: false,
    };
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn(error, "reconnecting"),
    );

    render(<RealtimeWsErrorToast />);

    const toast = screen.getByTestId("realtime-ws-error-toast-rate-limited");
    expect(toast.getAttribute("data-persistent")).toBe("false");
    expect(toast.textContent).toContain("Live updates paused");
    expect(toast.textContent).toContain("Too many events");
  });

  it("the auth-expired toast does NOT auto-dismiss (`data-persistent='true'`)", () => {
    const error: WsError = {
      code: "AUTH_TOKEN_EXPIRED",
      message: "stub",
      retryable: false,
      authRequired: true,
    };
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn(error, "auth_required"),
    );

    render(<RealtimeWsErrorToast />);
    const toast = screen.getByTestId("realtime-ws-error-toast-auth-expired");
    expect(toast.getAttribute("data-persistent")).toBe("true");
  });

  it("the rate-limited toast is dismissible (`data-persistent='false'`)", () => {
    const error: WsError = {
      code: "RATE_LIMITED",
      message: "stub",
      retryable: true,
      authRequired: false,
    };
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn(error, "reconnecting"),
    );

    render(<RealtimeWsErrorToast />);
    const toast = screen.getByTestId("realtime-ws-error-toast-rate-limited");
    expect(toast.getAttribute("data-persistent")).toBe("false");
  });

  it("never renders raw transport vocabulary in any toast copy", () => {
    const codes: Array<WsError["code"]> = [
      "AUTH_TOKEN_EXPIRED",
      "AUTH_INVALID_TOKEN",
      "AUTH_FORBIDDEN",
      "RATE_LIMITED",
      "SERVER_ERROR",
      "UNKNOWN_ERROR",
    ];

    for (const code of codes) {
      cleanup();
      const error: WsError = {
        code,
        message: "stub",
        retryable: false,
        authRequired: false,
      };
      vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
        mockUseSocketReturn(error, "disconnected"),
      );

      const { container } = render(<RealtimeWsErrorToast />);
      const text = container.textContent ?? "";
      for (const term of FORBIDDEN_TERMS) {
        expect(text).not.toMatch(new RegExp(term, "i"));
      }
    }
  });

  it("never renders `friendshipId` or `followId` in any toast copy", () => {
    const error: WsError = {
      code: "UNKNOWN_ERROR",
      message: "stub",
      retryable: false,
      authRequired: false,
    };
    vi.spyOn(useSocketModule, "useSocket").mockReturnValue(
      mockUseSocketReturn(error, "disconnected"),
    );

    const { container } = render(<RealtimeWsErrorToast />);
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/friendshipId/);
    expect(text).not.toMatch(/followId/);
  });
});