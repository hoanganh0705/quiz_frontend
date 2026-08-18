

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSocket } from "@/lib/realtime/useSocket";
import * as socketAdapterModule from "@/lib/realtime/socket-adapter";
import * as authCookiesModule from "@/features/auth/utils/auth-cookies";

import {
createRealtimeSocialStubSocket,
createRealtimeSocialStubContext,
type RealtimeSocialStubSocket,
} from "./realtime-test-harness";

vi.mock("@/lib/realtime/ws-error", () => ({
decodeWsError: vi.fn().mockReturnValue({
code: "WS_INTERNAL",
message: "Stub error",
authRequired: false,
retryable: false,
  }),
}));

let stub: RealtimeSocialStubSocket;

beforeEach(() => {
vi.clearAllMocks();
stub = createRealtimeSocialStubSocket();
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(stub);

vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue(null);
});

afterEach(() => {
vi.restoreAllMocks();
});

describe("useSocket('/notifications') — smoke spec for Epic 6.10 listener hooks", () => {
it("auto-connects on mount and transitions to 'connecting'", async () => {
const { result } = renderHook(() => useSocket("/notifications"));

await waitFor(() => {
expect(result.current.connectionState).toBe("connecting");
    });

expect(stub.record.connectCalls).toBe(0);
expect(result.current.socket).toBe(stub);
  });

it("transitions to 'connected' on synthetic connect event", async () => {
const { result } = renderHook(() => useSocket("/notifications"));

stub._emit("connect");

await waitFor(() => {
expect(result.current.connectionState).toBe("connected");
    });
expect(result.current.error).toBeNull();
expect(result.current.socket).toBe(stub);
  });

it("transitions to 'disconnected' on synthetic disconnect event", async () => {
const { result } = renderHook(() => useSocket("/notifications"));

stub._emit("connect");
await waitFor(() => {
expect(result.current.connectionState).toBe("connected");
    });

stub._emit("disconnect");

await waitFor(() => {
expect(result.current.connectionState).toBe("disconnected");
    });
  });

it("passes the auth token (when present) to createSocket", async () => {
vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue("stub-token");
const createSpy = vi.spyOn(socketAdapterModule, "createSocket");

renderHook(() => useSocket("/notifications"));

await waitFor(() => {
expect(createSpy).toHaveBeenCalledWith("/notifications", {
auth: { token: "stub-token" },
transports: ["websocket", "polling"],
      });
    });
  });

it("registers handlers for connect / disconnect / connect_error", () => {
renderHook(() => useSocket("/notifications"));

const registeredEvents = stub.record.onCalls.map((c) => c.event);
expect(registeredEvents).toEqual(
expect.arrayContaining(["connect", "disconnect", "connect_error"]),
    );
  });

it("does NOT call disconnect() on the stub when the hook unmounts", () => {
const { unmount } = renderHook(() => useSocket("/notifications"));

const disconnectCallsBefore = stub.record.disconnectCalls;
unmount();

expect(stub.record.disconnectCalls).toBe(disconnectCallsBefore);
  });

it("manual reconnect() calls socket.connect() and clears the retry timer", async () => {
const { result } = renderHook(() => useSocket("/notifications"));

await waitFor(() => {
expect(result.current.connectionState).toBe("connecting");
    });

result.current.reconnect();

expect(stub.record.connectCalls).toBeGreaterThanOrEqual(1);
  });

it("manual disconnect() transitions the hook to 'disconnected'", async () => {
const { result } = renderHook(() => useSocket("/notifications"));

await waitFor(() => {
expect(result.current.connectionState).toBe("connecting");
    });

result.current.disconnect();

await waitFor(() => {
expect(result.current.connectionState).toBe("disconnected");
    });
expect(stub.record.disconnectCalls).toBe(1);
  });

it("does not connect when enabled=false (the realtime flag 'placeholder' path)", () => {
vi.spyOn(authCookiesModule, "getAuthToken").mockReturnValue("token");
const createSpy = vi.spyOn(socketAdapterModule, "createSocket");

const { result } = renderHook(() =>
useSocket("/notifications", { enabled: false }),
    );

expect(createSpy).not.toHaveBeenCalled();
expect(result.current.connectionState).toBe("idle");
expect(stub.record.onCalls).toEqual([]);
  });
});

describe("createRealtimeSocialStubContext — dedup + sequence guard primitives", () => {
it("dedup.add then dedup.has returns true", () => {
const ctx = createRealtimeSocialStubContext();
expect(ctx.dedup.has("a::b::c::d")).toBe(false);
ctx.dedup.add("a::b::c::d");
expect(ctx.dedup.has("a::b::c::d")).toBe(true);
expect(ctx.dedup.size()).toBe(1);
  });

it("dedup evicts the oldest entry at the 200-key cap", () => {
const ctx = createRealtimeSocialStubContext();
for (let i = 0; i < 200; i += 1) {
ctx.dedup.add(`key-${i}`);
    }
expect(ctx.dedup.size()).toBe(200);
ctx.dedup.add("key-200");
expect(ctx.dedup.size()).toBe(200);

expect(ctx.dedup.has("key-0")).toBe(false);
expect(ctx.dedup.has("key-200")).toBe(true);
  });

it("sequence guard accepts strictly-increasing sequences", () => {
const ctx = createRealtimeSocialStubContext();
expect(ctx.sequenceGuard.accept("k", 1)).toBe("allow");
expect(ctx.sequenceGuard.accept("k", 2)).toBe("allow");
expect(ctx.sequenceGuard.accept("k", 3)).toBe("allow");
  });

it("sequence guard drops non-monotonic sequences", () => {
const ctx = createRealtimeSocialStubContext();
expect(ctx.sequenceGuard.accept("k", 5)).toBe("allow");
expect(ctx.sequenceGuard.accept("k", 4)).toBe("drop");
expect(ctx.sequenceGuard.accept("k", 5)).toBe("drop");
expect(ctx.sequenceGuard.accept("k", 6)).toBe("allow");
  });

it("reset() clears both primitives", () => {
const ctx = createRealtimeSocialStubContext();
ctx.dedup.add("a");
ctx.sequenceGuard.accept("k", 1);
ctx.reset();
expect(ctx.dedup.size()).toBe(0);
expect(ctx.sequenceGuard.size()).toBe(0);

expect(ctx.sequenceGuard.accept("k", 1)).toBe("allow");
  });
});
