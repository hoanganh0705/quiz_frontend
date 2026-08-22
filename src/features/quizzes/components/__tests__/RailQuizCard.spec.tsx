import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { RailQuizCard, type RailQuiz } from "@/features/quizzes/components/RailQuizCard";

afterEach(() => cleanup());

function makeRailQuiz(overrides: Partial<RailQuiz> = {}): RailQuiz {
  return {
    quizId: "0192f4d8-0000-7000-8000-000000000001",
    title: "Sample quiz",
    slug: "sample-quiz",
    imageUrl: "https://example.com/image.jpg",
    ...overrides,
  };
}

describe("RailQuizCard — minimal wire projection", () => {
  it("(a) renders the title from the wire shape", () => {
    render(<RailQuizCard quiz={makeRailQuiz({ title: "Capitals of Europe" })} />);
    expect(screen.getByText("Capitals of Europe")).toBeInTheDocument();
  });

  it("(b) links to /quizzes/{slug} when slug is present", () => {
    render(<RailQuizCard quiz={makeRailQuiz({ slug: "capitals-of-europe" })} />);
    const link = screen.getByTestId("rail-quiz-card");
    expect(link.getAttribute("href")).toBe("/quizzes/capitals-of-europe");
  });

  it("(c) falls back to /quizzes/{quizId} when slug is empty", () => {
    render(<RailQuizCard quiz={makeRailQuiz({ slug: "", quizId: "id-42" })} />);
    const link = screen.getByTestId("rail-quiz-card");
    expect(link.getAttribute("href")).toBe("/quizzes/id-42");
  });

  it("(d) renders the optional badge in the meta row", () => {
    render(<RailQuizCard quiz={makeRailQuiz()} badge="Trending" />);
    expect(screen.getByText("Trending")).toBeInTheDocument();
  });

  it("(e) renders the optional metric in the meta row", () => {
    render(<RailQuizCard quiz={makeRailQuiz()} metric="1.2k attempts" />);
    expect(screen.getByText("1.2k attempts")).toBeInTheDocument();
  });

  it("(f) propagates null imageUrl without throwing", () => {
    expect(() =>
      render(<RailQuizCard quiz={makeRailQuiz({ imageUrl: null })} />),
    ).not.toThrow();
  });
});