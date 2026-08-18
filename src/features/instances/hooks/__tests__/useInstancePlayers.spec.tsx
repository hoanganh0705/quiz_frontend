

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useInstancePlayers } from "@/features/instances/hooks/useInstancePlayers";
import { ApiError, isApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockListInstancePlayers = vi.fn();
vi.mock("@/features/instances/services/instances.service", () => ({
listInstancePlayers: (...args: unknown[]) => mockListInstancePlayers(...args),
}));

function makeApiError(status: number, code: string) {
const wireBody = {
type: "about:blank",
title: `Error ${status}`,
status,
code,
extensions: { code },
  };
const err = {
isAxiosError: true,
name: "AxiosError",
message: `Mock ${status}: ${code}`,
response: {
status,
statusText: "Error",
headers: {},
config: {},
data: wireBody,
    },
config: undefined,
request: undefined,
toJSON: () => ({}),
  };
return new ApiError(err as unknown as Parameters<typeof ApiError>[0]);
}

function TestSwrProvider({ children }: { children: React.ReactNode }) {
return (
<SWRConfig
value={{
provider: () => new Map(),
revalidateOnFocus: false,
revalidateIfStale: false,
dedupingInterval: 0,
errorRetryCount: 0,
      }}
    >
{children}
</SWRConfig>
  );
}

describe("useInstancePlayers", () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue("live");
  });

afterEach(() => {
cleanup();
  });

describe("feature flag gating", () => {
it("returns safe fallback when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

const { result } = renderHook(() => useInstancePlayers("inst-1"), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.items).toEqual([]);
      });
expect(result.current.hasMore).toBe(false);
expect(result.current.isLoading).toBe(false);
    });

it("does not call listInstancePlayers when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

renderHook(() => useInstancePlayers("inst-1"), {
wrapper: TestSwrProvider,
      });

await new Promise((r) => setTimeout(r, 10));
expect(mockListInstancePlayers).not.toHaveBeenCalled();
    });
  });

describe("service forwarding", () => {
it("forwards id to listInstancePlayers", async () => {
mockListInstancePlayers.mockResolvedValue({
data: [
{
userId: "u1",
username: "user1",
displayName: "User 1",
role: "host",
joinedAt: "2026-01-01T00:00:00Z",
isConnected: true,
          },
        ],
meta: {
pagination: { limit: 20, nextCursor: null, hasNextPage: false },
        },
      });

const { result } = renderHook(() => useInstancePlayers("inst-1"), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.items.length).toBeGreaterThan(0);
      });

expect(mockListInstancePlayers).toHaveBeenCalled();
    });
  });

describe("id alias synthesis", () => {
it("synthesises id alias from userId", async () => {
mockListInstancePlayers.mockResolvedValue({
data: [
{
userId: "u1",
username: "user1",
displayName: "User 1",
role: "host",
joinedAt: "2026-01-01T00:00:00Z",
isConnected: true,
          },
        ],
meta: {
pagination: { limit: 20, nextCursor: null, hasNextPage: false },
        },
      });

const { result } = renderHook(() => useInstancePlayers("inst-1"), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.items.length).toBe(1);
      });
expect(result.current.items[0]).toMatchObject({
id: "u1",
userId: "u1",
      });
    });
  });

describe("typed error mapping", () => {
it("surfaces a typed ApiError for INSTANCE_NOT_FOUND", async () => {
mockListInstancePlayers.mockRejectedValue(
makeApiError(404, "INSTANCE_NOT_FOUND"),
      );

const { result } = renderHook(() => useInstancePlayers("inst-1"), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.error).not.toBeNull();
      });
expect(isApiError(result.current.error!)).toBe(true);
    });

it("surfaces a typed ApiError for INSTANCE_AUTH_REQUIRED", async () => {
mockListInstancePlayers.mockRejectedValue(
makeApiError(401, "INSTANCE_AUTH_REQUIRED"),
      );

const { result } = renderHook(() => useInstancePlayers("inst-1"), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.error).not.toBeNull();
      });
expect(isApiError(result.current.error!)).toBe(true);
    });

it("surfaces a typed ApiError for INSTANCE_FORBIDDEN", async () => {
mockListInstancePlayers.mockRejectedValue(
makeApiError(403, "INSTANCE_FORBIDDEN"),
      );

const { result } = renderHook(() => useInstancePlayers("inst-1"), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.error).not.toBeNull();
      });
expect(isApiError(result.current.error!)).toBe(true);
    });
  });

describe("pagination", () => {
it("returns hasMore true when server reports nextCursor", async () => {
mockListInstancePlayers.mockResolvedValue({
data: [
{
userId: "u1",
username: "user1",
displayName: "User 1",
role: "host",
joinedAt: "2026-01-01T00:00:00Z",
isConnected: true,
          },
        ],
meta: {
pagination: { limit: 20, nextCursor: "c-2", hasNextPage: true },
        },
      });

const { result } = renderHook(() => useInstancePlayers("inst-1"), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.hasMore).toBe(true);
      });
    });

it("exposes a loadMore function", async () => {
mockListInstancePlayers.mockResolvedValue({
data: [
{
userId: "u1",
username: "user1",
displayName: "User 1",
role: "host",
joinedAt: "2026-01-01T00:00:00Z",
isConnected: true,
          },
        ],
meta: {
pagination: { limit: 20, nextCursor: "c-2", hasNextPage: true },
        },
      });

const { result } = renderHook(() => useInstancePlayers("inst-1"), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.items.length).toBe(1);
      });
expect(typeof result.current.loadMore).toBe("function");
    });
  });

describe("null id short-circuit", () => {
it("does not call service when id is null", async () => {
const { result } = renderHook(() => useInstancePlayers(null), {
wrapper: TestSwrProvider,
      });
void result;

await new Promise((r) => setTimeout(r, 10));
expect(mockListInstancePlayers).not.toHaveBeenCalled();
    });
  });
});