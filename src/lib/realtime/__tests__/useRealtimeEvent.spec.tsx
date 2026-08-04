/**
 * Unit tests for `useRealtimeEvent`.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.E2.
 */

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRealtimeEvent } from "../useRealtimeEvent";
import * as socketAdapterModule from "../socket-adapter";

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

describe("useRealtimeEvent", () => {
  it("registers and unregisters the handler on mount/unmount", () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);

    const handler = vi.fn();

    const { unmount } = renderHook(() =>
      useRealtimeEvent(mockSocket, "notification:sent", handler),
    );

    expect(mockSocket.on).toHaveBeenCalledWith("notification:sent", expect.any(Function));

    unmount();

    expect(mockSocket.off).toHaveBeenCalledWith("notification:sent", expect.any(Function));
  });

  it("calls the handler with the payload on success event", () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);

    const handler = vi.fn();
    const payload = { id: "1", message: "Hello" };

    renderHook(() =>
      useRealtimeEvent(mockSocket, "notification:sent", handler),
    );

    mockSocket._emit("notification:sent", { event: "notification:sent", data: payload });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it("does NOT call the handler when event is 'error'", () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);

    const handler = vi.fn();

    renderHook(() =>
      useRealtimeEvent(mockSocket, "notification:sent", handler),
    );

    mockSocket._emit("notification:sent", {
      event: "error",
      data: { code: "AUTH_SESSION_EXPIRED", message: "Expired" },
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("skips registration when enabled=false", () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);

    const handler = vi.fn();

    renderHook(() =>
      useRealtimeEvent(mockSocket, "notification:sent", handler, { enabled: false }),
    );

    expect(mockSocket.on).not.toHaveBeenCalled();
    expect(handler).not.toHaveBeenCalled();
  });

  it("skips registration when socket is null", () => {
    const handler = vi.fn();

    renderHook(() =>
      useRealtimeEvent(null, "notification:sent", handler),
    );

    // No error thrown; handler never called.
    expect(handler).not.toHaveBeenCalled();
  });

  it("registers different handlers for different event names independently", () => {
    const mockSocket = makeMockSocket();
    vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket);

    const handlerA = vi.fn();
    const handlerB = vi.fn();

    renderHook(() => {
      useRealtimeEvent(mockSocket, "notification:sent", handlerA);
      useRealtimeEvent(mockSocket, "notification:deleted", handlerB);
    });

    mockSocket._emit("notification:sent", { event: "notification:sent", data: { id: "1" } });
    mockSocket._emit("notification:deleted", { event: "notification:deleted", data: { id: "2" } });

    expect(handlerA).toHaveBeenCalledTimes(1);
    expect(handlerB).toHaveBeenCalledTimes(1);
  });
});
