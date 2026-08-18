

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useInstance } from "@/features/instances/hooks/useInstance";
import { ApiError, isApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetInstance = vi.fn();
vi.mock("@/features/instances/services/instances.service", () => ({
getInstance: (...args: unknown[]) => mockGetInstance(...args),
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

describe("useInstance", () => {
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

const { result } = renderHook(() => useInstance("inst-1", null), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
      });
expect(result.current.instance).toBeNull();
expect(result.current.error).toBeNull();
expect(result.current.isStale).toBe(false);
    });

it("does not call getInstance when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

renderHook(() => useInstance("inst-1", null), {
wrapper: TestSwrProvider,
      });

await new Promise((r) => setTimeout(r, 10));
expect(mockGetInstance).not.toHaveBeenCalled();
    });
  });

describe("null id short-circuit", () => {
it("does not call service when id is null", async () => {
const { result } = renderHook(() => useInstance(null, null), {
wrapper: TestSwrProvider,
      });

await new Promise((r) => setTimeout(r, 10));
expect(mockGetInstance).not.toHaveBeenCalled();
expect(result.current.instance).toBeNull();
    });
  });

describe("service forwarding", () => {
it("forwards id to getInstance and returns synthesised id alias", async () => {
mockGetInstance.mockResolvedValue({
data: {
instanceId: "inst-1",
quizId: "quiz-1",
status: "open",
hostUserId: "host-1",
maxPlayers: 12,
currentPlayers: 3,
currentUserRole: "host",
createdAt: "2026-01-01T00:00:00Z",
updatedAt: "2026-01-01T00:00:00Z",
        },
meta: undefined,
      });

const { result } = renderHook(() => useInstance("inst-1", null), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.instance).not.toBeNull();
      });
expect(mockGetInstance).toHaveBeenCalledWith("inst-1");
expect(result.current.instance?.id).toBe("inst-1");
expect(result.current.instance?.instanceId).toBe("inst-1");
expect(result.current.instance?.status).toBe("open");
    });
  });

describe("typed error mapping", () => {
it("surfaces a typed ApiError for INSTANCE_NOT_FOUND", async () => {
mockGetInstance.mockRejectedValue(makeApiError(404, "INSTANCE_NOT_FOUND"));

const { result } = renderHook(() => useInstance("inst-1", null), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.error).not.toBeNull();
      });
expect(isApiError(result.current.error!)).toBe(true);
    });

it("surfaces a typed ApiError for INSTANCE_AUTH_REQUIRED", async () => {
mockGetInstance.mockRejectedValue(
makeApiError(401, "INSTANCE_AUTH_REQUIRED"),
      );

const { result } = renderHook(() => useInstance("inst-1", null), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.error).not.toBeNull();
      });
expect(isApiError(result.current.error!)).toBe(true);
    });

it("surfaces a typed ApiError for INSTANCE_FORBIDDEN", async () => {
mockGetInstance.mockRejectedValue(
makeApiError(403, "INSTANCE_FORBIDDEN"),
      );

const { result } = renderHook(() => useInstance("inst-1", null), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.error).not.toBeNull();
      });
expect(isApiError(result.current.error!)).toBe(true);
    });

it("surfaces a typed ApiError for INSTANCE_CLOSED", async () => {
mockGetInstance.mockRejectedValue(makeApiError(409, "INSTANCE_CLOSED"));

const { result } = renderHook(() => useInstance("inst-1", null), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.error).not.toBeNull();
      });
expect(isApiError(result.current.error!)).toBe(true);
    });

it("wraps plain errors as ApiError", async () => {
mockGetInstance.mockRejectedValue(new Error("Network failure"));

const { result } = renderHook(() => useInstance("inst-1", null), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.error).not.toBeNull();
      });
expect(isApiError(result.current.error!)).toBe(true);
    });
  });

describe("refresh", () => {
it("exposes a refresh function", async () => {
mockGetInstance.mockResolvedValue({
data: {
instanceId: "inst-1",
quizId: "quiz-1",
status: "open",
hostUserId: "host-1",
maxPlayers: 12,
currentPlayers: 3,
currentUserRole: "host",
createdAt: "2026-01-01T00:00:00Z",
updatedAt: "2026-01-01T00:00:00Z",
        },
      });

const { result } = renderHook(() => useInstance("inst-1", null), {
wrapper: TestSwrProvider,
      });

await waitFor(() => {
expect(result.current.instance).not.toBeNull();
      });

expect(typeof result.current.refresh).toBe("function");
    });
  });
});