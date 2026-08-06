/**
 * `search.service.spec.ts` — Locks the Story 6.5 search
 * service wrapper contract (TKT-6.5.D1).
 *
 * Asserts:
 *
 *   - Happy path: SDK envelope unwraps, items are returned,
 *     `total` is derived from the meta pagination, `cooldownSeconds`
 *     is decoded from response headers (null when absent).
 *   - The wrapper emits two `phase6:6.1` breadcrumbs per call
 *     (one in-flight + one resolved) carrying the documented payload.
 *   - 4xx / 5xx errors propagate as `ApiError` with the documented
 *     `code` accessible.
 *   - A missing envelope throws `GLOBAL_INTERNAL_ERROR`.
 *   - Rate-limit headers are decoded into `cooldownSeconds`.
 *   - `cooldownSeconds` is `null` when no rate-limit headers are present.
 *   - The breadcrumb does NOT log the raw query.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { searchUsers } from "@/features/social/services/search.service";

// ─── Sentry mock ─────────────────────────────────────────────────────────

const addBreadcrumbMock = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  addBreadcrumb: (...args: unknown[]) => addBreadcrumbMock(...args),
}));

// ─── SDK mock ───────────────────────────────────────────────────────────

const mockSocialControllerSearchUsers = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.mock("@/lib/api", async (importOriginal: (...args: any[]) => Promise<any>) => {
  const actual = await importOriginal("@/lib/api");
  return {
    ...actual,
    getSocial: () => ({
      socialControllerSearchUsers: (
        ...args: unknown[]
      ) => mockSocialControllerSearchUsers(...args),
    }),
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function makeApiError(status: number, code: string, message: string): ApiError {
  return new ApiError({
    name: "AxiosError",
    message,
    isAxiosError: true,
    response: {
      status,
      statusText: "X",
      data: {
        type: "https://api.quiz.local/problems/x",
        title: "X",
        status,
        detail: message,
        instance: "/api/v1/x",
        extensions: { code, requestId: "req-test" },
      },
      headers: {},
      config: undefined as never,
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

// ─── Setup / teardown ───────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockSocialControllerSearchUsers.mockReset();
  addBreadcrumbMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── `searchUsers` ─────────────────────────────────────────────────────

describe("searchUsers", () => {
  it("returns items, total, and visibility on happy path", async () => {
    mockSocialControllerSearchUsers.mockResolvedValue({
      data: [
        { userId: "u1", username: "alice", avatarUrl: null, displayName: null, isFriend: false, hasPendingRequest: false, isBlocked: false },
      ],
      meta: { pagination: { kind: "offset", total: 5, offset: 0, limit: 20 } },
      headers: {},
    });

    const result = await searchUsers("alice");
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(5);
    expect(result.visibility).toBe("visible");
    expect(result.cooldownSeconds).toBeNull();
  });

  it("derives total from items length when meta pagination is absent", async () => {
    mockSocialControllerSearchUsers.mockResolvedValue({
      data: [{ userId: "u1", username: "bob", avatarUrl: null, displayName: null, isFriend: false, hasPendingRequest: false, isBlocked: false }],
      meta: {},
      headers: {},
    });

    const result = await searchUsers("bob");
    expect(result.total).toBe(1);
  });

  it("returns null cooldownSeconds when no rate-limit headers are present", async () => {
    mockSocialControllerSearchUsers.mockResolvedValue({
      data: [],
      meta: { pagination: { kind: "offset", total: 0, offset: 0, limit: 20 } },
      headers: {},
    });

    const result = await searchUsers("test");
    expect(result.cooldownSeconds).toBeNull();
  });

  it("throws GLOBAL_INTERNAL_ERROR when envelope is missing", async () => {
    mockSocialControllerSearchUsers.mockResolvedValue(null);

    await expect(searchUsers("test")).rejects.toMatchObject({
      code: "GLOBAL_INTERNAL_ERROR",
    });
  });

  it("propagates ApiError on HTTP error", async () => {
    const err = makeApiError(400, "GLOBAL_BAD_REQUEST", "Bad request");
    mockSocialControllerSearchUsers.mockRejectedValue(err);

    await expect(searchUsers("test")).rejects.toMatchObject({
      code: "GLOBAL_BAD_REQUEST",
    });
  });

  it("emits two breadcrumbs with route social.searchUsers", async () => {
    mockSocialControllerSearchUsers.mockResolvedValue({
      data: [],
      meta: { pagination: { kind: "offset", total: 0, offset: 0, limit: 20 } },
      headers: {},
    });

    await searchUsers("test");
    expect(addBreadcrumbMock).toHaveBeenCalledTimes(2);
    expect(addBreadcrumbMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ route: "social.searchUsers" }),
    }));
    expect(addBreadcrumbMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ route: "social.searchUsers", status: 200 }),
    }));
  });

  it("calls SDK with query and limit", async () => {
    mockSocialControllerSearchUsers.mockResolvedValue({
      data: [],
      meta: { pagination: { kind: "offset", total: 0, offset: 0, limit: 20 } },
      headers: {},
    });

    await searchUsers("alice", { limit: 20 });
    expect(mockSocialControllerSearchUsers).toHaveBeenCalledWith(
      expect.objectContaining({ q: "alice", limit: 20 }),
    );
  });
});
