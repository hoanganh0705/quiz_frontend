/**
 * `useStartInstance.spec.tsx` — locks the start mutation hook from TKT-5.7.B4.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.7.
 * Source ticket: TKT-5.7.G1.
 *
 * Tests cover:
 * - feature flag placeholder: no service call
 * - non-host: no service call (permission gate)
 * - null instanceId: no service call
 * - success path: state transitions and SWR invalidation
 * - error path: state transitions to 'error', isApiError is true
 * - double-click guard
 * - reset clears state
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useStartInstance } from "@/features/instances/hooks/useStartInstance";
import { ApiError, isApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockStartInstance = vi.fn();
vi.mock("@/features/instances/services/instances.service", () => ({
  startInstance: (...args: unknown[]) => mockStartInstance(...args),
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
  canStart: true,
  canCancel: false,
  canClose: false,
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

describe("useStartInstance", () => {
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
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );
      expect(result.current.state).toBe("idle");
      expect(result.current.error).toBeNull();
    });

    it("start is a no-op when flag is placeholder", async () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStartInstance).not.toHaveBeenCalled();
    });

    it("start is a no-op when instanceId is null", async () => {
      const { result } = renderHook(
        () => useStartInstance(null, hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStartInstance).not.toHaveBeenCalled();
    });

    it("start is a no-op when permissions.canStart is false", async () => {
      const { result } = renderHook(
        () => useStartInstance("inst-1", playerPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStartInstance).not.toHaveBeenCalled();
    });

    it("surfaces INSTANCE_HOST_REQUIRED locally when canStart is false", async () => {
      const { result } = renderHook(
        () => useStartInstance("inst-1", playerPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("error");
      expect(result.current.error).not.toBeNull();
    });
  });

  describe("success path", () => {
    it("transitions to success state and invalidates SWR keys", async () => {
      mockStartInstance.mockResolvedValue({
        instanceId: "inst-1",
        status: "running",
        startedAt: "2026-01-01T00:00:00Z",
      });

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("success");
      expect(mutateMock).toHaveBeenCalled();
    });

    it("forwards id to startInstance", async () => {
      mockStartInstance.mockResolvedValue({
        instanceId: "inst-1",
        status: "running",
        startedAt: "2026-01-01T00:00:00Z",
      });

      const { result } = renderHook(
        () => useStartInstance("inst-42", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStartInstance).toHaveBeenCalledWith("inst-42");
    });
  });

  describe("error handling", () => {
    it("transitions to error state when service rejects with INSTANCE_HOST_REQUIRED", async () => {
      mockStartInstance.mockRejectedValue(
        makeApiError(403, "INSTANCE_HOST_REQUIRED"),
      );

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("error");
      expect(isApiError(result.current.error!)).toBe(true);
      expect(result.current.error).not.toBeNull();
    });

    it("transitions to error state when service rejects with INSTANCE_INVALID_TRANSITION", async () => {
      mockStartInstance.mockRejectedValue(
        makeApiError(409, "INSTANCE_INVALID_TRANSITION"),
      );

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("error");
      expect(result.current.error).not.toBeNull();
    });

    it("transitions to error state when service rejects with INSTANCE_NOT_FOUND", async () => {
      mockStartInstance.mockRejectedValue(
        makeApiError(404, "INSTANCE_NOT_FOUND"),
      );

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("error");
      expect(result.current.error).not.toBeNull();
    });

    it("transitions to error state when service rejects with INSTANCE_AUTH_REQUIRED", async () => {
      mockStartInstance.mockRejectedValue(
        makeApiError(401, "INSTANCE_AUTH_REQUIRED"),
      );

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("error");
      expect(result.current.error).not.toBeNull();
    });

    it("transitions to error state when service rejects with INSTANCE_FORBIDDEN", async () => {
      mockStartInstance.mockRejectedValue(
        makeApiError(403, "INSTANCE_FORBIDDEN"),
      );

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("error");
      expect(result.current.error).not.toBeNull();
    });

    it("wraps plain errors as ApiError", async () => {
      mockStartInstance.mockRejectedValue(new Error("Network failure"));

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("error");
      expect(isApiError(result.current.error!)).toBe(true);
    });
  });

  describe("double-click guard", () => {
    it("allows only one mutation call when invoked twice in flight", async () => {
      let resolveStart: (value: unknown) => void;
      mockStartInstance.mockImplementationOnce(
        () =>
          new Promise<unknown>((resolve) => {
            resolveStart = resolve;
          }),
      );

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      const firstPromise = result.current.start();

      await act(async () => {
        await result.current.start();
      });

      resolveStart!({
        instanceId: "inst-1",
        status: "running",
        startedAt: "2026-01-01T00:00:00Z",
      });
      await firstPromise;

      expect(mockStartInstance).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset", () => {
    it("clears error and returns to idle", async () => {
      mockStartInstance.mockRejectedValue(
        makeApiError(403, "INSTANCE_HOST_REQUIRED"),
      );

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestSwrProvider },
      );

      await act(async () => {
        await result.current.start();
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