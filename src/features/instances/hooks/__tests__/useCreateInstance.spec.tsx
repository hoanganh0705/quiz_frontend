import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { useCreateInstance } from "@/features/instances/hooks/useCreateInstance";
import { ApiError } from "@/lib/api";
import { getQueryClient } from "@/providers/QueryProvider";

const mockGetFeatureFlagValue = vi.fn();

const mockCreateInstance = vi.fn();
vi.mock("@/features/instances/services/instances.service", () => ({
  createInstance: (...args: unknown[]) => mockCreateInstance(...args),
}));

describe("useCreateInstance", () => {
  let invalidateQueriesSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    invalidateQueriesSpy = vi
      .spyOn(getQueryClient(), "invalidateQueries")
      .mockResolvedValue(undefined as never);
    mockGetFeatureFlagValue.mockReturnValue("live");
    mockCreateInstance.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("initializes with idle state and no error", () => {
    const { result } = renderHook(() => useCreateInstance());

    expect(result.current.state).toBe("idle");
    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it.skip("does nothing when feature flag is placeholder", async () => {
    mockGetFeatureFlagValue.mockReturnValue("placeholder");
    const { result } = renderHook(() => useCreateInstance());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.create({ quizId: "quiz-1" });
    });

    expect(outcome).toBeNull();
    expect(mockCreateInstance).not.toHaveBeenCalled();
    expect(result.current.state).toBe("idle");
  });

  it("successfully creates an instance and updates state", async () => {
    const mockResponse = { instanceId: "inst-123", message: "Created" };
    mockCreateInstance.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useCreateInstance());

    let outcome: unknown;
    await act(async () => {
      outcome = await result.current.create({
        quizId: "quiz-1",
        maxPlayers: 8,
      });
    });

    expect(mockCreateInstance).toHaveBeenCalledWith({
      quizId: "quiz-1",
      maxPlayers: 8,
    });
    expect(outcome).toEqual(mockResponse);
    expect(result.current.state).toBe("success");
    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBeNull();
    expect(invalidateQueriesSpy).toHaveBeenCalled();
  });

  it("handles creation errors and sets error state", async () => {
    const apiError = new ApiError({
      status: 400,
      code: "GLOBAL_VALIDATION_FAILED",
      message: "Invalid quiz",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
    mockCreateInstance.mockRejectedValueOnce(apiError);

    const { result } = renderHook(() => useCreateInstance());

    await act(async () => {
      try {
        await result.current.create({ quizId: "bad-quiz" });
      } catch {
        // Expected throw
      }
    });

    expect(result.current.state).toBe("error");
    expect(result.current.isCreating).toBe(false);
    expect(result.current.error).toBeDefined();
    expect(result.current.error?.code).toBe("GLOBAL_VALIDATION_FAILED");
  });

  it("resets state when reset() is called", async () => {
    const apiError = new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message: "Server error",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
    mockCreateInstance.mockRejectedValueOnce(apiError);

    const { result } = renderHook(() => useCreateInstance());

    await act(async () => {
      try {
        await result.current.create({ quizId: "quiz-1" });
      } catch {
        // Expected
      }
    });

    expect(result.current.state).toBe("error");

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.error).toBeNull();
  });
});
