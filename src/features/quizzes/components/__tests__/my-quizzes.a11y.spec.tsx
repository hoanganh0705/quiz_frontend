

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";

import { MyQuizzesTableRow } from "@/features/quizzes/components/MyQuizzesTableRow";
import { MyQuizzesAnalyticsTab } from "@/features/quizzes/components/MyQuizzesAnalyticsTab";
import { MyQuizzesTableEmpty } from "@/features/quizzes/components/MyQuizzesTableEmpty";

afterEach(() => {
cleanup();
});

async function runAxe(container: HTMLElement): Promise<axe.AxeResults> {
return await new Promise((resolve, reject) => {
axe.run(
container,
{

resultTypes: ["violations"],
      },
(err, results) => {
if (err) reject(err);
        else resolve(results);
      },
    );
  });
}

describe("MyQuizzesTableRow — a11y (live row)", () => {
it("no critical or serious axe violations on a live row", async () => {
const quiz = {
quizId: "quiz-1",
title: "Accessible Quiz",
slug: "accessible-quiz",
creatorId: "user-1",
description: null,
requirements: null,
imageUrl: null,
isFeatured: false,
isHidden: false,
isVerified: false,
publishedVersionId: "v1",
createdAt: "2025-01-01T00:00:00.000Z",
updatedAt: "2025-01-15T00:00:00.000Z",
publishedVersion: { questionCount: 10, status: "published" },
    };

const { container } = render(
<MyQuizzesTableRow quiz={quiz as never} />,
    );
const results = await runAxe(container);

const violations = results.violations.filter(
(v) => v.impact === "critical" || v.impact === "serious",
    );
expect(violations).toHaveLength(0);
  });
});

describe("MyQuizzesTableRow — a11y (deleted row)", () => {
it("no critical or serious axe violations on a deleted row", async () => {
const quiz = {
quizId: "quiz-deleted",
title: "Deleted Quiz",
slug: "deleted-quiz",
creatorId: "user-1",
description: null,
requirements: null,
imageUrl: null,
isFeatured: false,
isHidden: true,
isVerified: false,
publishedVersionId: null,
createdAt: "2025-01-01T00:00:00.000Z",
updatedAt: "2025-01-15T00:00:00.000Z",
publishedVersion: null,
    };

const { container } = render(
<MyQuizzesTableRow quiz={quiz as never} />,
    );
const results = await runAxe(container);

expect(container.textContent).toContain("Deleted");
const violations = results.violations.filter(
(v) => v.impact === "critical" || v.impact === "serious",
    );
expect(violations).toHaveLength(0);
  });
});

describe("MyQuizzesAnalyticsTab — a11y", () => {
it("no critical or serious axe violations on analytics cards", async () => {
const { container } = render(
<MyQuizzesAnalyticsTab
analytics={
{
totalAttempts: 150,
totalReviews: 20,
averageRating: 4.2,
userId: "user-1",
totalQuizzes: 5,
draftQuizzes: 2,
publishedQuizzes: 3,
uniquePlayers: 80,
averageScore: 72,
totalBookmarks: 30,
lastUpdated: "2025-01-15T00:00:00.000Z",
          } as never
        }
isLoading={false}
      />,
    );
const results = await runAxe(container);

const violations = results.violations.filter(
(v) => v.impact === "critical" || v.impact === "serious",
    );
expect(violations).toHaveLength(0);
  });
});

describe("MyQuizzesTableEmpty — a11y", () => {
it("no critical or serious axe violations on the 'all' empty state", async () => {
const { container } = render(<MyQuizzesTableEmpty tab="all" />);
const results = await runAxe(container);

const violations = results.violations.filter(
(v) => v.impact === "critical" || v.impact === "serious",
    );
expect(violations).toHaveLength(0);
  });
});
