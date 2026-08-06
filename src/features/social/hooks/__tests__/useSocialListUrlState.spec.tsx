/**
 * `useSocialListUrlState.spec.tsx` — Locks the URL state contract for
 * the Story 6.2 list pages.
 *
 * Source epic:   Epic 6.2.
 * Source ticket: TKT-6.2.B3.
 *
 * Asserts:
 *
 *   - Default state: no cursor, default limit.
 *   - `cursor=…` from URL is exposed as `cursor`.
 *   - `limit=…` from URL is exposed as `limit`.
 *   - `setCursor(next)` updates the URL (replace navigation).
 *   - `setLimit(n)` clamps to `[1, SOCIAL_GRAPH_MAX_LIMIT]` and removes
 *     the URL key when the value equals the default.
 *   - `reset()` removes `cursor` and `limit` from the URL.
 *   - `targetUserId` change auto-resets the cursor / limit keys.
 *   - Writing a forbidden key (e.g. `followId`) throws.
 *
 * The hook depends on Next.js navigation primitives; the suite
 * stubs them via `next/navigation` so the spec runs in a pure-JS
 * environment with no App Router wiring.
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockReplace = vi.fn();
let mockSearchParams: URLSearchParams = new URLSearchParams();
let mockPathname = "/social/users/u-1/followers";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

import { useSocialListUrlState, __testing } from "@/features/social/hooks/useSocialListUrlState";
import {
  FORBIDDEN_SOCIAL_STORAGE_KEYS,
  SOCIAL_GRAPH_DEFAULT_LIMIT,
  SOCIAL_GRAPH_MAX_LIMIT,
} from "@/features/social/pagination-invariants";

function buildHref(replaceArg: string): { pathname: string; query: string } {
  const qIndex = replaceArg.indexOf("?");
  if (qIndex === -1) return { pathname: replaceArg, query: "" };
  return {
    pathname: replaceArg.slice(0, qIndex),
    query: replaceArg.slice(qIndex + 1),
  };
}

describe("useSocialListUrlState", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
    mockPathname = "/social/users/u-1/followers";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns default cursor + limit when the URL is empty", () => {
    const { result } = renderHook(() =>
      useSocialListUrlState("u-1"),
    );
    expect(result.current.cursor).toBeNull();
    expect(result.current.limit).toBe(SOCIAL_GRAPH_DEFAULT_LIMIT);
  });

  it("reads an explicit cursor from the URL", () => {
    mockSearchParams = new URLSearchParams("cursor=opaque-cursor&limit=50");
    const { result } = renderHook(() => useSocialListUrlState("u-1"));
    expect(result.current.cursor).toBe("opaque-cursor");
    expect(result.current.limit).toBe(50);
  });

  it("clamps the limit above SOCIAL_GRAPH_MAX_LIMIT", () => {
    mockSearchParams = new URLSearchParams(`limit=${SOCIAL_GRAPH_MAX_LIMIT + 50}`);
    const { result } = renderHook(() => useSocialListUrlState("u-1"));
    expect(result.current.limit).toBe(SOCIAL_GRAPH_MAX_LIMIT);
  });

  it("falls back to the default limit for non-positive limits", () => {
    mockSearchParams = new URLSearchParams("limit=-1");
    const { result } = renderHook(() => useSocialListUrlState("u-1"));
    expect(result.current.limit).toBe(SOCIAL_GRAPH_DEFAULT_LIMIT);
  });

  it("setCursor writes the next cursor to the URL", () => {
    const { result } = renderHook(() => useSocialListUrlState("u-1"));
    act(() => result.current.setCursor("cursor-abc"));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    const [{ query }] = [buildHref(mockReplace.mock.calls[0][0] as string)];
    expect(new URLSearchParams(query).get("cursor")).toBe("cursor-abc");
  });

  it("setCursor(null) deletes the cursor key", () => {
    mockSearchParams = new URLSearchParams("cursor=keep");
    const { result } = renderHook(() => useSocialListUrlState("u-1"));
    act(() => result.current.setCursor(null));
    const [{ query }] = [buildHref(mockReplace.mock.calls[0][0] as string)];
    expect(new URLSearchParams(query).has("cursor")).toBe(false);
  });

  it("setLimit clamps to [1, SOCIAL_GRAPH_MAX_LIMIT]", () => {
    const { result } = renderHook(() => useSocialListUrlState("u-1"));
    act(() => result.current.setLimit(0));
    // Non-positive values are silently rejected (no-op).
    expect(mockReplace).not.toHaveBeenCalled();
    act(() => result.current.setLimit(SOCIAL_GRAPH_MAX_LIMIT + 1));
    const [{ query }] = [buildHref(mockReplace.mock.calls[0][0] as string)];
    expect(new URLSearchParams(query).get("limit")).toBe(
      String(SOCIAL_GRAPH_MAX_LIMIT),
    );
  });

  it("setLimit removes the limit key when reverting to the default", () => {
    mockSearchParams = new URLSearchParams("limit=50");
    const { result } = renderHook(() => useSocialListUrlState("u-1"));
    act(() => result.current.setLimit(SOCIAL_GRAPH_DEFAULT_LIMIT));
    expect(mockReplace.mock.calls[0][0]).not.toContain("limit=");
  });

  it("reset removes cursor and limit from the URL", () => {
    mockSearchParams = new URLSearchParams("cursor=c-1&limit=30&keep=1");
    const { result } = renderHook(() => useSocialListUrlState("u-1"));
    act(() => result.current.reset());
    const [{ query }] = [buildHref(mockReplace.mock.calls[0][0] as string)];
    const params = new URLSearchParams(query);
    expect(params.has("cursor")).toBe(false);
    expect(params.has("limit")).toBe(false);
    expect(params.get("keep")).toBe("1");
  });

  it("targetUserId change auto-resets cursor and limit", () => {
    mockSearchParams = new URLSearchParams("cursor=c-1&limit=30");
    const { rerender } = renderHook(
      ({ userId }: { userId: string }) => useSocialListUrlState(userId),
      { initialProps: { userId: "u-1" } },
    );
    rerender({ userId: "u-2" });
    expect(mockReplace).toHaveBeenCalled();
    const [{ query }] = [buildHref(mockReplace.mock.calls.at(-1)![0] as string)];
    const params = new URLSearchParams(query);
    expect(params.has("cursor")).toBe(false);
    expect(params.has("limit")).toBe(false);
  });
});

describe("useSocialListUrlState forbidden keys", () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
  });

  it("writeParams throws when a forbidden URL key is written", () => {
    expect(() =>
      __testing.assertNoForbiddenKeys(
        new URLSearchParams(`${FORBIDDEN_SOCIAL_STORAGE_KEYS[0]}=x`),
      ),
    ).toThrow(/forbidden URL key/);
  });
});
