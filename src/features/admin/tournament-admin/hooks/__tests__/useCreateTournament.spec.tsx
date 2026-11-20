import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

const mockCreateTournament = vi.hoisted(() => vi.fn());
const mockInvalidateQueries = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockAddTournamentAdminBreadcrumb = vi.hoisted(() => vi.fn());

vi.mock("@/features/admin/services/tournament-admin.service", () => ({
  createTournament: (...args: unknown[]) => mockCreateTournament(...args),
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

function makeInput(): {
  title: string;
  difficulty: "easy" | "medium" | "hard";
  startAt: string;
  endAt: string;
} {
  return {
    title: "Spring Cup",
    difficulty: "medium",
    startAt: "2026-09-01T10:00:00.000Z",
    endAt: "2026-09-01T18:00:00.000Z",
  };
}

function makeCreatedTournament(): {
  tournamentId: string;
  title: string;
  status: "upcoming" | "registration" | "ongoing" | "finished" | "cancelled";
} {
  return {
    tournamentId: "00000000-0000-4000-8000-000000000001",
    title: "Spring Cup",
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
  mockCreateTournament.mockReset();
  mockInvalidateQueries.mockReset();
  mockAddTournamentAdminBreadcrumb.mockReset();
});

beforeEach(() => {
  mockCreateTournament.mockReset();
  mockInvalidateQueries.mockReset();
  mockAddTournamentAdminBreadcrumb.mockReset();
});

import { useCreateTournament } from "../useCreateTournament";

function renderUseCreateTournament() {
  return renderHook(() => useCreateTournament());
}

describe("useCreateTournament: success path", () => {
  it("success creates and invalidates both admin and public list keys", async () => {
    const created = makeCreatedTournament();
    mockCreateTournament.mockResolvedValueOnce(created);

    const { result } = renderUseCreateTournament();

    let returned: { tournamentId: string } | null = null;
    await act(async () => {
      returned = await result.current.create(makeInput());
    });

    expect(returned).toEqual(created);

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    const callArgs = mockInvalidateQueries.mock.calls[0];
    const predicate = callArgs?.[0]?.predicate as (query: { queryKey: unknown }) => boolean;
    expect(typeof predicate).toBe("function");

    expect(predicate({ queryKey: ["admin", "tournaments", "list", ""] })).toBe(true);
    expect(predicate({ queryKey: ["admin", "tournaments", "detail", "x"] })).toBe(true);
    expect(predicate({ queryKey: ["tournaments", "list", "q=cup"] })).toBe(true);
    expect(predicate({ queryKey: ["tournaments", "detail", "x"] })).toBe(false);
    expect(predicate({ queryKey: ["tournaments", "leaderboard", "x", "page=1"] })).toBe(false);
    expect(predicate({ queryKey: ["reviews", "list"] })).toBe(false);
  });

  it("emits started/success breadcrumbs on success", async () => {
    mockCreateTournament.mockResolvedValueOnce(makeCreatedTournament());

    const { result } = renderUseCreateTournament();

    await act(async () => {
      await result.current.create(makeInput());
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
      code?: string;
    };
    expect(successPayload.action).toBe("tournament.create");
    expect(successPayload.targetId).toBe(
      "00000000-0000-4000-8000-000000000001",
    );
  });

  it("isPending reflects the in-flight state", async () => {
    let resolveCreate: ((value: unknown) => void) | null = null;
    mockCreateTournament.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );

    const { result } = renderUseCreateTournament();

    let inflightPromise: Promise<unknown> = Promise.resolve();
    act(() => {
      inflightPromise = result.current.create(makeInput());
    });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    await act(async () => {
      resolveCreate?.(makeCreatedTournament());
      await inflightPromise;
    });

    expect(result.current.isPending).toBe(false);
  });
});

describe("useCreateTournament: error paths", () => {
  it("TOURNAMENT_VALIDATION surfaces without retry", async () => {
    const apiError = makeApiError("TOURNAMENT_VALIDATION", 400, "req-val-1");
    mockCreateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseCreateTournament();

    await act(async () => {
      await expect(result.current.create(makeInput())).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe("TOURNAMENT_VALIDATION");
    expect(result.current.error?.requestId).toBe("req-val-1");
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("TOURNAMENT_SLUG_CONFLICT surfaces without retry", async () => {
    const apiError = makeApiError(
      "TOURNAMENT_SLUG_CONFLICT",
      409,
      "req-slug-1",
    );
    mockCreateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseCreateTournament();

    await act(async () => {
      await expect(result.current.create(makeInput())).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe("TOURNAMENT_SLUG_CONFLICT");
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("ADMIN_FORBIDDEN surfaces without retry", async () => {
    const apiError = makeApiError("ADMIN_FORBIDDEN", 403, "req-forbid-1");
    mockCreateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseCreateTournament();

    await act(async () => {
      await expect(result.current.create(makeInput())).rejects.toBe(apiError);
    });

    expect(result.current.error?.code).toBe("ADMIN_FORBIDDEN");
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it("emits a failure breadcrumb with typed code + requestId", async () => {
    const apiError = makeApiError("TOURNAMENT_VALIDATION", 400, "req-val-2");
    mockCreateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseCreateTournament();

    await act(async () => {
      await result.current.create(makeInput()).catch(() => undefined);
    });

    const failureCall = mockAddTournamentAdminBreadcrumb.mock.calls.find(
      (c) => (c[0] as { status: string }).status === "failure",
    );
    expect(failureCall).toBeDefined();
    const payload = failureCall?.[0] as {
      action: string;
      code?: string;
      requestId?: string;
      correlationId?: string;
    };
    expect(payload.action).toBe("tournament.create");
    expect(payload.code).toBe("TOURNAMENT_VALIDATION");
    expect(payload.requestId).toBe("req-val-2");
  });
});

describe("useCreateTournament: reset + audit snapshot", () => {
  it("reset() clears error without firing another fetch", async () => {
    const apiError = makeApiError("TOURNAMENT_VALIDATION", 400, "req-val-3");
    mockCreateTournament.mockRejectedValueOnce(apiError);

    const { result } = renderUseCreateTournament();

    await act(async () => {
      await result.current.create(makeInput()).catch(() => undefined);
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.isPending).toBe(false);
    expect(result.current.audit.beforeInput).toBeNull();
    expect(result.current.audit.afterTournament).toBeNull();

    expect(mockCreateTournament).toHaveBeenCalledTimes(1);
  });

  it("audit snapshot captures the before input and the after tournament", async () => {
    const created = makeCreatedTournament();
    mockCreateTournament.mockResolvedValueOnce(created);

    const { result } = renderUseCreateTournament();

    const input = makeInput();
    await act(async () => {
      await result.current.create(input);
    });

    expect(result.current.audit.beforeInput).toEqual(input);
    expect(result.current.audit.afterTournament).toEqual(created);
  });
});
