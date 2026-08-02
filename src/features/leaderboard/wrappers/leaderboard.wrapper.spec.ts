/**
 * `leaderboard.wrapper.spec.ts` — locks the leaderboard wrapper contract.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.A2.
 *
 * Six cases per the ticket AC #1–8:
 *
 *   (A2 AC #1) `getLeaderboard` is a thin pass-through with no
 *   business logic, no error wrapping, no SWR cache invalidation.
 *   (A2 AC #2) `getLeaderboard(period, params?)` returns the inner-
 *   unwrapped envelope unchanged.
 *   (A2 AC #3) `getLeaderboardWithPagination(period, params)` accepts
 *   `{ limit, offset }` and passes them through to the SDK call.
 *   (A2 AC #4) The wrapper does NOT forward a `cursor` parameter.
 *   (A2 AC #5) The wrapper name uses camelCase; the SDK operation
 *   name `rankingControllerGetGlobalLeaderboard` is NOT re-exported.
 *   (A2 AC #6) Generated failures propagate unchanged as `ApiError`.
 *
 * Test-environment notes: the file lives under the leaderboard
 * wrappers directory so the project's vitest node project picks it up
 * (per vitest.config.ts include pattern).
 */

import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

vi.mock("@/lib/api/generated/leaderboards/leaderboards", () => ({
  getLeaderboards: vi.fn(),
}));

import { getLeaderboards } from "@/lib/api/generated/leaderboards/leaderboards";
import {
  getLeaderboard,
  getLeaderboardWithPagination,
} from "@/features/leaderboard/wrappers/leaderboard.wrapper";

const getLeaderboardsMock = vi.mocked(getLeaderboards);

function makeSdkDoubles() {
  const rankingControllerGetGlobalLeaderboard = vi.fn();
  getLeaderboardsMock.mockImplementation(() => ({
    rankingControllerGetGlobalLeaderboard,
  }) as unknown as ReturnType<typeof getLeaderboards>);
  return { rankingControllerGetGlobalLeaderboard };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("leaderboard.wrapper", () => {
  it("getLeaderboard forwards period and params to the SDK unchanged", async () => {
    const { rankingControllerGetGlobalLeaderboard } = makeSdkDoubles();
    const expected = { data: { entries: [] } } as unknown as Awaited<
      ReturnType<typeof rankingControllerGetGlobalLeaderboard>
    >;
    rankingControllerGetGlobalLeaderboard.mockResolvedValue(expected);

    const result = await getLeaderboard("weekly", { limit: 20, offset: 0 });

    expect(rankingControllerGetGlobalLeaderboard).toHaveBeenCalledTimes(1);
    expect(rankingControllerGetGlobalLeaderboard).toHaveBeenCalledWith({
      period: "weekly",
      limit: 20,
      offset: 0,
    });
    expect(result).toBe(expected);
  });

  it("getLeaderboard omits limit and offset when params is undefined", async () => {
    const { rankingControllerGetGlobalLeaderboard } = makeSdkDoubles();
    const expected = { data: { entries: [] } } as unknown as Awaited<
      ReturnType<typeof rankingControllerGetGlobalLeaderboard>
    >;
    rankingControllerGetGlobalLeaderboard.mockResolvedValue(expected);

    await getLeaderboard("monthly");

    expect(rankingControllerGetGlobalLeaderboard).toHaveBeenCalledWith({
      period: "monthly",
    });
  });

  it("getLeaderboard forwards all three periods on the wire", async () => {
    const { rankingControllerGetGlobalLeaderboard } = makeSdkDoubles();
    rankingControllerGetGlobalLeaderboard.mockResolvedValue({} as never);

    for (const period of ["weekly", "monthly", "all_time"] as const) {
      await getLeaderboard(period, { limit: 10, offset: 0 });
    }

    expect(rankingControllerGetGlobalLeaderboard).toHaveBeenCalledTimes(3);
    expect(rankingControllerGetGlobalLeaderboard).toHaveBeenNthCalledWith(1, {
      period: "weekly",
      limit: 10,
      offset: 0,
    });
    expect(rankingControllerGetGlobalLeaderboard).toHaveBeenNthCalledWith(2, {
      period: "monthly",
      limit: 10,
      offset: 0,
    });
    expect(rankingControllerGetGlobalLeaderboard).toHaveBeenNthCalledWith(3, {
      period: "all_time",
      limit: 10,
      offset: 0,
    });
  });

  it("getLeaderboardWithPagination forwards required limit and offset", async () => {
    const { rankingControllerGetGlobalLeaderboard } = makeSdkDoubles();
    const expected = { data: { entries: [] } } as unknown as Awaited<
      ReturnType<typeof rankingControllerGetGlobalLeaderboard>
    >;
    rankingControllerGetGlobalLeaderboard.mockResolvedValue(expected);

    const result = await getLeaderboardWithPagination("weekly", {
      limit: 20,
      offset: 40,
    });

    expect(rankingControllerGetGlobalLeaderboard).toHaveBeenCalledWith({
      period: "weekly",
      limit: 20,
      offset: 40,
    });
    expect(result).toBe(expected);
  });

  it("wrappers do NOT forward a cursor parameter (drift A1 #1)", async () => {
    const { rankingControllerGetGlobalLeaderboard } = makeSdkDoubles();
    rankingControllerGetGlobalLeaderboard.mockResolvedValue({} as never);

    await getLeaderboard("weekly", { limit: 20, offset: 0 });
    await getLeaderboardWithPagination("weekly", { limit: 20, offset: 0 });

    for (const call of rankingControllerGetGlobalLeaderboard.mock.calls) {
      expect(call[0]).not.toHaveProperty("cursor");
    }
  });

  it("propagates generated failures unchanged as ApiError", async () => {
    const { rankingControllerGetGlobalLeaderboard } = makeSdkDoubles();
    const apiError = new ApiError({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          type: "about:blank",
          title: "Internal Server Error",
          status: 500,
          code: "INTERNAL",
        },
      },
      config: undefined,
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
    rankingControllerGetGlobalLeaderboard.mockRejectedValue(apiError);

    await expect(getLeaderboard("weekly")).rejects.toBe(apiError);
    await expect(
      getLeaderboardWithPagination("weekly", { limit: 20, offset: 0 })
    ).rejects.toBe(apiError);
  });
});
