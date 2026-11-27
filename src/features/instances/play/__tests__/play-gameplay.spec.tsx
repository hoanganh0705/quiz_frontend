import { fireEvent, render, screen, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  QuizQuestionAuthorDto,
  InstanceDetailResponseDto,
  QuizResponseDto,
} from "@/lib/api/generated/schemas";
import {
  useInstanceGameplayStore,
  selectGameplayBundle,
  selectCanAdvanceQuestion,
} from "../stores/instanceGameplay.store";
import { InstanceGamePage } from "../pages/InstanceGamePage";
import * as attemptsService from "@/features/attempts/services/attempts.service";
import * as instancesService from "@/features/instances/services";
import * as quizzesService from "@/features/quizzes/services/quizzes.service";


vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: vi.fn().mockReturnValue({
    currentUser: { userId: "user-1", username: "tester" },
    isAuthenticated: true,
  }),
}));

const mockInstanceId = "01a1e4c3-f0da-7018-963d-7f85efb81417";

const mockQuestions: QuizQuestionAuthorDto[] = [
  {
    questionId: "q-1",
    quizVersionId: "qv-1",
    position: 1,
    questionText: "What is the capital of France?",
    imageUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    answerOptions: [
      {
        answerOptionId: "opt-1",
        questionId: "q-1",
        position: 1,
        optionText: "Paris",
      },
      {
        answerOptionId: "opt-2",
        questionId: "q-1",
        position: 2,
        optionText: "London",
      },
    ],
  },
  {
    questionId: "q-2",
    quizVersionId: "qv-1",
    position: 2,
    questionText: "What is 2 + 2?",
    imageUrl: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    answerOptions: [
      {
        answerOptionId: "opt-3",
        questionId: "q-2",
        position: 1,
        optionText: "4",
      },
      {
        answerOptionId: "opt-4",
        questionId: "q-2",
        position: 2,
        optionText: "5",
      },
    ],
  },
];

describe("Instance gameplay store and progression", () => {
  beforeEach(() => {
    useInstanceGameplayStore.getState().reset(mockInstanceId);
  });

  it("initializes questions and advances to the next question", () => {
    const store = useInstanceGameplayStore.getState();

    store.initializeQuestions(mockInstanceId, mockQuestions, {
      quizTitle: "Trivia Quiz",
      quizCategory: "General",
      difficulty: "easy",
      durationMs: 60000,
    });

    const stateAfterInit = useInstanceGameplayStore.getState();
    const bundle1 = selectGameplayBundle(stateAfterInit, mockInstanceId);
    expect(bundle1).not.toBeNull();
    expect(bundle1?.question.id).toBe("q-1");
    expect(bundle1?.question.text).toBe("What is the capital of France?");
    expect(bundle1?.options.length).toBe(2);
    expect(selectCanAdvanceQuestion(stateAfterInit, mockInstanceId)).toBe(true);

    // Advance to question 2
    act(() => {
      useInstanceGameplayStore.getState().advanceQuestion(mockInstanceId);
    });

    const stateAfterAdvance = useInstanceGameplayStore.getState();
    const bundle2 = selectGameplayBundle(stateAfterAdvance, mockInstanceId);
    expect(bundle2?.question.id).toBe("q-2");
    expect(bundle2?.question.text).toBe("What is 2 + 2?");
    expect(selectCanAdvanceQuestion(stateAfterAdvance, mockInstanceId)).toBe(
      false,
    );

    // Advance past last question -> completes game
    act(() => {
      useInstanceGameplayStore.getState().advanceQuestion(mockInstanceId);
    });

    const stateAfterFinish = useInstanceGameplayStore.getState();
    expect(stateAfterFinish.entries[mockInstanceId]?.closure).not.toBeNull();
    expect(stateAfterFinish.entries[mockInstanceId]?.closure?.status).toBe(
      "closed",
    );
  });

  it("records instant optimistic answers across questions and includes the last question in final score", () => {
    const scoredQuestions = [
      {
        ...mockQuestions[0]!,
        answerOptions: [
          { ...mockQuestions[0]!.answerOptions![0]!, isCorrect: true },
          { ...mockQuestions[0]!.answerOptions![1]!, isCorrect: false },
        ],
      },
      {
        ...mockQuestions[1]!,
        answerOptions: [
          { ...mockQuestions[1]!.answerOptions![0]!, isCorrect: true },
          { ...mockQuestions[1]!.answerOptions![1]!, isCorrect: false },
        ],
      },
    ] as unknown as QuizQuestionAuthorDto[];

    const store = useInstanceGameplayStore.getState();
    store.initializeQuestions(mockInstanceId, scoredQuestions, {
      quizTitle: "Scored Battle",
      durationMs: 60000,
      playerId: "user-1",
    });

    act(() => {
      store.selectQuestionAnswer(mockInstanceId, "q-1", "opt-1");
      store.goToQuestion(mockInstanceId, 1);
      store.selectQuestionAnswer(mockInstanceId, "q-2", "opt-3");
      store.finishBattle(mockInstanceId, "normal");
    });

    const entry = useInstanceGameplayStore.getState().entries[mockInstanceId];
    expect(entry?.closure?.status).toBe("closed");
    expect(entry?.finalLeaderboard?.entries[0]?.score).toBe(200);
    expect(entry?.finalLeaderboard?.entries[0]?.answeredCount).toBe(2);
  });
});

