/**
 * `useQuizByIdOrSlug.spec.tsx` — locks the player-detail hook contract.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.B2.
 *
 * Six cases per the ticket AC #1–6:
 *
 *   (B2 AC #1) The SWR key is stable and includes the exact
 *   `idOrSlug`.
 *   (B2 AC #2) Successful data is projected through the A3
 *   `projectQuizToPlayerView` before leaving the hook.
 *   (B2 AC #3) `ApiError(404)` returns `{ quiz: null, notFound:
 *   true, error: null }`.
 *   (B2 AC #4) 429 and 5xx behavior comes from B1; the hook
 *   exposes `retry` and does not add another retry loop.
 *   (B2 AC #5) Empty/malformed successful envelopes become a
 *   typed error rather than a false 404.
 *   (B2 AC #6) Changing `idOrSlug` cannot show the previous quiz
 *   as the new route's resolved content.
 *
 * The wrapper is mocked because the test is for the hook
 * integration, not for the SDK. The projection from A3 is real
 * code so the test exercises both layers.
 *
 * Test-environment notes: the file lives under
 * `src/components/primitives/__tests__/` so vitest's `jsdom`
 * project picks it up.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

import { ApiError } from "@/lib/api";

import { useQuizByIdOrSlug } from "@/features/quizzes/hooks/useQuizByIdOrSlug";
import type { QuizResponseDto } from "@/lib/api/generated/schemas/quizResponseDto";

vi.mock("@/features/quizzes/api/quizzes.wrapper", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/quizzes/api/quizzes.wrapper")
  >("@/features/quizzes/api/quizzes.wrapper");
  return {
    ...actual,
    getQuizByIdOrSlug: vi.fn(),
  };
});

import { getQuizByIdOrSlug } from "@/features/quizzes/api/quizzes.wrapper";

const getQuizByIdOrSlugMock = vi.mocked(getQuizByIdOrSlug);

function makeResponse(quizId: string): QuizResponseDto {
  return {
    quizId,
    creatorId: null,
    title: `Quiz ${quizId}`,
    description: null,
    slug: quizId,
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: false,
    publishedVersionId: null,
    publishedVersion: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    tags: [],
  };
}

function makeApiError(
  status: number,
  code: string = `CODE_${status}`,
): ApiError {
  return new ApiError({
    isAxiosError: true,
    response: {
      status,
      data: {
        type: "about:blank",
        title: `Error ${status}`,
        status,
        code,
      },
    },
    config: undefined,
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

beforeEach(() => {
  getQuizByIdOrSlugMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useQuizByIdOrSlug — success", () => {
  it("(B2 AC #1 + #2) returns the projected player-safe quiz when the wrapper resolves", async () => {
    getQuizByIdOrSlugMock.mockResolvedValue(makeResponse("quiz-A"));

    const { result } = renderHook(() => useQuizByIdOrSlug("quiz-A"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.quiz).not.toBeNull();
    expect(result.current.quiz?.quizId).toBe("quiz-A");
    expect(result.current.quiz?.slug).toBe("quiz-A");
    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getQuizByIdOrSlugMock).toHaveBeenCalledWith("quiz-A");
  });

  it("(B2 AC #2) the projection is applied: an isCorrect leak on the wrapper response is stripped", async () => {
    const response = makeResponse("quiz-leaky");
    const raw = response as QuizResponseDto & {
      publishedVersion?: unknown;
    };
    raw.publishedVersion = {
      quizVersionId: "v-1",
      quizId: "quiz-leaky",
      versionNumber: 1,
      status: "published",
      difficulty: "easy",
      durationMs: 60000,
      passingScorePercent: 70,
      rewardXp: 50,
      creatorId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      publishedAt: "2026-01-02T00:00:00.000Z",
      archivedAt: null,
      updatedAt: "2026-01-02T00:00:00.000Z",
      questions: [
        {
          questionId: "q-1",
          quizVersionId: "v-1",
          position: 1,
          questionText: "Capital of France?",
          imageUrl: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z",
          answerOptions: [
            {
              optionId: "o-1",
              position: 1,
              value: "Paris",
              createdAt: "2026-01-01T00:00:00.000Z",
              isCorrect: true,
            },
          ],
        },
      ],
    };
    getQuizByIdOrSlugMock.mockResolvedValue(raw as unknown as QuizResponseDto);

    const { result } = renderHook(() => useQuizByIdOrSlug("quiz-leaky"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const question = result.current.quiz?.publishedVersion?.questions[0];
    expect(question).toBeDefined();
    const option = question?.answerOptions[0];
    expect(option).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(option, "isCorrect")).toBe(
      false,
    );
  });
});

describe("useQuizByIdOrSlug — 404", () => {
  it("(B2 AC #3) maps 404 to `{ quiz: null, notFound: true, error: null }`", async () => {
    getQuizByIdOrSlugMock.mockRejectedValue(
      makeApiError(404, "QUIZ_NOT_FOUND"),
    );

    const { result } = renderHook(() => useQuizByIdOrSlug("quiz-missing"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.quiz).toBeNull();
    expect(result.current.notFound).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
  });
});

describe("useQuizByIdOrSlug — non-404 errors", () => {
  it("(B2 AC #4) 5xx surfaces the typed error and does not retry on its own", async () => {
    getQuizByIdOrSlugMock.mockRejectedValue(makeApiError(500, "INTERNAL"));

    const { result } = renderHook(() => useQuizByIdOrSlug("quiz-500"));

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    expect(result.current.quiz).toBeNull();
    expect(result.current.notFound).toBe(false);
    expect(result.current.error?.status).toBe(500);
    expect(getQuizByIdOrSlugMock).toHaveBeenCalledTimes(1);
  });

  it("(B2 AC #4) exposes `retry` so the page can render an inline retry action", async () => {
    let callCount = 0;
    getQuizByIdOrSlugMock.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        throw makeApiError(500, "INTERNAL");
      }
      return makeResponse("quiz-after-retry");
    });

    const { result } = renderHook(() => useQuizByIdOrSlug("quiz-retry"));

    await waitFor(() => {
      expect(result.current.error?.status).toBe(500);
    });

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.quiz).not.toBeNull();
    });

    expect(result.current.quiz?.quizId).toBe("quiz-after-retry");
    expect(result.current.error).toBeNull();
    expect(getQuizByIdOrSlugMock).toHaveBeenCalledTimes(2);
  });
});

describe("useQuizByIdOrSlug — malformed envelope", () => {
  it("(B2 AC #5) an empty/malformed envelope becomes a typed error, not a 404", async () => {
    getQuizByIdOrSlugMock.mockResolvedValue(null as unknown as QuizResponseDto);

    const { result } = renderHook(() => useQuizByIdOrSlug("quiz-malformed"));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

describe("useQuizByIdOrSlug — key change", () => {
  it("(B2 AC #6) changing `idOrSlug` cannot show the previous quiz as the new result", async () => {
    const pendingFirst: { resolve: (value: QuizResponseDto) => void } = {
      resolve: () => undefined,
    };
    const pendingSecond: { resolve: (value: QuizResponseDto) => void } = {
      resolve: () => undefined,
    };

    let callCount = 0;
    getQuizByIdOrSlugMock.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise<QuizResponseDto>((resolve) => {
          pendingFirst.resolve = resolve;
        });
      }
      return new Promise<QuizResponseDto>((resolve) => {
        pendingSecond.resolve = resolve;
      });
    });

    const { result, rerender } = renderHook(
      ({ idOrSlug }: { idOrSlug: string | null }) =>
        useQuizByIdOrSlug(idOrSlug),
      { initialProps: { idOrSlug: "quiz-A" as string | null } },
    );

    await waitFor(() => {
      expect(getQuizByIdOrSlugMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      rerender({ idOrSlug: "quiz-B" });
    });

    await act(async () => {
      pendingSecond.resolve(makeResponse("quiz-B"));
    });

    await waitFor(() => {
      expect(result.current.quiz?.quizId).toBe("quiz-B");
    });

    // Late resolution of the first quiz must not overwrite the
    // resolved quiz-B.
    await act(async () => {
      pendingFirst.resolve(makeResponse("quiz-A-stale"));
    });

    expect(result.current.quiz?.quizId).toBe("quiz-B");
  });
});

describe("useQuizByIdOrSlug — disabled state", () => {
  it("returns `{ quiz: null, isLoading: false, notFound: false }` when `idOrSlug` is null", () => {
    const { result } = renderHook(() => useQuizByIdOrSlug(null));

    expect(result.current.quiz).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBeNull();
    expect(getQuizByIdOrSlugMock).not.toHaveBeenCalled();
  });
});
