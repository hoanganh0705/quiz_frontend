import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuizCardDifficulty } from "../QuizCard/QuizCardDifficulty";

describe("QuizCardDifficulty", () => {
  it("renders quiz details, reward XP, play count, and working Start Quiz link", () => {
    render(
      <QuizCardDifficulty
        id="q-101"
        slug="astronomy-basics"
        title="Astronomy Basics"
        difficulty="medium"
        category="Science"
        duration={5}
        reward={150}
        currentPlayers={2400}
        creatorName="Prof. Nova"
        imageSrc="/stars.jpg"
      />,
    );

    expect(screen.getByText("Astronomy Basics")).toBeInTheDocument();
    expect(screen.getByText("Science")).toBeInTheDocument();
    expect(screen.getByText("5 min")).toBeInTheDocument();
    expect(screen.getByText("+150 XP")).toBeInTheDocument();
    expect(screen.getByText("2,400 plays")).toBeInTheDocument();
    expect(screen.getByText("Prof. Nova")).toBeInTheDocument();

    const startQuizBtn = screen.getByRole("link", { name: "Start Quiz" });
    expect(startQuizBtn).toHaveAttribute("href", "/quizzes/astronomy-basics");

    // Verify DollarSign is not rendered
    expect(screen.queryByText("$")).not.toBeInTheDocument();
    expect(screen.queryByText("spots available")).not.toBeInTheDocument();
  });
});
