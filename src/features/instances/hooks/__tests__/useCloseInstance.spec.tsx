

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useCloseInstance } from "@/features/instances/hooks/useCloseInstance";
import { ApiError, isApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockCloseInstance = vi.fn();
vi.mock("@/features/instances/services/instances.service", () => ({
closeInstance: (...args: unknown[]) => mockCloseInstance(...args),
}));

const mutateMock = vi.fn();
vi.mock("swr", async () => {
const actual = await vi.importActual<typeof import("swr")>("swr");
return {
...actual,
mutate: (...args: unknown[]) => mutateMock(...args),
  };
});

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

const hostPermissions = {
canJoin: false,
canLeave: false,
canStart: false,
canCancel: false,
canClose: true,
role: "host" as const,
isAuthenticated: true,
};

const playerPermissions = {
canJoin: true,
canLeave: true,
canStart: false,
canCancel: false,
canClose: false,
role: "player" as const,
isAuthenticated: true,
};

describe("useCloseInstance", () => {
beforeEach(() => {
vi.clearAllMocks();
mutateMock.mockResolvedValue(undefined);
mockGetFeatureFlagValue.mockReturnValue("live");
  });

afterEach(() => {
cleanup();
  });

describe("initialization", () => {
it("closes in idle state", () => {
const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );
expect(result.current.state).toBe("idle");
expect(result.current.error).toBeNull();
    });

it("close is a no-op when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(mockCloseInstance).not.toHaveBeenCalled();
    });

it("close is a no-op when instanceId is null", async () => {
const { result } = renderHook(
() => useCloseInstance(null, hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(mockCloseInstance).not.toHaveBeenCalled();
    });

it("close is a no-op when permissions.canClose is false", async () => {
const { result } = renderHook(
() => useCloseInstance("inst-1", playerPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(mockCloseInstance).not.toHaveBeenCalled();
    });

it("surfaces INSTANCE_HOST_REQUIRED locally when canClose is false", async () => {
const { result } = renderHook(
() => useCloseInstance("inst-1", playerPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(result.current.state).toBe("error");
expect(result.current.error).not.toBeNull();
    });
  });

describe("success path", () => {
it("transitions to success state and invalidates SWR keys", async () => {
mockCloseInstance.mockResolvedValue({
instanceId: "inst-1",
status: "closed",
closedAt: "2026-01-01T00:00:00Z",
      });

const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(result.current.state).toBe("success");
expect(mutateMock).toHaveBeenCalled();
    });

it("forwards id to closeInstance", async () => {
mockCloseInstance.mockResolvedValue({
instanceId: "inst-1",
status: "closed",
closedAt: "2026-01-01T00:00:00Z",
      });

const { result } = renderHook(
() => useCloseInstance("inst-42", hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(mockCloseInstance).toHaveBeenCalledWith("inst-42");
    });
  });

describe("error handling", () => {
it("transitions to error state when service rejects with INSTANCE_HOST_REQUIRED", async () => {
mockCloseInstance.mockRejectedValue(
makeApiError(403, "INSTANCE_HOST_REQUIRED"),
      );

const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(result.current.state).toBe("error");
expect(isApiError(result.current.error!)).toBe(true);
expect(result.current.error).not.toBeNull();
    });

it("transitions to error state when service rejects with INSTANCE_INVALID_TRANSITION", async () => {
mockCloseInstance.mockRejectedValue(
makeApiError(409, "INSTANCE_INVALID_TRANSITION"),
      );

const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(result.current.state).toBe("error");
expect(result.current.error).not.toBeNull();
    });

it("transitions to error state when service rejects with INSTANCE_NOT_FOUND", async () => {
mockCloseInstance.mockRejectedValue(
makeApiError(404, "INSTANCE_NOT_FOUND"),
      );

const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(result.current.state).toBe("error");
expect(result.current.error).not.toBeNull();
    });

it("transitions to error state when service rejects with INSTANCE_AUTH_REQUIRED", async () => {
mockCloseInstance.mockRejectedValue(
makeApiError(401, "INSTANCE_AUTH_REQUIRED"),
      );

const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(result.current.state).toBe("error");
expect(result.current.error).not.toBeNull();
    });

it("transitions to error state when service rejects with INSTANCE_FORBIDDEN", async () => {
mockCloseInstance.mockRejectedValue(
makeApiError(403, "INSTANCE_FORBIDDEN"),
      );

const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(result.current.state).toBe("error");
expect(result.current.error).not.toBeNull();
    });

it("wraps plain errors as ApiError", async () => {
mockCloseInstance.mockRejectedValue(new Error("Network failure"));

const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(result.current.state).toBe("error");
expect(isApiError(result.current.error!)).toBe(true);
    });
  });

describe("double-click guard", () => {
it("allows only one mutation call when invoked twice in flight", async () => {
let resolveClose: (value: unknown) => void;
mockCloseInstance.mockImplementationOnce(
() =>
new Promise<unknown>((resolve) => {
resolveClose = resolve;
          }),
      );

const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );

const firstPromise = result.current.close();

await act(async () => {
await result.current.close();
      });

resolveClose!({
instanceId: "inst-1",
status: "closed",
closedAt: "2026-01-01T00:00:00Z",
      });
await firstPromise;

expect(mockCloseInstance).toHaveBeenCalledTimes(1);
    });
  });

describe("reset", () => {
it("clears error and returns to idle", async () => {
mockCloseInstance.mockRejectedValue(
makeApiError(403, "INSTANCE_HOST_REQUIRED"),
      );

const { result } = renderHook(
() => useCloseInstance("inst-1", hostPermissions),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.close();
      });

expect(result.current.state).toBe("error");

act(() => {
result.current.reset();
      });

expect(result.current.state).toBe("idle");
expect(result.current.error).toBeNull();
    });
  });
});