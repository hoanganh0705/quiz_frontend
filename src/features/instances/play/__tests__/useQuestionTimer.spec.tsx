import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useQuestionTimer } from "../hooks/useQuestionTimer";
import { useInstanceGameplayStore } from "../stores/instanceGameplay.store";

describe("useQuestionTimer", () => {
  const instanceId = "test-instance-timer";

  beforeEach(() => {
    vi.useFakeTimers();
    useInstanceGameplayStore.getState().reset(instanceId);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("counts down remaining time as real time elapses", () => {
    const now = Date.now();
    const durationMs = 60000;

    useInstanceGameplayStore.setState({
      entries: {
        [instanceId]: {
          bundle: null,
          timing: {
            startsAt: new Date(now).toISOString(),
            durationMs,
            serverNow: new Date(now).toISOString(),
          },
          submission: null,
          result: null,
          progress: null,
          leaderboard: [],
          closure: null,
          finalLeaderboard: null,
          lastEventSequence: {},
          isReconciling: false,
          allQuestions: [],
          currentQuestionIndex: 0,
          quizTitle: "Test",
          durationPerQuestionMs: durationMs,
        },
      },
    });

    const { result } = renderHook(() => useQuestionTimer(instanceId));

    expect(result.current.isWindowOpen).toBe(true);
    expect(result.current.remainingMs).toBeLessThanOrEqual(60000);
    expect(result.current.remainingMs).toBeGreaterThan(50000);

    // Fast-forward 10 seconds
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.remainingMs).toBeLessThanOrEqual(50000);
    expect(result.current.remainingMs).toBeGreaterThan(39000);

    // Fast-forward past duration
    act(() => {
      vi.advanceTimersByTime(55000);
    });

    expect(result.current.remainingMs).toBe(0);
    expect(result.current.isWindowOpen).toBe(false);
  });
});
