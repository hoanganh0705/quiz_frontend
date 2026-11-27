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
          selectedAnswers: {},
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
          totalDurationMs: durationMs,
          playerId: "",
          quizId: null,
          hostUserId: null,
          attemptId: null,
          playerSubmitted: false,
          players: [],
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

  it("ticks down across multiple concurrent consumers and never exceeds totalMs", () => {
    const now = Date.now();
    const durationMs = 1200000;

    useInstanceGameplayStore.getState().initializeQuestions(instanceId, [
      {
        questionId: "q-1",
        quizVersionId: "qv-1",
        position: 1,
        questionText: "Test?",
        imageUrl: null,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        answerOptions: [],
      },
    ], {
      quizTitle: "Long Battle",
      durationMs,
      startedAt: new Date(now + 1000).toISOString(),
    });

    const first = renderHook(() => useQuestionTimer(instanceId));
    const second = renderHook(() => useQuestionTimer(instanceId));

    expect(first.result.current.remainingMs).toBeLessThanOrEqual(durationMs);
    expect(second.result.current.remainingMs).toBeLessThanOrEqual(durationMs);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(first.result.current.remainingMs).toBeLessThan(durationMs - 3000);
    expect(second.result.current.remainingMs).toBeLessThan(durationMs - 3000);
  });
});
