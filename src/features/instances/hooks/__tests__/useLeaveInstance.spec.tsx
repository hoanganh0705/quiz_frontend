

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useLeaveInstance } from "@/features/instances/hooks/useLeaveInstance";
import { ApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
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

describe("useLeaveInstance", () => {
beforeEach(() => {
vi.clearAllMocks();
mutateMock.mockResolvedValue(undefined);
mockGetFeatureFlagValue.mockReturnValue("live");
  });

afterEach(() => {
cleanup();
  });

describe("initialization", () => {
it("starts in idle state", () => {
const { result } = renderHook(
() => useLeaveInstance("inst-1", { emitLeave: null }),
{ wrapper: TestSwrProvider },
      );
expect(result.current.state).toBe("idle");
expect(result.current.error).toBeNull();
    });

it("leave is a no-op when flag is placeholder", async () => {
mockGetFeatureFlagValue.mockReturnValue("placeholder");

const emitLeave = vi.fn().mockResolvedValue(undefined);
const { result } = renderHook(
() => useLeaveInstance("inst-1", { emitLeave }),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.leave();
      });

expect(emitLeave).not.toHaveBeenCalled();
    });

it("leave is a no-op when instanceId is null", async () => {
const emitLeave = vi.fn().mockResolvedValue(undefined);
const { result } = renderHook(
() => useLeaveInstance(null, { emitLeave }),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.leave();
      });

expect(emitLeave).not.toHaveBeenCalled();
    });

it("leave is a no-op when emitLeave is null", async () => {
const { result } = renderHook(
() => useLeaveInstance("inst-1", { emitLeave: null }),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.leave();
      });

expect(result.current.state).toBe("idle");
    });
  });

describe("success path", () => {
it("transitions to success state after socket emit", async () => {
const emitLeave = vi.fn().mockResolvedValue(undefined);
const { result } = renderHook(
() => useLeaveInstance("inst-1", { emitLeave }),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.leave();
      });

expect(result.current.state).toBe("success");
expect(emitLeave).toHaveBeenCalled();
    });
  });

describe("error handling", () => {
it("transitions to error state with typed error code", async () => {
const emitLeave = vi.fn().mockRejectedValue(
makeApiError(404, "INSTANCE_NOT_FOUND"),
      );
const { result } = renderHook(
() => useLeaveInstance("inst-1", { emitLeave }),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.leave();
      });

expect(result.current.state).toBe("error");
expect(result.current.error).not.toBeNull();
    });

it("transitions to error with INSTANCE_NOT_JOINED", async () => {
const emitLeave = vi.fn().mockRejectedValue(
makeApiError(409, "INSTANCE_NOT_JOINED"),
      );
const { result } = renderHook(
() => useLeaveInstance("inst-1", { emitLeave }),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.leave();
      });

expect(result.current.state).toBe("error");
    });

it("transitions to error with INSTANCE_AUTH_REQUIRED", async () => {
const emitLeave = vi.fn().mockRejectedValue(
makeApiError(401, "INSTANCE_AUTH_REQUIRED"),
      );
const { result } = renderHook(
() => useLeaveInstance("inst-1", { emitLeave }),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.leave();
      });

expect(result.current.state).toBe("error");
    });

it("transitions to error with INSTANCE_FORBIDDEN", async () => {
const emitLeave = vi.fn().mockRejectedValue(
makeApiError(403, "INSTANCE_FORBIDDEN"),
      );
const { result } = renderHook(
() => useLeaveInstance("inst-1", { emitLeave }),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.leave();
      });

expect(result.current.state).toBe("error");
    });
  });

describe("double-click guard", () => {
it("allows only one mutation call when invoked twice in flight", async () => {
let resolveLeave: (value: unknown) => void;
const emitLeave = vi.fn(
() =>
new Promise<unknown>((resolve) => {
resolveLeave = resolve;
          }),
      );

const { result } = renderHook(
() => useLeaveInstance("inst-1", { emitLeave }),
{ wrapper: TestSwrProvider },
      );

const firstPromise = result.current.leave();

await act(async () => {
await result.current.leave();
      });

resolveLeave!(undefined);
await firstPromise;

expect(emitLeave).toHaveBeenCalledTimes(1);
    });
  });

describe("reset", () => {
it("clears error and returns to idle", async () => {
const emitLeave = vi.fn().mockRejectedValue(
makeApiError(404, "INSTANCE_NOT_FOUND"),
      );
const { result } = renderHook(
() => useLeaveInstance("inst-1", { emitLeave }),
{ wrapper: TestSwrProvider },
      );

await act(async () => {
await result.current.leave();
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