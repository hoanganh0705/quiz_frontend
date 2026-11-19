import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { AttemptRunner } from "@/features/attempts/components/AttemptRunner";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => ({
    bootstrapState: "authenticated",
    currentUser: { id: "user-1" },
  }),
}));

const runnerOutcomes: Record<string, unknown> = {};
const useAttemptRunnerMock = vi.fn(() => ({
  status: "idle",
  activeAttempt: null,
  attemptId: null,
  isActiveLoading: false,
  hasHydrated: true,
  submittedAnswers: {},
  navigation: null,
  error: null,
  isSubmitting: () => false,
  currentIndex: 0,
  totalQuestions: 2,
  currentQuestion: null,
  draftSelection: null,
  updateDraft: vi.fn(),
  submitCurrent: vi.fn(async () => undefined),
  withdrawCurrent: vi.fn(async () => undefined),
  goTo: vi.fn(),
  previous: vi.fn(),
  next: vi.fn(),
  start: vi.fn(async () => undefined),
  abandon: vi.fn(async () => undefined),
  consumeNavigation: vi.fn(),
  ...runnerOutcomes,
}));
vi.mock("@/features/attempts/hooks/useAttemptRunner", () => ({
  useAttemptRunner: () => useAttemptRunnerMock(),
}));

vi.mock("@/lib/forms/useToast", () => ({
  useToast: () => ({ push: vi.fn(), dismiss: vi.fn() }),
}));

vi.mock("@/features/quizzes/hooks/useQuizByIdOrSlug", () => ({
  useQuizByIdOrSlug: () => ({
    quiz: null,
    notFound: false,
    isLoading: false,
    error: null,
    retry: vi.fn(async () => undefined),
    isRetrying: false,
  }),
}));
vi.mock("@/features/attempts/hooks/useActiveAttempt", () => ({
  useActiveAttempt: () => ({
    attempt: null,
    isLoading: false,
    error: null,
    retry: vi.fn(async () => undefined),
  }),
}));

const baseProps = {
  quizId: "quiz-1",
  quizVersionId: "version-1",
  idOrSlug: "my-quiz",
  questions: [] as readonly never[],
};

describe("AttemptRunner — terminal branches", () => {
  it("renders the abandoned terminal state", () => {
    Object.assign(runnerOutcomes, { status: "abandoned", activeAttempt: null });
    render(<AttemptRunner {...baseProps} />);
    expect(screen.getByTestId("attempt-runner-abandoned")).toBeInTheDocument();
  });

  it("renders the completed placeholder for the Story 4.15 handoff", () => {
    Object.assign(runnerOutcomes, { status: "completed", activeAttempt: null });
    render(<AttemptRunner {...baseProps} />);
    expect(screen.getByTestId("attempt-runner-completed")).toBeInTheDocument();
  });
});

describe("AttemptRunner — invariant", () => {
  it("does not import completion / review / analytics services", () => {
    const source = AttemptRunner.toString();
    expect(source).not.toMatch(
      /completeAttempt|getAttemptReview|getAttemptAnalytics/,
    );
  });
});

describe("AttemptRunner — question navigator & single question view", () => {
  const dummyQuestions = [
    {
      questionId: "q-1",
      questionText: "Question 1 Title",
      orderIndex: 0,
      imageUrl: null,
      answerOptions: [
        { optionId: "opt-1a", text: "Option 1A", value: "1a" },
        { optionId: "opt-1b", text: "Option 1B", value: "1b" },
      ],
    },
    {
      questionId: "q-2",
      questionText: "Question 2 Title",
      orderIndex: 1,
      imageUrl: null,
      answerOptions: [
        { optionId: "opt-2a", text: "Option 2A", value: "2a" },
        { optionId: "opt-2b", text: "Option 2B", value: "2b" },
      ],
    },
  ];

  it("renders only the active question, not the full list of all questions", () => {
    Object.assign(runnerOutcomes, {
      status: "in_progress",
      activeAttempt: { attemptId: "att-1" },
      totalQuestions: 2,
      questions: dummyQuestions,
      drafts: {},
      submittedAnswers: {},
    });

    render(
      <AttemptRunner {...baseProps} questions={dummyQuestions as never} />,
    );

    // Active question 1 is displayed
    expect(screen.getByText("Question 1 Title")).toBeInTheDocument();
    // Question 2 is NOT in the document (single question view)
    expect(screen.queryByText("Question 2 Title")).not.toBeInTheDocument();

    // Question navigator pills are present
    expect(screen.getByLabelText("Question 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Question 2")).toBeInTheDocument();
  });

  it("navigates to the next question when Next button is clicked", async () => {
    const { fireEvent } = await import("@testing-library/react");
    Object.assign(runnerOutcomes, {
      status: "in_progress",
      activeAttempt: { attemptId: "att-1" },
      totalQuestions: 2,
      questions: dummyQuestions,
      drafts: {},
      submittedAnswers: {},
    });

    render(
      <AttemptRunner {...baseProps} questions={dummyQuestions as never} />,
    );

    expect(screen.getByText("Question 1 Title")).toBeInTheDocument();

    const nextBtn = screen.getByTestId("attempt-runner-next");
    fireEvent.click(nextBtn);

    expect(screen.getByText("Question 2 Title")).toBeInTheDocument();
    expect(screen.queryByText("Question 1 Title")).not.toBeInTheDocument();
  });

  it("navigates to question 2 when pill 2 is clicked in the navigator", async () => {
    const { fireEvent } = await import("@testing-library/react");
    Object.assign(runnerOutcomes, {
      status: "in_progress",
      activeAttempt: { attemptId: "att-1" },
      totalQuestions: 2,
      questions: dummyQuestions,
      drafts: {},
      submittedAnswers: {},
    });

    render(
      <AttemptRunner {...baseProps} questions={dummyQuestions as never} />,
    );

    const pill2 = screen.getByLabelText("Question 2");
    fireEvent.click(pill2);

    expect(screen.getByText("Question 2 Title")).toBeInTheDocument();
    expect(screen.queryByText("Question 1 Title")).not.toBeInTheDocument();
  });

  it("enables the submit button when all questions are answered in drafts", () => {
    Object.assign(runnerOutcomes, {
      status: "in_progress",
      activeAttempt: { attemptId: "att-1" },
      totalQuestions: 2,
      questions: dummyQuestions,
      drafts: {
        "q-1": {
          kind: "multiple_choice",
          questionId: "q-1",
          selectedOptionIds: ["opt-1a"],
        },
        "q-2": {
          kind: "multiple_choice",
          questionId: "q-2",
          selectedOptionIds: ["opt-2a"],
        },
      },
      submittedAnswers: {},
    });

    render(
      <AttemptRunner {...baseProps} questions={dummyQuestions as never} />,
    );

    const submitBtn = screen.getByTestId("attempt-runner-submit-quiz");
    expect(submitBtn).not.toBeDisabled();
    expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
  });
});
