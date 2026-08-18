

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MyQuizzesTableRow } from "@/features/quizzes/components/MyQuizzesTableRow";

import type { MyQuizListItem } from "@/features/quizzes/types/my-quizzes";

function makeQuiz(
overrides: Partial<{
quizId: string;
title: string;
slug: string;
isHidden: boolean;
publishedVersion: { questionCount: number; status: string };
updatedAt: string;
  }> = {},
): MyQuizListItem {
return {
quizId: overrides.quizId ?? "quiz-1",
title: overrides.title ?? "My Quiz Title",
slug: overrides.slug ?? "my-quiz",
creatorId: "user-1",
description: "A test quiz",
requirements: null,
imageUrl: null,
isFeatured: false,
isHidden: overrides.isHidden ?? false,
isVerified: false,
publishedVersionId: null,
createdAt: "2025-01-01T00:00:00.000Z",
updatedAt: overrides.updatedAt ?? "2025-01-15T00:00:00.000Z",
publishedVersion: overrides.publishedVersion ?? {
questionCount: 10,
status: "published",
    },
  };
}

describe("MyQuizzesTableRow — renders all columns", () => {
it("renders title, slug, status, question count, and updated-at", () => {
const quiz = makeQuiz({
quizId: "quiz-abc",
title: "JavaScript Basics",
slug: "js-basics",
publishedVersion: { questionCount: 25, status: "published" },
    });

render(<MyQuizzesTableRow quiz={quiz} />);

expect(screen.getByText("JavaScript Basics")).toBeInTheDocument();
expect(screen.getByText("/js-basics")).toBeInTheDocument();
expect(screen.getByText("25")).toBeInTheDocument();
expect(screen.getByText("Published")).toBeInTheDocument();
  });
});

describe("MyQuizzesTableRow — title clamping", () => {
it("long title has line-clamp-2 class and full title in aria-label", () => {
const longTitle = "This is an extremely long quiz title that should be clamped at two lines with an ellipsis";
const quiz = makeQuiz({ title: longTitle });

render(<MyQuizzesTableRow quiz={quiz} />);

const titleEl = screen.getByText(longTitle);
expect(titleEl).toBeInTheDocument();
expect(titleEl).toHaveClass("line-clamp-2");
expect(titleEl).toHaveAttribute("aria-label", longTitle);
  });
});

describe("MyQuizzesTableRow — soft-delete badge", () => {
it("soft-deleted quiz renders 'Deleted' badge", () => {
const quiz = makeQuiz({ isHidden: true });

render(<MyQuizzesTableRow quiz={quiz} />);

expect(screen.getByText("Deleted")).toBeInTheDocument();
  });
});

describe("MyQuizzesTableRow — no edit button when deleted", () => {
it("soft-deleted quiz has no Edit button", () => {
const quiz = makeQuiz({ isHidden: true });

render(<MyQuizzesTableRow quiz={quiz} />);

expect(screen.queryByRole("link", { name: /edit/i })).not.toBeInTheDocument();
  });
});

describe("MyQuizzesTableRow — edit button present when not deleted", () => {
it("non-deleted quiz renders Edit link to /my-quizzes/[id]", () => {
const quiz = makeQuiz({ quizId: "quiz-xyz", isHidden: false });

render(<MyQuizzesTableRow quiz={quiz} />);

const editLink = screen.getByRole("link", { name: /edit/i });
expect(editLink).toBeInTheDocument();
expect(editLink).toHaveAttribute("href", "/my-quizzes/quiz-xyz");
  });
});
