import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useEventuallyConsistentQuery } from "@/features/rankings/hooks/useEventuallyConsistentQuery";

function TestQueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe("useEventuallyConsistentQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the safe fallback when key === null", () => {
    const fetcher = vi.fn();

    const { result } = renderHook(
      () =>
        useEventuallyConsistentQuery<{ id: string }>({
          key: null,
          fetcher,
        }),
      { wrapper: TestQueryProvider },
    );

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);
    expect(result.current.lastValidatedAt).toBeNull();

    expect(fetcher).not.toHaveBeenCalled();

    result.current.retry();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns the fallbackData seed when key === null", () => {
    const fetcher = vi.fn();

    const { result } = renderHook(
      () =>
        useEventuallyConsistentQuery<{ id: string }>({
          key: null,
          fetcher,
          fallbackData: { id: "seed" },
        }),
      { wrapper: TestQueryProvider },
    );

    expect(result.current.data).toEqual({ id: "seed" });
    expect(result.current.isLoading).toBe(false);
  });

  it("populates data on successful fetch and sets lastValidatedAt", async () => {
    const fetcher = vi.fn().mockResolvedValue({ id: "fetched" });

    const { result } = renderHook(
      () =>
        useEventuallyConsistentQuery<{ id: string }>({
          key: ["test-key"] as const,
          fetcher,
        }),
      { wrapper: TestQueryProvider },
    );

    await waitFor(() => {
      expect(result.current.data).toEqual({ id: "fetched" });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);
    expect(result.current.lastValidatedAt).not.toBeNull();
    expect(typeof result.current.lastValidatedAt).toBe("string");
  });

  it("exposes isStale during in-flight revalidation while data is cached", async () => {
    let resolveRevalidation: (value: { id: string }) => void = () => {
      /* noop */
    };
    const fetchResult = { id: "initial" };
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<{ id: string }>((resolve) => {
          resolveRevalidation = resolve;
        }),
    );

    const { result } = renderHook(
      () =>
        useEventuallyConsistentQuery<{ id: string }>({
          key: ["stale-test"] as const,
          fetcher,
          fallbackData: fetchResult,
        }),
      { wrapper: TestQueryProvider },
    );

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });

    expect(result.current.data).toEqual({ id: "initial" });
    expect(result.current.isStale).toBe(true);

    resolveRevalidation({ id: "fresh" });
    await waitFor(() => {
      expect(result.current.isStale).toBe(false);
    });

    expect(result.current.data).toEqual({ id: "fresh" });
  });
});
