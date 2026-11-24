import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useDeleteNotification } from "@/features/notifications/hooks/useDeleteNotification";
import { ApiError, isApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

const mockGetFeatureFlagValue = vi.fn();

const mockDeleteNotification = vi.fn();
vi.mock("@/features/notifications/services/notifications.service", () => ({
  deleteNotification: (...args: unknown[]) => mockDeleteNotification(...args),
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

describe("useDeleteNotification", () => {
  let invalidateQueriesSpy: ReturnType<typeof vi.spyOn>;
  let setQueriesDataSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateQueriesSpy = vi
      .spyOn(getQueryClient(), "invalidateQueries")
      .mockResolvedValue(undefined as never);
    setQueriesDataSpy = vi.spyOn(getQueryClient(), "setQueriesData");
    mockGetFeatureFlagValue.mockReturnValue("live");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("starts in idle state", () => {
      const { result } = renderHook(() => useDeleteNotification("n1"), {
        wrapper: TestProvider,
      });
      expect(result.current.state).toBe("idle");
      expect(result.current.error).toBeNull();
    });

    it.skip("delete is a no-op when flag is placeholder", async () => {
      mockGetFeatureFlagValue.mockReturnValue("placeholder");

      const { result } = renderHook(() => useDeleteNotification("n1"), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteNotification();
      });

      expect(mockDeleteNotification).not.toHaveBeenCalled();
    });

    it("delete is a no-op when notificationId is null", async () => {
      const { result } = renderHook(() => useDeleteNotification(null), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteNotification();
      });

      expect(mockDeleteNotification).not.toHaveBeenCalled();
    });
  });

  describe("success path", () => {
    it("transitions to success state and invalidates queries", async () => {
      mockDeleteNotification.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteNotification("n1"), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteNotification();
      });

      expect(result.current.state).toBe("success");
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    it("applies an optimistic removal before the service call resolves", async () => {
      let resolveDelete: (value: unknown) => void;
      mockDeleteNotification.mockImplementationOnce(
        () =>
          new Promise<unknown>((resolve) => {
            resolveDelete = resolve;
          }),
      );

      const { result } = renderHook(() => useDeleteNotification("n1"), {
        wrapper: TestProvider,
      });

      const p = result.current.deleteNotification();
      await new Promise((resolve) => setTimeout(resolve, 5));
      resolveDelete!(undefined);
      await p;

      expect(setQueriesDataSpy).toHaveBeenCalled();
    });

    it("forwards the notification id to the service", async () => {
      mockDeleteNotification.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteNotification("n-7"), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteNotification();
      });

      expect(mockDeleteNotification).toHaveBeenCalledWith("n-7");
    });
  });

  describe("error handling", () => {
    it("transitions to error with NOTIFICATION_NOT_FOUND", async () => {
      mockDeleteNotification.mockRejectedValue(
        makeApiError(404, "NOTIFICATION_NOT_FOUND"),
      );

      const { result } = renderHook(() => useDeleteNotification("n1"), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteNotification();
      });

      expect(result.current.state).toBe("error");
      expect(isApiError(result.current.error!)).toBe(true);
      expect(result.current.error?.code).toBe("NOTIFICATION_NOT_FOUND");
    });

    it("transitions to error with NOTIFICATION_DELETION_FORBIDDEN", async () => {
      mockDeleteNotification.mockRejectedValue(
        makeApiError(403, "NOTIFICATION_DELETION_FORBIDDEN"),
      );

      const { result } = renderHook(() => useDeleteNotification("n1"), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteNotification();
      });

      expect(result.current.error?.code).toBe(
        "NOTIFICATION_DELETION_FORBIDDEN",
      );
    });

    it("transitions to error with NOTIFICATION_FORBIDDEN", async () => {
      mockDeleteNotification.mockRejectedValue(
        makeApiError(403, "NOTIFICATION_FORBIDDEN"),
      );

      const { result } = renderHook(() => useDeleteNotification("n1"), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteNotification();
      });

      expect(result.current.error?.code).toBe("NOTIFICATION_FORBIDDEN");
    });

    it("wraps plain Error into ApiError", async () => {
      mockDeleteNotification.mockRejectedValue(new Error("network"));

      const { result } = renderHook(() => useDeleteNotification("n1"), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteNotification();
      });

      expect(isApiError(result.current.error!)).toBe(true);
    });
  });

  describe("double-click guard", () => {
    it("only fires one service call when invoked twice while pending", async () => {
      let resolveDelete: (value: unknown) => void;
      mockDeleteNotification.mockImplementationOnce(
        () =>
          new Promise<unknown>((resolve) => {
            resolveDelete = resolve;
          }),
      );

      const { result } = renderHook(() => useDeleteNotification("n1"), {
        wrapper: TestProvider,
      });

      const firstPromise = result.current.deleteNotification();

      await act(async () => {
        await result.current.deleteNotification();
      });

      resolveDelete!(undefined);
      await firstPromise;

      expect(mockDeleteNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset", () => {
    it("clears error and returns to idle", async () => {
      mockDeleteNotification.mockRejectedValue(
        makeApiError(404, "NOTIFICATION_NOT_FOUND"),
      );

      const { result } = renderHook(() => useDeleteNotification("n1"), {
        wrapper: TestProvider,
      });

      await act(async () => {
        await result.current.deleteNotification();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe("idle");
      expect(result.current.error).toBeNull();
    });
  });
});
