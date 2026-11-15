import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { InstanceList } from "@/features/instances/components/InstanceList";
import type { InstanceListItemDto } from "@/lib/api/generated/schemas";

describe("InstanceList", () => {
  it("renders skeleton when isLoading is true", () => {
    render(<InstanceList instances={[]} isLoading={true} />);
    expect(screen.getByTestId("instance-list-skeleton")).toBeInTheDocument();
  });

  it("renders empty state when instances list is empty", () => {
    render(<InstanceList instances={[]} isLoading={false} />);
    expect(screen.getByTestId("instance-list-empty")).toBeInTheDocument();
    expect(screen.getByText("No Active Live Battles")).toBeInTheDocument();
  });

  it("renders list of instance cards when data is provided", () => {
    const mockInstances: InstanceListItemDto[] = [
      {
        instanceId: "inst-1",
        quizId: "quiz-1",
        quizTitle: "Quiz Alpha",
        quizSlug: "quiz-alpha",
        hostUserId: "u-1",
        hostUsername: "alice",
        playerCount: 2,
        status: "open",
        difficulty: "easy",
        durationMs: 60000,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        instanceId: "inst-2",
        quizId: "quiz-2",
        quizTitle: "Quiz Beta",
        quizSlug: "quiz-beta",
        hostUserId: "u-2",
        hostUsername: "bob",
        playerCount: 5,
        status: "open",
        difficulty: "hard",
        durationMs: 120000,
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];

    render(<InstanceList instances={mockInstances} isLoading={false} />);
    expect(screen.getByTestId("instance-list")).toBeInTheDocument();
    expect(screen.getByText("Quiz Alpha")).toBeInTheDocument();
    expect(screen.getByText("Quiz Beta")).toBeInTheDocument();
  });
});
