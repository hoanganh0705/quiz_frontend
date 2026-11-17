import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
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
import * as instancesService from "@/features/instances/services";
import * as quizzesService from "@/features/quizzes/services/quizzes.service";

vi.mock("@/lib/feature-flags", () => ({
  getFeatureFlagValue: vi.fn().mockReturnValue("live"),
}));

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
    expect(selectCanAdvanceQuestion(stateAfterAdvance, mockInstanceId)).toBe(false);

    // Advance past last question -> completes game
    act(() => {
      useInstanceGameplayStore.getState().advanceQuestion(mockInstanceId);
    });

    const stateAfterFinish = useInstanceGameplayStore.getState();
    expect(stateAfterFinish.entries[mockInstanceId]?.closure).not.toBeNull();
    expect(stateAfterFinish.entries[mockInstanceId]?.closure?.status).toBe("closed");
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
      mockInstanceDetail as unknown as Awaited<ReturnType<typeof instancesService.getInstance>>,
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
    expect(screen.getByText("What is the capital of France?")).toBeInTheDocument();
    expect(screen.getByText("Paris")).toBeInTheDocument();
    expect(screen.getByText("London")).toBeInTheDocument();
  });
});