describe("Live Battle auto-finish on timeout and instant option click", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useInstanceGameplayStore.getState().reset(mockInstanceId);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("allows instant option selection and automatically transitions to results when time runs out", () => {
    useInstanceGameplayStore.getState().initializeQuestions(
      mockInstanceId,
      mockQuestions,
      {
        quizTitle: "Timed Battle",
        durationMs: 15000,
        playerId: "user-1",
      },
    );

    vi.spyOn(instancesService, "getInstance").mockResolvedValue({
      instanceId: mockInstanceId,
      status: "running",
      quizId: "quiz-1",
      durationMs: 15000,
      players: [],
    } as unknown as Awaited<ReturnType<typeof instancesService.getInstance>>);
    vi.spyOn(instancesService, "getInstanceLeaderboard").mockResolvedValue({
      items: [],
    } as unknown as Awaited<
      ReturnType<typeof instancesService.getInstanceLeaderboard>
    >);

    render(<InstanceGamePage instanceId={mockInstanceId} />);

    // Click option directly (no "Select" button or 5s wait)
    const parisOption = screen.getByRole("radio", { name: /Paris/i });
    fireEvent.click(parisOption);
    expect(parisOption).toHaveAttribute("aria-checked", "true");

    // Fast-forward past the 15s battle duration -> auto-exits to results screen
    act(() => {
      vi.advanceTimersByTime(16000);
    });

    expect(screen.getByTestId("game-result-summary")).toBeInTheDocument();
    expect(screen.getByText("Battle Complete!")).toBeInTheDocument();
    expect(screen.getByTestId("result-timeout-badge")).toBeInTheDocument();
  });

  it("shows Battle Still in Progress instead of final results when other players have not finished yet", () => {
    const store = useInstanceGameplayStore.getState();
    store.initializeQuestions(mockInstanceId, mockQuestions, {
      quizTitle: "Multiplayer Battle",
      durationMs: 60000,
      playerId: "user-1",
    });
    store.setPlayers(mockInstanceId, [
      { userId: "user-1", displayName: "Player One", status: "playing" },
      { userId: "user-2", displayName: "Player Two", status: "playing" },
    ]);

    vi.spyOn(instancesService, "getInstance").mockResolvedValue({
      instanceId: mockInstanceId,
      status: "running",
      quizId: "quiz-1",
      durationMs: 60000,
      players: [
        {
          instancePlayerId: "ip-1",
          instanceId: mockInstanceId,
          userId: "user-1",
          username: "p1",
          displayName: "Player One",
          status: "finished",
          joinedAt: "2026-01-01T00:00:00Z",
        },
        {
          instancePlayerId: "ip-2",
          instanceId: mockInstanceId,
          userId: "user-2",
          username: "p2",
          displayName: "Player Two",
          status: "playing",
          joinedAt: "2026-01-01T00:00:00Z",
        },
      ],
    } as unknown as Awaited<ReturnType<typeof instancesService.getInstance>>);
    vi.spyOn(instancesService, "getInstanceLeaderboard").mockResolvedValue({
      items: [],
    } as unknown as Awaited<
      ReturnType<typeof instancesService.getInstanceLeaderboard>
    >);

    render(<InstanceGamePage instanceId={mockInstanceId} />);

    // Answer both questions and click Finish Battle
    fireEvent.click(screen.getByRole("radio", { name: /Paris/i }));
    fireEvent.click(screen.getByTestId("advance-question-btn"));
    fireEvent.click(screen.getByRole("radio", { name: /^4$/i }));
    fireEvent.click(screen.getByTestId("finish-battle-btn"));

    // Must NOT render final results while Player Two is still playing
    expect(screen.getByTestId("battle-waiting-for-players")).toBeInTheDocument();
    expect(screen.getByText("Battle Still in Progress")).toBeInTheDocument();
    expect(screen.queryByTestId("game-result-summary")).not.toBeInTheDocument();

    // Once Player Two finishes, automatically transitions to Battle Complete!
    act(() => {
      useInstanceGameplayStore
        .getState()
        .markPlayerFinished(mockInstanceId, "user-2");
    });

    expect(screen.getByTestId("game-result-summary")).toBeInTheDocument();
    expect(screen.getByText("Battle Complete!")).toBeInTheDocument();
  });
});

