

import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useRealtimeQuery } from "../useRealtimeQuery";
import * as socketAdapterModule from "../socket-adapter";
import * as useSocketModule from "../useSocket";
import * as useRealtimeEventModule from "../useRealtimeEvent";

beforeEach(() => {
vi.clearAllMocks();
useRealtimeEventModule.__resetRealtimeEventRegistryForTest?.();
useSocketModule.__resetSocketRegistryForTest?.();
});

afterEach(() => {
vi.restoreAllMocks();
});

describe("useRealtimeQuery", () => {
it("returns SWR response when swrKey is non-null", async () => {
const mockSocket = {
on: vi.fn(),
off: vi.fn(),
connect: vi.fn(),
disconnect: vi.fn(),
connected: true,
    };
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket as never);

const fetcher = vi.fn().mockResolvedValue({ items: [] });

const { result } = renderHook(() =>
useRealtimeQuery("/notifications", ["key"], fetcher, []),
    );

expect(result.current).toHaveProperty("mutate");
expect(result.current).toHaveProperty("error");
  });

it("deduplicates rules with the same (event, keyToInvalidate) pair", async () => {
const mockSocket = {
on: vi.fn(),
off: vi.fn(),
connect: vi.fn(),
disconnect: vi.fn(),
connected: true,
    };
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket as never);

const fetcher = vi.fn().mockResolvedValue({ items: [] });
const key = ["notifications"];

const rules = [
{ event: "notification:sent", keyToInvalidate: key },
{ event: "notification:sent", keyToInvalidate: key },
    ];

renderHook(() =>
useRealtimeQuery("/notifications", key, fetcher, rules),
    );

const onCalls = mockSocket.on.mock.calls.filter(
([e]) => e === "notification:sent",
    );
expect(onCalls.length).toBe(1);
  });

it("registers separate listeners for different events", async () => {
const mockSocket = {
on: vi.fn(),
off: vi.fn(),
connect: vi.fn(),
disconnect: vi.fn(),
connected: true,
    };
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket as never);

const fetcher = vi.fn().mockResolvedValue({ items: [] });
const key = ["notifications"];

const rules = [
{ event: "notification:sent", keyToInvalidate: key },
{ event: "notification:deleted", keyToInvalidate: key },
    ];

renderHook(() =>
useRealtimeQuery("/notifications", key, fetcher, rules),
    );

const sentCalls = mockSocket.on.mock.calls.filter(
([e]) => e === "notification:sent",
    );
const deletedCalls = mockSocket.on.mock.calls.filter(
([e]) => e === "notification:deleted",
    );

expect(sentCalls.length).toBe(1);
expect(deletedCalls.length).toBe(1);
  });
});
