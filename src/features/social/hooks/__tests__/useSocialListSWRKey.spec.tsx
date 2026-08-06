/**
 * `useSocialListSWRKey.spec.ts` — Locks the cache-key factory
 * contract (TKT-6.2.D1).
 *
 * Asserts:
 *
 *   - The key contains `kind`, `targetUserId`, `cursor`, `limit`
 *     only — no `followId` / `friendshipId` / `blockId` / `offset`.
 *   - The key is a frozen tuple (mutation throws in strict mode).
 *   - `SOCIAL_LIST_SWR_DEFAULTS.revalidateOnFocus === true`.
 *   - `SOCIAL_LIST_SWR_DEFAULTS.keepPreviousData === true`.
 *   - `cursor: null` is preserved (not coerced to `'null'`).
 *   - The hook form returns `null` when `targetUserId` is `null`.
 */

import { describe, expect, it } from "vitest";

import { renderHook } from "@testing-library/react";

import {
  SOCIAL_LIST_SWR_DEFAULTS,
  makeSocialListSWRKey,
  useSocialListSWRKey,
} from "@/features/social/hooks/useSocialListSWRKey";

describe("makeSocialListSWRKey", () => {
  it("produces a 6-tuple with the documented fields", () => {
    const key = makeSocialListSWRKey(
      "followers",
      "11111111-1111-1111-1111-111111111111",
      "cursor-abc",
      20,
    );
    expect(key).not.toBeNull();
    expect(key).toEqual([
      "social",
      "list",
      "followers",
      "11111111-1111-1111-1111-111111111111",
      "cursor-abc",
      20,
    ]);
  });

  it("never contains followId / friendshipId / blockId / offset", () => {
    const key = makeSocialListSWRKey(
      "following",
      "11111111-1111-1111-1111-111111111111",
      null,
      50,
    );
    expect(key).not.toBeNull();
    const flat = JSON.stringify(key);
    expect(flat).not.toMatch(/followId/);
    expect(flat).not.toMatch(/friendshipId/);
    expect(flat).not.toMatch(/blockId/);
    expect(flat).not.toMatch(/offset/);
  });

  it("preserves cursor: null without coercion", () => {
    const key = makeSocialListSWRKey("friends", "user-1", null, 20);
    expect(key).not.toBeNull();
    expect(key![4]).toBeNull();
  });

  it("returns null for missing targetUserId", () => {
    const key = makeSocialListSWRKey("friends", "", null, 20);
    expect(key).toBeNull();
  });

  it("clamps the limit to [1, max]", () => {
    const tooLarge = makeSocialListSWRKey("followers", "user-1", null, 9999);
    expect(tooLarge).not.toBeNull();
    expect(tooLarge![5]).toBe(100);

    const tooSmall = makeSocialListSWRKey("followers", "user-1", null, 0);
    expect(tooSmall).not.toBeNull();
    // 0 is invalid; the factory falls back to the default limit.
    expect(tooSmall![5]).toBe(20);
  });

  it("returns a frozen tuple", () => {
    const key = makeSocialListSWRKey("blocked", "user-1", null, 20);
    expect(key).not.toBeNull();
    expect(Object.isFrozen(key)).toBe(true);
  });
});

describe("useSocialListSWRKey", () => {
  it("returns null when targetUserId is null", () => {
    const { result } = renderHook(() =>
      useSocialListSWRKey("followers", null, null, 20),
    );
    expect(result.current).toBeNull();
  });

  it("forwards to makeSocialListSWRKey when targetUserId is set", () => {
    const { result } = renderHook(() =>
      useSocialListSWRKey("followers", "user-1", "cursor-1", 20),
    );
    expect(result.current).toEqual([
      "social",
      "list",
      "followers",
      "user-1",
      "cursor-1",
      20,
    ]);
  });
});

describe("SOCIAL_LIST_SWR_DEFAULTS", () => {
  it("revalidates on focus", () => {
    expect(SOCIAL_LIST_SWR_DEFAULTS.revalidateOnFocus).toBe(true);
  });

  it("preserves previous data", () => {
    expect(SOCIAL_LIST_SWR_DEFAULTS.keepPreviousData).toBe(true);
  });

  it("revalidates on reconnect and visibility", () => {
    expect(SOCIAL_LIST_SWR_DEFAULTS.revalidateOnReconnect).toBe(true);
    expect(SOCIAL_LIST_SWR_DEFAULTS.revalidateOnVisibility).toBe(true);
  });

  it("dedupes aggressively", () => {
    expect(SOCIAL_LIST_SWR_DEFAULTS.dedupeInterval).toBeGreaterThanOrEqual(
      1_000,
    );
  });
});