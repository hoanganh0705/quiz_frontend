import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useDeleteAllNotifications } from "@/features/notifications/hooks/useDeleteAllNotifications";
import { ApiError, isApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

const mockDeleteAllNotifications = vi.fn();
vi.mock("@/features/notifications/services/notifications.service", () => ({
  deleteAllNotifications: (...args: unknown[]) =>
    mockDeleteAllNotifications(...args),
}));

function makeApiError(status: number, code: string) {
  return new ApiError({
    isAxiosError: true,
    name: "AxiosError",
    message: `Mock ${status}: ${code}`,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      data: {
        type: "about:blank",
        title: `Error ${status}`,
        status,
        code,
        extensions: {
          code,
        },
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
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

describe("useDeleteAllNotifications", () => {
  let invalidateQueriesSpy: ReturnType<typeof vi.spyOn>;
  let setQueriesDataSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateQueriesSpy = vi
      .spyOn(getQueryClient(), "invalidateQueries")
      .mockResolvedValue(undefined as never);
    setQueriesDataSpy = vi.spyOn(getQueryClient(), "setQueriesData");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("starts in idle state", () => {
      const { result } = renderHook(() => useDeleteAllNotifications(), {
        wrapper: TestProvider,
      });
      expect(result.current.state).toBe("idle");
      expect(result.current.error).toBeNull();
    });
  });

  describe("success path", () => {
    it("transitions to success state and invalidates queries", async () => {
      mockDeleteAllNotifications.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteAllNotifications(), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteAll();
      });

      expect(result.current.state).toBe("success");
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    it("applies optimistic cache update before service call resolves", async () => {
      let resolveDelete: (value: unknown) => void;
      mockDeleteAllNotifications.mockImplementationOnce(
        () =>
          new Promise<unknown>((resolve) => {
            resolveDelete = resolve;
          }),
      );

      const { result } = renderHook(() => useDeleteAllNotifications(), {
        wrapper: TestProvider,
      });

      const p = result.current.deleteAll();
      await new Promise((resolve) => setTimeout(resolve, 5));
      resolveDelete!(undefined);
      await p;

      expect(setQueriesDataSpy).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("transitions to error on ApiError", async () => {
      mockDeleteAllNotifications.mockRejectedValue(
        makeApiError(500, "GLOBAL_INTERNAL_ERROR"),
      );

      const { result } = renderHook(() => useDeleteAllNotifications(), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteAll();
      });

      expect(result.current.state).toBe("error");
      expect(isApiError(result.current.error!)).toBe(true);
      expect(result.current.error?.code).toBe("GLOBAL_INTERNAL_ERROR");
    });

    it("wraps plain Error into ApiError", async () => {
      mockDeleteAllNotifications.mockRejectedValue(new Error("network failure"));

      const { result } = renderHook(() => useDeleteAllNotifications(), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteAll();
      });

      expect(isApiError(result.current.error!)).toBe(true);
    });
  });

  describe("double-click guard", () => {
    it("only fires one service call when invoked twice while pending", async () => {
      let resolveDelete: (value: unknown) => void;
      mockDeleteAllNotifications.mockImplementationOnce(
        () =>
          new Promise<unknown>((resolve) => {
            resolveDelete = resolve;
          }),
      );

      const { result } = renderHook(() => useDeleteAllNotifications(), {
        wrapper: TestProvider,
      });

      const firstPromise = result.current.deleteAll();

      await act(async () => {
        await result.current.deleteAll();
      });

      resolveDelete!(undefined);
      await firstPromise;

      expect(mockDeleteAllNotifications).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset", () => {
    it("clears error and returns to idle", async () => {
      mockDeleteAllNotifications.mockRejectedValue(
        makeApiError(500, "GLOBAL_INTERNAL_ERROR"),
      );

      const { result } = renderHook(() => useDeleteAllNotifications(), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteAll();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe("idle");
      expect(result.current.error).toBeNull();
    });
  });
});
