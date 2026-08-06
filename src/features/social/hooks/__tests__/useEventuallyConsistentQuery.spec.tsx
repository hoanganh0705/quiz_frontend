/**
 * `useEventuallyConsistentQuery.spec.tsx` — Locks the
 * eventual-consistency primitive contract (TKT-6.3.D4).
 *
 * Asserts each `staleness` derivation branch:
 *
 *   - `stale_at` older than `staleAfterMs` → `'stale'`.
 *   - `stale_at` within `staleAfterMs` → `'recent'`.
 *   - `isStale: true` → `'stale'`.
 *   - `isStale: false` → `'recent'`.
 *   - No signal → `'recent'`.
 *
 * Also covers: `isStale` revalidation signal, `retry()` clears the
 * error and revalidates, `key: null` disables the fetch.
 */

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";

import {
  resolveStaleness,
  useEventuallyConsistentQuery,
} from "@/features/social/hooks/useEventuallyConsistentQuery";

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

const NOW_MS = 1_700_000_000_000;

describe("resolveStaleness — pure helper", () => {
  it("returns 'stale' for a stale_at older than the threshold", () => {
    const fiveMinutesAgo = new Date(NOW_MS - 5 * 60_000).toISOString();
    const result = resolveStaleness(
      { staleAt: fiveMinutesAgo },
      NOW_MS,
      60_000,
    );
    expect(result.staleness).toBe("stale");
    expect(result.source).toBe("stale_at");
  });

  it("returns 'recent' for a stale_at within the threshold", () => {
    const tenSecondsAgo = new Date(NOW_MS - 10_000).toISOString();
    const result = resolveStaleness(
      { staleAt: tenSecondsAgo },
      NOW_MS,
      60_000,
    );
    expect(result.staleness).toBe("recent");
    expect(result.source).toBe("stale_at");
  });

  it("returns 'stale' when isStale is true", () => {
    const result = resolveStaleness({ isStale: true }, NOW_MS, 60_000);
    expect(result.staleness).toBe("stale");
    expect(result.source).toBe("is_stale_flag");
  });

  it("returns 'recent' when isStale is false", () => {
    const result = resolveStaleness({ isStale: false }, NOW_MS, 60_000);
    expect(result.staleness).toBe("recent");
    expect(result.source).toBe("is_stale_flag");
  });

  it("returns 'recent' for a payload with no signal", () => {
    const result = resolveStaleness({ foo: "bar" }, NOW_MS, 60_000);
    expect(result.staleness).toBe("recent");
    expect(result.source).toBe("none");
  });

  it("returns 'recent' for an unparseable stale_at (source still 'stale_at')", () => {
    const result = resolveStaleness(
      { staleAt: "not-a-date" },
      NOW_MS,
      60_000,
    );
    expect(result.staleness).toBe("recent");
    expect(result.source).toBe("stale_at");
  });

  it("isStale flag takes precedence over stale_at when both are present", () => {
    const result = resolveStaleness(
      { isStale: true, staleAt: new Date(NOW_MS - 10_000).toISOString() },
      NOW_MS,
      60_000,
    );
    expect(result.source).toBe("is_stale_flag");
  });
});

describe("useEventuallyConsistentQuery — staleness derivation", () => {
  afterEach(() => {
    cleanup();
  });

  it("derives 'stale' from a stale_at older than the threshold", async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();
    const fetcher = vi
      .fn()
      .mockResolvedValue({ value: 1, staleAt: fiveMinutesAgo });
    const { result } = renderHook(
      () => useEventuallyConsistentQuery(["test", "stale-at"], fetcher),
      { wrapper: TestSwrProvider },
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.staleness).toBe("stale");
    expect(result.current.stalenessSource).toBe("stale_at");
  });

  it("derives 'stale' from an isStale: true flag", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1, isStale: true });
    const { result } = renderHook(
      () => useEventuallyConsistentQuery(["test", "is-stale"], fetcher),
      { wrapper: TestSwrProvider },
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.staleness).toBe("stale");
    expect(result.current.stalenessSource).toBe("is_stale_flag");
  });

  it("derives 'recent' from no signal", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(
      () => useEventuallyConsistentQuery(["test", "no-signal"], fetcher),
      { wrapper: TestSwrProvider },
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.staleness).toBe("recent");
    expect(result.current.stalenessSource).toBe("none");
  });
});

describe("useEventuallyConsistentQuery — retry", () => {
  afterEach(() => {
    cleanup();
  });

  it("retry() re-invokes the fetcher and clears the error", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValueOnce({ value: 2 });
    const { result } = renderHook(
      () => useEventuallyConsistentQuery(["test", "retry"], fetcher),
      { wrapper: TestSwrProvider },
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });
    // After the first rejection the error should surface.
    await waitFor(
      () => {
        expect(result.current.error).not.toBeNull();
      },
      { timeout: 3000 },
    );
    expect(result.current.data).toBeNull();
    await act(async () => {
      result.current.retry();
    });
    await waitFor(
      () => {
        expect(result.current.data).not.toBeNull();
      },
      { timeout: 3000 },
    );
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("useEventuallyConsistentQuery — null key", () => {
  it("returns the safe fallback when key is null (no service call)", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(
      () => useEventuallyConsistentQuery(null, fetcher),
      { wrapper: TestSwrProvider },
    );
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
});