describe("InstanceGamePage initialization", () => {
  beforeEach(() => {
    useInstanceGameplayStore.getState().reset(mockInstanceId);
    vi.clearAllMocks();
  });

  it("hydrates instance and quiz questions and transitions from loading to live game view", async () => {
    const mockInstanceDetail: InstanceDetailResponseDto = {
      instanceId: mockInstanceId,
      hostUserId: "host-1",
      hostUsername: "host",
      hostDisplayName: "Host",
      maxPlayers: 10,
      status: "running",
      difficulty: "easy",
      durationMs: 60000,
      passingScorePercent: 70,
      rewardXp: 100,
      quizId: "quiz-1",
      quizTitle: "World Trivia",
      quizSlug: "world-trivia",
      createdAt: "2026-01-01T00:00:00Z",
      startedAt: "2026-01-01T00:01:00Z",
      countdownStartedAt: null,
      closedAt: null,
      cancelledAt: null,
      playerCount: 1,
      players: [
        {
          instancePlayerId: "ip-1",
          userId: "user-1",
          username: "tester",
          displayName: "Tester",
          avatarUrl: null,
          joinedAt: "2026-01-01T00:00:00Z",
          status: "joined",
          score: 0,
          rank: null,
          lastActivityAt: "2026-01-01T00:00:00Z",
        },
      ],
    };

    const mockQuizDetail: QuizResponseDto = {
      quizId: "quiz-1",
      title: "World Trivia",
      slug: "world-trivia",
      isFeatured: false,
      isHidden: false,
      isVerified: true,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      creator: {
        userId: "creator-1",
        username: "creator",
        displayName: "Creator",
        avatarUrl: null,
      },
      tags: [],
      publishedVersion: {
        quizVersionId: "qv-1",
        quizId: "quiz-1",
        versionNumber: 1,
        status: "published",
        difficulty: "easy",
        durationMs: 60000,
        passingScorePercent: 70,
        rewardXp: 100,
        questionCount: 2,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        questions: mockQuestions,
      },
    };

    vi.spyOn(instancesService, "getInstance").mockResolvedValue(
      mockInstanceDetail as unknown as Awaited<
        ReturnType<typeof instancesService.getInstance>
      >,
    );

    vi.spyOn(quizzesService, "getQuizByIdOrSlug").mockResolvedValue(
      mockQuizDetail,
    );

    render(<InstanceGamePage instanceId={mockInstanceId} />);

    // Initially loading skeleton or fast transition
    await screen.findByTestId("instance-game-page");

    // Once hydrated, live game view renders
    const pageEl = await screen.findByTestId("instance-game-page");
    expect(pageEl.getAttribute("data-state")).toBe("live");
    expect(
      screen.getByText("What is the capital of France?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Paris")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();
  });

  it("renders GameResultSummary directly on reload when server status is finished", async () => {
    vi.spyOn(instancesService, "getInstance").mockResolvedValue({
      instanceId: mockInstanceId,
      hostUserId: "user-1",
      hostUsername: "tester",
      hostDisplayName: "Tester",
      status: "finished",
      quizId: "quiz-1",
      quizTitle: "World Trivia",
      durationMs: 60000,
      closedAt: "2026-01-01T00:05:00Z",
      players: [
        {
          instancePlayerId: "ip-1",
          userId: "user-1",
          username: "tester",
          displayName: "Tester",
          status: "finished",
          score: 100,
        },
      ],
    } as unknown as Awaited<ReturnType<typeof instancesService.getInstance>>);

    vi.spyOn(instancesService, "getInstanceLeaderboard").mockResolvedValue({
      items: [
        {
          userId: "user-1",
          username: "tester",
          displayName: "Tester",
          scorePercent: 100,
          rank: 1,
          correctCount: 2,
        },
      ],
    } as unknown as Awaited<
      ReturnType<typeof instancesService.getInstanceLeaderboard>
    >);

    render(<InstanceGamePage instanceId={mockInstanceId} />);

    expect(
      await screen.findByTestId("game-result-summary"),
    ).toBeInTheDocument();
    expect(screen.getByText("Battle Complete!")).toBeInTheDocument();
  });

  it("hydrates previously submitted answers on mid-battle reload", async () => {
    vi.spyOn(instancesService, "getInstance").mockResolvedValue({
      instanceId: mockInstanceId,
      hostUserId: "host-1",
      status: "running",
      quizId: "quiz-1",
      quizTitle: "World Trivia",
      durationMs: 60000,
      startedAt: new Date().toISOString(),
      players: [
        {
          instancePlayerId: "ip-1",
          userId: "user-1",
          username: "tester",
          displayName: "Tester",
          status: "playing",
          attemptId: "attempt-123",
        },
      ],
    } as unknown as Awaited<ReturnType<typeof instancesService.getInstance>>);

    vi.spyOn(quizzesService, "getQuizByIdOrSlug").mockResolvedValue({
      quizId: "quiz-1",
      title: "World Trivia",
      publishedVersion: {
        quizVersionId: "qv-1",
        difficulty: "easy",
        durationMs: 60000,
        questions: mockQuestions,
      },
    } as unknown as QuizResponseDto);

    vi.spyOn(attemptsService, "getAttemptAnswers").mockResolvedValue({
      attemptId: "attempt-123",
      answers: [
        {
          questionId: "q-1",
          selectedOptionId: "opt-1",
          submittedAt: "2026-01-01T00:01:00Z",
        },
      ],
    } as unknown as Awaited<
      ReturnType<typeof attemptsService.getAttemptAnswers>
    >);

    render(<InstanceGamePage instanceId={mockInstanceId} />);

    const parisOption = await screen.findByRole("radio", { name: /Paris/i });
    expect(parisOption).toHaveAttribute("aria-checked", "true");
  });

  it("lets the host force-end a battle from the waiting screen", () => {
    const store = useInstanceGameplayStore.getState();
    store.initializeQuestions(mockInstanceId, mockQuestions, {
      quizTitle: "Host Battle",
      durationMs: 60000,
      playerId: "user-1",
    });
    store.setHostUserId(mockInstanceId, "user-1");
    store.setPlayers(mockInstanceId, [
      { userId: "user-1", displayName: "Host", status: "playing" },
      { userId: "user-2", displayName: "Guest", status: "playing" },
    ]);
    store.submitPlayerBattle(mockInstanceId);

    vi.spyOn(instancesService, "getInstance").mockResolvedValue({
      instanceId: mockInstanceId,
      status: "running",
      quizId: "quiz-1",
      durationMs: 60000,
      players: [],
    } as unknown as Awaited<ReturnType<typeof instancesService.getInstance>>);
    vi.spyOn(instancesService, "getInstanceLeaderboard").mockResolvedValue({
      items: [],
    } as unknown as Awaited<
      ReturnType<typeof instancesService.getInstanceLeaderboard>
    >);

    render(<InstanceGamePage instanceId={mockInstanceId} />);

    const endBtn = screen.getByTestId("host-end-battle-btn");
    fireEvent.click(endBtn);
    const confirmBtn = screen.getByTestId("host-confirm-end-battle-btn");
    fireEvent.click(confirmBtn);

    expect(screen.getByTestId("game-result-summary")).toBeInTheDocument();
  });

  it("starts attempt even during countdown transition, scores answers, and unwraps flat array leaderboard", async () => {
    vi.spyOn(instancesService, "getInstance").mockResolvedValue({
      instanceId: mockInstanceId,
      hostUserId: "user-1",
      status: "countdown",
      quizId: "quiz-1",
      quizTitle: "Algorithms Battle",
      durationMs: 60000,
      players: [
        {
          instancePlayerId: "ip-1",
          userId: "user-1",
          username: "tester",
          displayName: "Quiz Admin",
          status: "joined",
        },
        {
          instancePlayerId: "ip-2",
          userId: "user-2",
          username: "learner",
          displayName: "Learner User",
          status: "joined",
        },
      ],
    } as unknown as Awaited<ReturnType<typeof instancesService.getInstance>>);

    vi.spyOn(quizzesService, "getQuizByIdOrSlug").mockResolvedValue({
      quizId: "quiz-1",
      title: "Algorithms Battle",
      publishedVersion: {
        quizVersionId: "qv-1",
        difficulty: "medium",
        durationMs: 60000,
        questions: mockQuestions,
      },
    } as unknown as QuizResponseDto);

    const startSpy = vi
      .spyOn(attemptsService, "startAttempt")
      .mockResolvedValue({
        data: { attemptId: "att-live-1" },
      } as unknown as Awaited<ReturnType<typeof attemptsService.startAttempt>>);

    vi.spyOn(attemptsService, "getAttemptAnswers").mockResolvedValue({
      attemptId: "att-live-1",
      answers: [],
    } as unknown as Awaited<
      ReturnType<typeof attemptsService.getAttemptAnswers>
    >);

    const submitSpy = vi
      .spyOn(attemptsService, "submitAnswer")
      .mockResolvedValue({} as never);

    vi.spyOn(attemptsService, "completeAttempt").mockResolvedValue({
      attemptId: "att-live-1",
      scorePercent: 83.33,
      correctCount: 5,
      xpEarned: 50,
    } as unknown as Awaited<
      ReturnType<typeof attemptsService.completeAttempt>
    >);

    const finishPlayerSpy = vi
      .spyOn(instancesService, "finishInstancePlayer")
      .mockResolvedValue({
        marked: true,
        allFinished: true,
        status: "finished",
      });

    // Real backend returns `data` as a flat array of leaderboard entries
    vi.spyOn(instancesService, "getInstanceLeaderboard").mockResolvedValue([
      {
        userId: "user-1",
        username: "tester",
        displayName: "Quiz Admin",
        scorePercent: 83.33,
        rank: 1,
        correctCount: 5,
      },
      {
        userId: "user-2",
        username: "learner",
        displayName: "Learner User",
        scorePercent: 50,
        rank: 2,
        correctCount: 3,
      },
    ] as unknown as Awaited<
      ReturnType<typeof instancesService.getInstanceLeaderboard>
    >);

    render(<InstanceGamePage instanceId={mockInstanceId} />);

    const parisOption = await screen.findByRole("radio", { name: /Paris/i });
    expect(startSpy).toHaveBeenCalledWith("quiz-1", {
      contextType: "solo",
      contextRefId: mockInstanceId,
    });

    fireEvent.click(parisOption);
    fireEvent.click(screen.getByTestId("advance-question-btn"));
    fireEvent.click(screen.getByRole("radio", { name: /^4$/i }));
    fireEvent.click(screen.getByTestId("finish-battle-btn"));

    expect(
      await screen.findByTestId("game-result-summary"),
    ).toBeInTheDocument();
    expect(submitSpy).toHaveBeenCalled();
    expect(finishPlayerSpy).toHaveBeenCalledWith(mockInstanceId, "att-live-1");
    expect(await screen.findByText(/83 pts/i)).toBeInTheDocument();
  });

  it("blocks non-participants who directly open /play for a running battle", async () => {
    vi.spyOn(instancesService, "getInstance").mockResolvedValue({
      instanceId: mockInstanceId,
      hostUserId: "host-99",
      status: "running",
      quizId: "quiz-1",
      quizTitle: "Locked Battle",
      durationMs: 60000,
      players: [
        {
          instancePlayerId: "ip-1",
          userId: "host-99",
          username: "host",
          displayName: "Host User",
          status: "joined",
        },
      ],
    } as unknown as InstanceDetailResponseDto);

    const quizSpy = vi.spyOn(quizzesService, "getQuizByIdOrSlug");

    render(<InstanceGamePage instanceId={mockInstanceId} />);

    expect(
      await screen.findByText("Match Already in Progress"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("instance-game-page")).toHaveAttribute(
      "data-state",
      "in-progress",
    );
    expect(quizSpy).not.toHaveBeenCalled();
  });

  it("reconciles rounded authoritative final leaderboard when closure arrives with unrounded standings", async () => {
    const store = useInstanceGameplayStore.getState();
    store.applyInstanceClosed({
      event: "instance_closed",
      instanceId: mockInstanceId,
      eventSequence: 10,
      emittedAt: "2026-11-25T13:00:00Z",
      payloadVersion: 1,
      data: {
        instanceId: mockInstanceId,
        status: "finished",
        closedAt: "2026-11-25T13:00:00Z",
        reason: "normal",
        eventSequence: 10,
        finalLeaderboard: {
          instanceId: mockInstanceId,
          closedAt: "2026-11-25T13:00:00Z",
          totalQuestions: 6,
          winnerPlayerId: "user-2",
          entries: [
            {
              playerId: "user-2",
              displayName: "Quiz Admin",
              score: 33.33,
              rank: 1,
              answeredCount: 2,
              lastAwardedAt: null,
              eventSequence: 10,
            },
            {
              playerId: "user-1",
              displayName: "Learner User",
              score: 0,
              rank: 2,
              answeredCount: 0,
              lastAwardedAt: null,
              eventSequence: 10,
            },
          ],
        },
      },
    });

    vi.spyOn(instancesService, "getInstance").mockResolvedValue({
      instanceId: mockInstanceId,
      hostUserId: "user-2",
      status: "finished",
      quizId: "quiz-1",
      quizTitle: "System Design",
      durationMs: 60000,
      players: [],
    } as unknown as InstanceDetailResponseDto);

    vi.spyOn(quizzesService, "getQuizByIdOrSlug").mockResolvedValue({
      quizId: "quiz-1",
      title: "System Design",
      publishedVersion: {
        quizVersionId: "qv-1",
        difficulty: "medium",
        durationMs: 60000,
        questions: mockQuestions,
      },
    } as unknown as QuizResponseDto);

    vi.spyOn(instancesService, "getInstanceLeaderboard").mockResolvedValue([
      {
        userId: "user-2",
        username: "admin",
        displayName: "Quiz Admin",
        scorePercent: 33.33,
        rank: 1,
        correctCount: 2,
        answeredCount: 2,
        timeTakenMs: 39000,
      },
      {
        userId: "user-1",
        username: "tester",
        displayName: "Learner User",
        scorePercent: 0,
        rank: 2,
        correctCount: 0,
        answeredCount: 0,
        timeTakenMs: 15000,
      },
    ] as unknown as Awaited<
      ReturnType<typeof instancesService.getInstanceLeaderboard>
    >);

    render(<InstanceGamePage instanceId={mockInstanceId} />);

    expect(
      await screen.findByText(/2 correct · 2 answered · 39s/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/33\.33/)).toBeNull();
    expect(screen.getByText("33 pts")).toBeInTheDocument();
  });
});
