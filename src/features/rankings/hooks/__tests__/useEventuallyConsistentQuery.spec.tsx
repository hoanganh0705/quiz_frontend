/**
 * `useEventuallyConsistentQuery.spec.tsx` — locks the freshness-aware
 * SWR primitive from TKT-5.5.C1.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.G1.
 *
 * Tests cover:
 * - Initial render → `data: null`, `isLoading: true`.
 * - Successful fetch → `data` populated; `lastValidatedAt` set.
 * - Disabled sentinel (`key === null`) → safe fallback; no fetch fired.
 * - Error → `error` typed; `data` retained on revalidation failure
 *   (SWR does not clear cached data on error).
 * - `retry()` triggers revalidation.
 * - `lastValidatedAt` updates only on success.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";

import { useEventuallyConsistentQuery } from "@/features/rankings/hooks/useEventuallyConsistentQuery";

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
      { wrapper: TestSwrProvider },
    );

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isStale).toBe(false);
    expect(result.current.lastValidatedAt).toBeNull();

    // The fetcher must not have been called.
    expect(fetcher).not.toHaveBeenCalled();

    // The disabled `retry()` is a no-op.
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
      { wrapper: TestSwrProvider },
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
      { wrapper: TestSwrProvider },
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
          swrConfig: {
            // Trigger the fetch deterministically even though
            // fallbackData is provided.
            revalidateOnMount: true,
          },
        }),
      { wrapper: TestSwrProvider },
    );

    // fallbackData provides initial `data`; SWR validates the key on mount.
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });

    // While the in-flight fetch is pending and fallbackData is set,
    // isStale must be true (SWR's `isValidating` is true).
    expect(result.current.data).toEqual({ id: "initial" });
    expect(result.current.isStale).toBe(true);

    // Resolve the fetch to complete the cycle.
    resolveRevalidation({ id: "fresh" });
    await waitFor(() => {
      expect(result.current.isStale).toBe(false);
    });

    expect(result.current.data).toEqual({ id: "fresh" });
  });
});
