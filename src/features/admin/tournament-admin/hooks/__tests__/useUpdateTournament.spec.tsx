import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

const mockUpdateTournament = vi.hoisted(() => vi.fn());
const mockInvalidateQueries = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAddTournamentAdminBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock("@/features/admin/services/tournament-admin.service", () => ({
  updateTournament: (...args: unknown[]) => mockUpdateTournament(...args),
}));

vi.mock("@/providers/QueryProvider", () => ({
  getQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("@/lib/admin/admin_live_sentry", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/admin/admin_live_sentry")
  >("@/lib/admin/admin_live_sentry");
  return {
    ...actual,
    addTournamentAdminBreadcrumb: (...args: unknown[]) =>
      mockAddTournamentAdminBreadcrumb(...args),
  };
});

const TOURNAMENT_ID = "00000000-0000-4000-8000-000000000001";

function makeInput(): {
  title: string;
  difficulty: "easy" | "medium" | "hard";
  startAt: string;
  endAt: string;
} {
  return {
    title: "Updated Spring Cup",
    difficulty: "hard",
    startAt: "2026-09-02T10:00:00.000Z",
    endAt: "2026-09-02T18:00:00.000Z",
  };
}

function makeUpdatedTournament(): {
  tournamentId: string;
  title: string;
  status: "upcoming" | "registration" | "ongoing" | "finished" | "cancelled";
} {
  return {
    tournamentId: TOURNAMENT_ID,
    title: "Updated Spring Cup",
    status: "upcoming",
  };
}

function makeApiError(
  code: string,
  status: number,
  requestId: string,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    response: {
      status,
      data: {
        status,
        detail: code,
        title: code,
        extensions: { code, requestId },
      },
    },
    name: "AxiosError",
    message: code,
    config: undefined,
    request: undefined,
    toJSON: () => ({}),
  } as unknown as Parameters<(typeof ApiError)["fromAxios"]>[0]);
}

afterEach(() => {
  vi.clearAllMocks();
  mockUpdateTournament.mockReset();
  mockInvalidateQueries.mockReset();
  mockAddTournamentAdminBreadcrumb.mockReset();
});

beforeEach(() => {
  mockUpdateTournament.mockReset();
  mockInvalidateQueries.mockReset();
  mockAddTournamentAdminBreadcrumb.mockReset();
});

import { useUpdateTournament } from "../useUpdateTournament";

function renderUseUpdateTournament() {
  return renderHook(() => useUpdateTournament());
}

describe("useUpdateTournament: success path", () => {
  it("success invalidates admin + public list + public detail keys", async () => {
    mockUpdateTournament.mockResolvedValueOnce(makeUpdatedTournament());

    const { result } = renderUseUpdateTournament();

    let returned: { tournamentId: string } | null = null;
    await act(async () => {
      returned = await result.current.update(TOURNAMENT_ID, makeInput());
    });

    expect(returned).toEqual(makeUpdatedTournament());

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    const callArgs = mockInvalidateQueries.mock.calls[0];
    const predicate = callArgs?.[0]?.predicate as (query: { queryKey: unknown }) => boolean;
    expect(typeof predicate).toBe("function");

    expect(predicate({ queryKey: ["admin", "tournaments", "list", ""] })).toBe(true);
    expect(predicate({ queryKey: ["admin", "tournaments", "detail", "x"] })).toBe(true);
    expect(predicate({ queryKey: ["tournaments", "list", "q=cup"] })).toBe(true);
    expect(predicate({ queryKey: ["tournaments", "detail", TOURNAMENT_ID] })).toBe(true);

    expect(
      predicate({
        queryKey: [
          "tournaments",
          "detail",
          "00000000-0000-4000-8000-000000000002",
        ],
      }),
    ).toBe(false);

    expect(predicate({ queryKey: ["reviews", "list"] })).toBe(false);
  });

  it("emits started/success breadcrumbs on success", async () => {
    mockUpdateTournament.mockResolvedValueOnce(makeUpdatedTournament());

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await result.current.update(TOURNAMENT_ID, makeInput());
    });

    const calls = mockAddTournamentAdminBreadcrumb.mock.calls;
    const actions = calls.map((c) => (c[0] as { status: string }).status);
    expect(actions).toContain("started");
    expect(actions).toContain("success");

    const successCall = calls.find(
      (c) => (c[0] as { status: string }).status === "success",
    );
    const successPayload = successCall?.[0] as {
      action: string;
      targetId?: string;
    };
    expect(successPayload.action).toBe("tournament.update");
    expect(successPayload.targetId).toBe(TOURNAMENT_ID);
  });

  it("isPending reflects the in-flight state", async () => {
    let resolveUpdate: ((value: unknown) => void) | null = null;
    mockUpdateTournament.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    const { result } = renderUseUpdateTournament();

    let inflightPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      inflightPromise = result.current.update(TOURNAMENT_ID, makeInput());
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolveUpdate?.(makeUpdatedTournament());
      await inflightPromise;
    });

    expect(result.current.isPending).toBe(false);
  });
});

