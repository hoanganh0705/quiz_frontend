/**
 * `useJoinInstance.spec.tsx` — locks the join mutation hook from TKT-5.7.B4.
 *
 * Source epic:   Epic 5.1.
 * Source story:  5.7.
 * Source ticket: TKT-5.7.G1.
 *
 * Tests cover:
 * - feature flag placeholder: no service call
 * - null instanceId: no service call
 * - success path: state transitions, SWR invalidation
 * - error path: typed ApiError for INSTANCE_* codes (state transitions to 'error')
 * - double-click guard: only one mutation call in flight
 * - no blind retry
 * - reset clears state
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useJoinInstance } from "@/features/instances/hooks/useJoinInstance";
import { ApiError, isApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockJoinInstance = vi.fn();
vi.mock("@/features/instances/services/instances.service", () => ({
  joinInstance: (...args: unknown[]) => mockJoinInstance(...args),
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

describe("useJoinInstance", () => {
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
      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });
      expect(result.current.state).toBe("idle");
      expect(result.current.error).toBeNull();
    });

    it("join is a no-op when flag is placeholder", async () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(mockJoinInstance).not.toHaveBeenCalled();
    });

    it("join is a no-op when instanceId is null", async () => {
      const { result } = renderHook(() => useJoinInstance(null), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(mockJoinInstance).not.toHaveBeenCalled();
    });
  });

  describe("success path", () => {
    it("transitions to success state and invalidates SWR keys", async () => {
      mockJoinInstance.mockResolvedValue({
        instanceId: "inst-1",
        currentUserRole: "player",
        joinedAt: "2026-01-01T00:00:00Z",
      });

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(result.current.state).toBe("success");
      expect(mutateMock).toHaveBeenCalled();
    });

    it("forwards id to joinInstance", async () => {
      mockJoinInstance.mockResolvedValue({
        instanceId: "inst-1",
        currentUserRole: "player",
        joinedAt: "2026-01-01T00:00:00Z",
      });

      const { result } = renderHook(() => useJoinInstance("inst-42"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(mockJoinInstance).toHaveBeenCalledWith("inst-42");
    });
  });

  describe("error handling", () => {
    it("transitions to error with INSTANCE_NOT_FOUND", async () => {
      mockJoinInstance.mockRejectedValue(makeApiError(404, "INSTANCE_NOT_FOUND"));

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(result.current.state).toBe("error");
      expect(isApiError(result.current.error!)).toBe(true);
    });

    it("transitions to error with INSTANCE_CLOSED", async () => {
      mockJoinInstance.mockRejectedValue(makeApiError(409, "INSTANCE_CLOSED"));

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(result.current.state).toBe("error");
    });

    it("transitions to error with INSTANCE_FULL", async () => {
      mockJoinInstance.mockRejectedValue(makeApiError(409, "INSTANCE_FULL"));

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(result.current.state).toBe("error");
    });

    it("transitions to error with INSTANCE_ALREADY_JOINED", async () => {
      mockJoinInstance.mockRejectedValue(
        makeApiError(409, "INSTANCE_ALREADY_JOINED"),
      );

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(result.current.state).toBe("error");
    });

    it("transitions to error with INSTANCE_AUTH_REQUIRED", async () => {
      mockJoinInstance.mockRejectedValue(
        makeApiError(401, "INSTANCE_AUTH_REQUIRED"),
      );

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(result.current.state).toBe("error");
    });

    it("transitions to error with INSTANCE_FORBIDDEN", async () => {
      mockJoinInstance.mockRejectedValue(makeApiError(403, "INSTANCE_FORBIDDEN"));

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(result.current.state).toBe("error");
    });

    it("wraps plain errors as ApiError", async () => {
      mockJoinInstance.mockRejectedValue(new Error("Network failure"));

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      expect(result.current.state).toBe("error");
      expect(isApiError(result.current.error!)).toBe(true);
    });
  });

  describe("double-click guard", () => {
    it("allows only one mutation call when invoked twice in flight", async () => {
      let resolveJoin: (value: unknown) => void;
      mockJoinInstance.mockImplementationOnce(
        () =>
          new Promise<unknown>((resolve) => {
            resolveJoin = resolve;
          }),
      );

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      const firstPromise = result.current.join();

      await act(async () => {
        await result.current.join();
      });

      resolveJoin!({
        instanceId: "inst-1",
        currentUserRole: "player",
        joinedAt: "2026-01-01T00:00:00Z",
      });
      await firstPromise;

      expect(mockJoinInstance).toHaveBeenCalledTimes(1);
    });
  });

  describe("no blind retry", () => {
    it("does not auto-retry after an error", async () => {
      mockJoinInstance.mockRejectedValue(makeApiError(500, "GLOBAL_INTERNAL_ERROR"));

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
      });

      await new Promise((r) => setTimeout(r, 10));
      expect(mockJoinInstance).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset", () => {
    it("clears error and returns to idle", async () => {
      mockJoinInstance.mockRejectedValue(makeApiError(404, "INSTANCE_NOT_FOUND"));

      const { result } = renderHook(() => useJoinInstance("inst-1"), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.join();
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