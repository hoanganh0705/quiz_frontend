import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/providers/QueryProvider";

import { useStartInstance } from "@/features/instances/hooks/useStartInstance";
import { ApiError, isApiError } from "@/lib/api";

const mockGetFeatureFlagValue = vi.fn();
vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockStartInstance = vi.fn();
const mockStartCountdown = vi.fn();
vi.mock("@/features/instances/services/instances.service", () => ({
  startInstance: (...args: unknown[]) => mockStartInstance(...args),
  startCountdown: (...args: unknown[]) => mockStartCountdown(...args),
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

function TestProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
  let invalidateQueriesSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateQueriesSpy = vi
      .spyOn(getQueryClient(), "invalidateQueries")
      .mockResolvedValue(undefined as never);
    mockGetFeatureFlagValue.mockReturnValue("live");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("starts in idle state", () => {
      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestProvider },
      );
      expect(result.current.state).toBe("idle");
      expect(result.current.error).toBeNull();
    });

    it("start is a no-op when flag is placeholder", async () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStartInstance).not.toHaveBeenCalled();
    });

    it("start is a no-op when instanceId is null", async () => {
      const { result } = renderHook(
        () => useStartInstance(null, hostPermissions),
        { wrapper: TestProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStartInstance).not.toHaveBeenCalled();
    });

    it("start is a no-op when permissions.canStart is false", async () => {
      const { result } = renderHook(
        () => useStartInstance("inst-1", playerPermissions),
        { wrapper: TestProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStartInstance).not.toHaveBeenCalled();
    });

    it("surfaces INSTANCE_HOST_REQUIRED locally when canStart is false", async () => {
      const { result } = renderHook(
        () => useStartInstance("inst-1", playerPermissions),
        { wrapper: TestProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("error");
      expect(result.current.error).not.toBeNull();
    });
  });

  describe("success path", () => {
    it("transitions to success state and invalidates queries", async () => {
      mockStartInstance.mockResolvedValue({
        instanceId: "inst-1",
        status: "running",
        startedAt: "2026-01-01T00:00:00Z",
      });

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(result.current.state).toBe("success");
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    it("forwards id to startInstance", async () => {
      mockStartInstance.mockResolvedValue({
        instanceId: "inst-1",
        status: "running",
        startedAt: "2026-01-01T00:00:00Z",
      });

      const { result } = renderHook(
        () => useStartInstance("inst-42", hostPermissions),
        { wrapper: TestProvider },
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
        { wrapper: TestProvider },
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
        { wrapper: TestProvider },
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
        { wrapper: TestProvider },
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
        { wrapper: TestProvider },
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
        { wrapper: TestProvider },
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
        { wrapper: TestProvider },
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
        { wrapper: TestProvider },
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
        { wrapper: TestProvider },
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

  describe("open status & countdown flow", () => {
    it("calls startCountdown when options.status is open", async () => {
      mockStartCountdown.mockResolvedValue({
        instanceId: "inst-1",
        status: "countdown",
        countdownStartedAt: "2026-01-01T00:00:00Z",
        countdownEndsAt: "2026-01-01T00:00:05Z",
      });

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions, { status: "open" }),
        { wrapper: TestProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStartCountdown).toHaveBeenCalledWith("inst-1", {});
      expect(mockStartInstance).not.toHaveBeenCalled();
      expect(result.current.state).toBe("success");
    });

    it("falls back to startCountdown when startInstance throws INSTANCE_NOT_IN_COUNTDOWN", async () => {
      mockStartInstance.mockRejectedValue(
        makeApiError(409, "INSTANCE_NOT_IN_COUNTDOWN"),
      );
      mockStartCountdown.mockResolvedValue({
        instanceId: "inst-1",
        status: "countdown",
        countdownStartedAt: "2026-01-01T00:00:00Z",
        countdownEndsAt: "2026-01-01T00:00:05Z",
      });

      const { result } = renderHook(
        () => useStartInstance("inst-1", hostPermissions),
        { wrapper: TestProvider },
      );

      await act(async () => {
        await result.current.start();
      });

      expect(mockStartInstance).toHaveBeenCalledWith("inst-1");
      expect(mockStartCountdown).toHaveBeenCalledWith("inst-1", {});
      expect(result.current.state).toBe("success");
    });
  });
});