describe("useUpdateTournament: error paths", () => {
  it("TOURNAMENT_ALREADY_STARTED surfaces without retry", async () => {
    const apiError = makeApiError(
      "TOURNAMENT_ALREADY_STARTED",
      409,
      "req-already-1",
    );
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await expect(
        result.current.update(TOURNAMENT_ID, makeInput()),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe("TOURNAMENT_ALREADY_STARTED");
    expect(result.current.error?.requestId).toBe("req-already-1");

    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("TOURNAMENT_NOT_FOUND surfaces without retry, and revalidates admin + detail keys", async () => {
    const apiError = makeApiError(
      "TOURNAMENT_NOT_FOUND",
      404,
      "req-notfound-1",
    );
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await expect(
        result.current.update(TOURNAMENT_ID, makeInput()),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe("TOURNAMENT_NOT_FOUND");
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("TOURNAMENT_VALIDATION surfaces without retry", async () => {
    const apiError = makeApiError("TOURNAMENT_VALIDATION", 400, "req-val-1");
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await expect(
        result.current.update(TOURNAMENT_ID, makeInput()),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe("TOURNAMENT_VALIDATION");
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("ADMIN_FORBIDDEN surfaces without retry", async () => {
    const apiError = makeApiError("ADMIN_FORBIDDEN", 403, "req-forbid-1");
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await expect(
        result.current.update(TOURNAMENT_ID, makeInput()),
      ).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe("ADMIN_FORBIDDEN");
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("emits a failure breadcrumb with typed code + requestId", async () => {
    const apiError = makeApiError(
      "TOURNAMENT_ALREADY_STARTED",
      409,
      "req-already-2",
    );
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await result.current
        .update(TOURNAMENT_ID, makeInput())
        .catch(() => undefined);
    });

    const failureCall = mockAddTournamentAdminBreadcrumb.mock.calls.find(
      (c) => (c[0] as { status: string }).status === "failure",
    );
    expect(failureCall).toBeDefined();
    const payload = failureCall?.[0] as {
      action: string;
      code?: string;
      requestId?: string;
    };
    expect(payload.action).toBe("tournament.update");
    expect(payload.code).toBe("TOURNAMENT_ALREADY_STARTED");
    expect(payload.requestId).toBe("req-already-2");
  });
});

describe("useUpdateTournament: reset + audit snapshot", () => {
  it("reset() clears error without firing another fetch", async () => {
    const apiError = makeApiError("TOURNAMENT_VALIDATION", 400, "req-val-2");
    mockUpdateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseUpdateTournament();

    await act(async () => {
      await result.current
        .update(TOURNAMENT_ID, makeInput())
        .catch(() => undefined);
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
    expect(result.current.audit.beforeTournamentId).toBeNull();
    expect(result.current.audit.afterTournament).toBeNull();
    expect(mockUpdateTournament).toHaveBeenCalledTimes(1);
  });

  it("audit snapshot captures before / after tournament on success", async () => {
    const updated = makeUpdatedTournament();
    mockUpdateTournament.mockResolvedValueOnce(updated);

    const { result } = renderUseUpdateTournament();

    const input = makeInput();
    await act(async () => {
      await result.current.update(TOURNAMENT_ID, input);
    });

    expect(result.current.audit.beforeTournamentId).toBe(TOURNAMENT_ID);
    expect(result.current.audit.beforeInput).toEqual(input);
    expect(result.current.audit.afterTournamentId).toBe(TOURNAMENT_ID);
    expect(result.current.audit.afterTournament).toEqual(updated);
  });
});
