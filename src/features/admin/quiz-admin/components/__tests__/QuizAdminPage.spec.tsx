import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getQueryClient } from "@/providers/QueryProvider";

import * as quizzesService from "@/features/quizzes/services/quizzes.service";

import { QuizAdminPage } from "../QuizAdminPage";

import type { QuizControllerListQuizzes200 } from "@/lib/api/generated/schemas";

const mockPushToast = vi.fn();

vi.mock("@/lib/forms/useToast", () => ({
  DEFAULT_TOAST_DURATION_MS: 3000,
  useToast: () => ({ push: mockPushToast }),
}));

const sampleQuizResponse = {
  data: [
    {
      quizId: "quiz-1",
      title: "Quantum Mechanics 101",
      description: "Foundations of quantum physics",
      slug: "quantum-mechanics-101",
      imageUrl: null,
      categoryName: "Physics",
      isFeatured: true,
      isHidden: false,
      isVerified: true,
      createdAt: "2026-08-09T12:00:00Z",
      updatedAt: "2026-08-09T12:00:00Z",
      creator: {
        userId: "u-1",
        username: "einstein",
        displayName: "Albert",
      },
      tags: [],
    },
  ],
  meta: {
    hasNextPage: false,
    limit: 20,
  },
} as unknown as QuizControllerListQuizzes200;

describe("QuizAdminPage", () => {
  beforeEach(() => {
    getQueryClient().clear();
    mockPushToast.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading skeleton with aria-busy while fetching", () => {
    vi.spyOn(quizzesService, "listQuizzes").mockReturnValue(
      new Promise(() => {}),
    );

    render(<QuizAdminPage />);

    const status = screen.getByRole("status", { name: /Loading quizzes/i });
    expect(status).toHaveAttribute("aria-busy", "true");
  });

  it("renders error alert with retry instead of empty state when fetch fails", async () => {
    const listSpy = vi
      .spyOn(quizzesService, "listQuizzes")
      .mockRejectedValueOnce(new Error("Service unavailable"))
      .mockResolvedValueOnce(sampleQuizResponse);

    render(<QuizAdminPage />);

    expect(await screen.findByTestId("quiz-admin-error")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/Service unavailable/i);
    expect(screen.queryByText(/No quizzes found/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(await screen.findByText("Quantum Mechanics 101")).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledTimes(2);
  });

  it("renders quizzes with h2 titles, semantic badges, and wired Edit/Delete dialogs", async () => {
    vi.spyOn(quizzesService, "listQuizzes").mockResolvedValue(
      sampleQuizResponse,
    );
    const updateSpy = vi
      .spyOn(quizzesService, "updateQuiz")
      .mockResolvedValue({} as never);
    const deleteSpy = vi
      .spyOn(quizzesService, "deleteQuiz")
      .mockResolvedValue({} as never);

    render(<QuizAdminPage />);

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /Quantum Mechanics 101/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Edit Quantum Mechanics 101/i }),
    );
    const saveButton = await screen.findByRole("button", {
      name: /Save Changes/i,
    });
    expect(saveButton).toBeDisabled();

    const titleInput = screen.getByLabelText(/^Title$/i);
    fireEvent.change(titleInput, { target: { value: "Quantum Mechanics 202" } });
    expect(saveButton).not.toBeDisabled();
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith("quiz-1", {
        title: "Quantum Mechanics 202",
        description: "Foundations of quantum physics",
      });
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Delete Quantum Mechanics 101/i }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /^Delete Quiz$/i }),
    );

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("quiz-1");
    });
  });
});
