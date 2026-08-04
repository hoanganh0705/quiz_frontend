/**
 * Unit tests for `useSocket`.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.E1.
 */

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSocket } from "../useSocket";
import * as socketAdapterModule from "../socket-adapter";
import * as authCookiesModule from "@/features/auth/utils/auth-cookies";

// ─── Mock ws-error so auth_required transition can be tested in isolation ─────
// Must be declared at the top level so Vitest hoists it before imports.

vi.mock("@/lib/realtime/ws-error", () => ({
  decodeWsError: vi.fn().mockReturnValue({
    code: "AUTH_SESSION_EXPIRED",
    message: "Token expired",
    authRequired: true,
    retryable: false,
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMockSocket() {
  const handlers: Record<string, Set<(...args: unknown[]) => void>> = {};
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[event]) handlers[event] = new Set();
      handlers[event]!.add(handler);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers[event]?.delete(handler);
    }),
    disconnect: vi.fn(),
    connect: vi.fn(),
    connected: false,
    _handlers: handlers,
    _emit: (event: string, ...args: unknown[]) => {
      handlers[event]?.forEach((h) => h(...args));
    },
  } as unknown as ReturnType<typeof import("../socket-adapter")["createSocket"]> & {
    _emit: (event: string, ...args: unknown[]) => void;
    _handlers: Record<string, Set<(...args: unknown[]) => void>>;
  };
}

// ─── Test setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useSocket", () => {
  it("transitions to connecting when enabled (auto-connect on mount)", () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);
    vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);

    const { result } = renderHook(() => useSocket("/notifications"));

    // After mount + useEffect, the hook transitions to 'connecting'.
    expect(result.current.connectionState).toBe("connecting");
  });

  it("transitions to connected when socket fires connect", async () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);
    vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue("token-123");

    const { result } = renderHook(() => useSocket("/instances"));

    // Trigger the connect event (Socket.IO calls socket.on internally)
    mockSocket._emit("connect");

    await waitFor(() => {
      expect(result.current.connectionState).toBe("connected");
    });
    expect(result.current.socket).toBe(mockSocket);
    expect(result.current.error).toBeNull();
  });

  it("passes auth token from cookie to createSocket", async () => {
    const mockSocket = makeMockSocket();
    const createSpy = vi
      .spyOn(socketAdapterModule, "createSocket")
      .mockReturnValue(mockSocket);
    vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue("my-token");

    renderHook(() => useSocket("/instances"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith("/instances", {
        auth: { token: "my-token" },
        transports: ["websocket", "polling"],
      });
    });
  });

  it("transitions to auth_required when connect_error has authRequired=true", async () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);
    vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue("bad-token");

    // decodeWsError is mocked at the module level (see vi.mock above).
    // The mock always returns authRequired=true so we test only the
    // hook's state-transition logic.

    const { result } = renderHook(() => useSocket("/instances"));

    // Emit a connect_error (Socket.IO passes an Error object).
    mockSocket._emit("connect_error", new Error("Auth error"));

    await waitFor(
      () => {
        expect(result.current.connectionState).toBe("auth_required");
      },
      { timeout: 1000 },
    );
    expect(result.current.error).not.toBeNull();
    expect(result.current.error!.authRequired).toBe(true);
  });

  it("transitions to disconnected when socket fires disconnect", async () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);
    vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);

    const { result } = renderHook(() => useSocket("/instances"));

    mockSocket._emit("connect");
    await waitFor(() => expect(result.current.connectionState).toBe("connected"));

    mockSocket._emit("disconnect");
    await waitFor(() => {
      expect(result.current.connectionState).toBe("disconnected");
    });
  });

  it("disconnect() manually disconnects the socket", async () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);
    vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);

    const { result } = renderHook(() => useSocket("/notifications"));

    // Advance past the auto-connect transition.
    await waitFor(() => {
      expect(result.current.connectionState).toBe("connecting");
    });

    result.current.disconnect();

    await waitFor(() => {
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(result.current.connectionState).toBe("disconnected");
    });
  });

  it("reconnect() calls socket.connect() and resets state", async () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);
    vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);

    const { result } = renderHook(() => useSocket("/notifications"));

    await waitFor(() => {
      expect(result.current.connectionState).toBe("connecting");
    });

    result.current.reconnect();

    // After RESET: state goes idle, then CONNECT fires again.
    await waitFor(() => {
      expect(mockSocket.connect).toHaveBeenCalled();
    });
  });

  it("skips connection when enabled=false", () => {
    const createSpy = vi.spyOn(socketAdapterModule, "createSocket");
    vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);

    const { result } = renderHook(() =>
      useSocket("/notifications", { enabled: false }),
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(result.current.connectionState).toBe("idle");
  });

  it("skips auto-connect when autoConnect=false", () => {
    const createSpy = vi.spyOn(socketAdapterModule, "createSocket");
    vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);

    const { result } = renderHook(() =>
      useSocket("/notifications", { autoConnect: false }),
    );

    expect(createSpy).not.toHaveBeenCalled();
    expect(result.current.connectionState).toBe("idle");
  });

  it("exposes the full connection context after connect", async () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);
    vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);

    const { result } = renderHook(() => useSocket("/instances"));

    mockSocket._emit("connect");

    await waitFor(() => {
      expect(result.current.context.state).toBe("connected");
    });
    expect(result.current.context.startedAt).not.toBeNull();
    expect(result.current.context.connectedAt).not.toBeNull();
    expect(result.current.context.retryCount).toBe(0);
  });
});
