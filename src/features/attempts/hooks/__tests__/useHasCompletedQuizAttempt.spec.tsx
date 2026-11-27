import { createElement, type ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook as rtlRenderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";

import { useHasCompletedQuizAttempt } from "@/features/attempts/hooks/useHasCompletedQuizAttempt";

function renderHook<Result, Props>(
  render: (initialProps: Props) => Result,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRenderHook(render, {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });
}

const listMyAttemptsMock = vi.hoisted(() => vi.fn());
const useAuthSessionMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/attempts/services/attempts.service", () => ({
  listMyAttempts: listMyAttemptsMock,
}));

vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: useAuthSessionMock,
}));

const SESSION_ID = "user-1";
const QUIZ_ID = "quiz-1";

function setBootstrapAuthenticated() {
  useAuthSessionMock.mockReturnValue({
    bootstrapState: "authenticated",
    isAuthenticated: true,
    currentUser: { userId: SESSION_ID, id: SESSION_ID },
  });
}

function setBootstrapUnauthenticated() {
  useAuthSessionMock.mockReturnValue({
    bootstrapState: "unauthenticated",
    isAuthenticated: false,
    currentUser: null,
  });
}

function setBootstrapLoading() {
  useAuthSessionMock.mockReturnValue({
    bootstrapState: "bootstrapping",
    isAuthenticated: false,
    currentUser: null,
  });
}

function makeApiError(
  status: number,
  code = `CODE_${status}`,
  message = `Mock ${status}`,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: "AxiosError",
    message,
    code,
    config: undefined,
    request: undefined,
    response: {
      status,
      statusText: message,
      data: {
        type: "https://api.quiz.local/problems/x",
        title: message,
        status,
        detail: message,
        extensions: { code, requestId: "req-test" },
      },
      headers: {},
      config: undefined as never,
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

function makeAttempt(
  overrides: Partial<{
    attemptId: string;
    quizId: string;
    status: "started" | "completed" | "abandoned";
  }> = {},
) {
  return {
    attemptId: overrides.attemptId ?? "a1",
    quizId: overrides.quizId ?? QUIZ_ID,
    quizTitle: "Sample",
    quizSlug: "sample",
    versionNumber: 1,
    difficulty: "medium",
    contextType: "self",
    status: overrides.status ?? "completed",
    scorePercent: 90,
    correctCount: 9,
    startedAt: "2026-08-01T00:00:00.000Z",
    finishedAt: "2026-08-01T00:05:00.000Z",
    xpEarned: 50,
  };
}

function mockAttemptsResponse(items: ReturnType<typeof makeAttempt>[]) {
  return {
    data: items,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  setBootstrapAuthenticated();
});

afterEach(() => {
  listMyAttemptsMock.mockReset();
});

describe("useHasCompletedQuizAttempt — happy path", () => {
  it('forwards quizId, status="completed", limit=1 to the service', async () => {
    listMyAttemptsMock.mockResolvedValue(mockAttemptsResponse([makeAttempt()]));

    const { result } = renderHook(() =>
      useHasCompletedQuizAttempt({ quizId: QUIZ_ID }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(listMyAttemptsMock).toHaveBeenCalledWith({
      quizId: QUIZ_ID,
      status: "completed",
      limit: 1,
    });
    expect(result.current.hasCompletedAttempt).toBe(true);
  });

  it("resolves to false when the response is empty", async () => {
    listMyAttemptsMock.mockResolvedValue(mockAttemptsResponse([]));

    const { result } = renderHook(() =>
      useHasCompletedQuizAttempt({ quizId: QUIZ_ID }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasCompletedAttempt).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("404 from the service is treated as no attempts (not an error)", async () => {
    listMyAttemptsMock.mockRejectedValue(makeApiError(404, "GLOBAL_NOT_FOUND"));

    const { result } = renderHook(() =>
      useHasCompletedQuizAttempt({ quizId: QUIZ_ID }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasCompletedAttempt).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe("useHasCompletedQuizAttempt — error handling", () => {
  it("5xx surfaces as ApiError", async () => {
    listMyAttemptsMock.mockRejectedValue(
      makeApiError(500, "GLOBAL_INTERNAL_ERROR"),
    );

    const { result } = renderHook(() =>
      useHasCompletedQuizAttempt({ quizId: QUIZ_ID }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(500);
    expect(result.current.hasCompletedAttempt).toBe(false);
  });

  it("retry after 5xx re-runs the fetcher and resolves to true", async () => {
    listMyAttemptsMock.mockRejectedValueOnce(
      makeApiError(500, "GLOBAL_INTERNAL_ERROR"),
    );

    const { result } = renderHook(() =>
      useHasCompletedQuizAttempt({ quizId: QUIZ_ID }),
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    listMyAttemptsMock.mockResolvedValueOnce(
      mockAttemptsResponse([makeAttempt()]),
    );

    await result.current.retry();
    await waitFor(() => {
      expect(result.current.hasCompletedAttempt).toBe(true);
    });
    expect(result.current.error).toBeNull();
  });
});

describe("useHasCompletedQuizAttempt — auth gating", () => {
  it("does not fetch when the viewer is unauthenticated", async () => {
    setBootstrapUnauthenticated();

    const { result } = renderHook(() =>
      useHasCompletedQuizAttempt({ quizId: QUIZ_ID }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(listMyAttemptsMock).not.toHaveBeenCalled();
    expect(result.current.hasCompletedAttempt).toBe(false);
  });

  it("does not fetch while the auth bootstrap is loading", () => {
    setBootstrapLoading();

    const { result } = renderHook(() =>
      useHasCompletedQuizAttempt({ quizId: QUIZ_ID }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(listMyAttemptsMock).not.toHaveBeenCalled();
  });

  it("does not fetch when quizId is null", async () => {
    const { result } = renderHook(() =>
      useHasCompletedQuizAttempt({ quizId: null }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(listMyAttemptsMock).not.toHaveBeenCalled();
    expect(result.current.hasCompletedAttempt).toBe(false);
  });
});
