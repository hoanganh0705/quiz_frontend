import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { AttemptRunnerPage } from "@/features/attempts/components/AttemptRunnerPage";
import { useAttemptsStore } from "@/features/attempts/stores/useAttemptsStore";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

const authBootstrapState: {
  state: "authenticated" | "unauthenticated" | "bootstrapping";
} = { state: "authenticated" };
vi.mock("@/features/auth/hooks/use-auth-session", () => ({
  useAuthSession: () => ({
    bootstrapState: authBootstrapState.state,
    isAuthenticated: authBootstrapState.state === "authenticated",
    isBootstrapping: authBootstrapState.state === "bootstrapping",
    currentUser:
      authBootstrapState.state === "authenticated" ? { id: "u" } : null,
  }),
}));

const quizState: {
  loading: boolean;
  notFound: boolean;
  error: null | { code: string };
  quiz: null | {
    quizId: string;
    publishedVersion: null | { quizVersionId: string; questions: never[] };
  };
} = {
  loading: false,
  notFound: false,
  error: null,
  quiz: null,
};
vi.mock("@/features/quizzes/hooks/useQuizByIdOrSlug", () => ({
  useQuizByIdOrSlug: () => ({
    quiz: quizState.quiz,
    notFound: quizState.notFound,
    isLoading: quizState.loading,
    error: quizState.error,
    retry: vi.fn(async () => undefined),
    isRetrying: false,
  }),
}));

const activeState: { loading: boolean; attempt: null | { attemptId: string } } =
  {
    loading: false,
    attempt: null,
  };
vi.mock("@/features/attempts/hooks/useActiveAttempt", () => ({
  useActiveAttempt: () => ({
    attempt: activeState.attempt,
    isLoading: activeState.loading,
    error: null,
    retry: vi.fn(async () => undefined),
  }),
}));

vi.mock("@/features/auth/components/auth-gate", () => ({
  AuthGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/attempts/components/AttemptRunner", () => ({
  AttemptRunner: (props: { idOrSlug: string }) => (
    <div data-testid="attempt-runner-mock" data-idorslug={props.idOrSlug} />
  ),
}));

describe("AttemptRunnerPage — direct entry", () => {
  beforeEach(() => {
    authBootstrapState.state = "authenticated";
    useAttemptsStore.setState({
      attemptsById: {},
      attemptsByQuizVersionId: {},
    });
  });

  it("redirects to the public quiz page when there is no active attempt", async () => {
    activeState.attempt = null;
    activeState.loading = false;
    quizState.quiz = {
      quizId: "q",
      publishedVersion: { quizVersionId: "v", questions: [] },
    };
    render(<AttemptRunnerPage idOrSlug="my-quiz" />);
    expect(
      screen.getByTestId("attempt-runner-page-redirecting"),
    ).toBeInTheDocument();
  });

  it("redirects to results page when the attempt is completed", () => {
    activeState.attempt = null;
    activeState.loading = false;
    quizState.quiz = {
      quizId: "q",
      publishedVersion: { quizVersionId: "v", questions: [] },
    };
    useAttemptsStore.setState({
      attemptsById: {
        "att-123": {
          status: "completed",
          sessionId: "u",
          cooldownUntil: null,
          currentQuestionId: null,
          draftSelection: null,
          submittedAnswers: {},
          error: null,
          completedSnapshot: undefined,
        },
      },
      attemptsByQuizVersionId: {
        v: "att-123",
      },
    });

    render(<AttemptRunnerPage idOrSlug="my-quiz" />);
    expect(
      screen.getByTestId("attempt-runner-page-navigating"),
    ).toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith(
      "/quizzes/my-quiz/results?attemptId=att-123",
    );
  });
});

describe("AttemptRunnerPage — not-found", () => {
  beforeEach(() => {
    authBootstrapState.state = "authenticated";
  });

  it("redirects when the quiz is not found", () => {
    quizState.notFound = true;
    quizState.error = null;
    render(<AttemptRunnerPage idOrSlug="missing" />);
    expect(
      screen.getByTestId("attempt-runner-page-navigating"),
    ).toBeInTheDocument();
  });
});

describe("AttemptRunnerPage — invariant", () => {
  it("does not import completion / review / analytics services", () => {
    const source = AttemptRunnerPage.toString();
    expect(source).not.toMatch(
      /completeAttempt|getAttemptReview|getAttemptAnalytics/,
    );
  });
});
