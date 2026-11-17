import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";

import { InstanceCard } from "@/features/instances/components/InstanceCard";
import type { InstanceListItemDto } from "@/lib/api/generated/schemas";

const baseInstance: InstanceListItemDto = {
  instanceId: "inst-1",
  quizId: "quiz-1",
  quizTitle: "History Challenge",
  quizSlug: "history-challenge",
  hostUserId: "u-1",
  hostUsername: "alice",
  hostDisplayName: "Alice Wonder",
  playerCount: 4,
  maxPlayers: 10,
  status: "open",
  difficulty: "hard",
  durationMs: 180000,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("InstanceCard", () => {
  it("renders open lobby card with join button", () => {
    render(<InstanceCard instance={baseInstance} />);

    expect(screen.getByText("History Challenge")).toBeInTheDocument();
    expect(screen.getByText("Open Lobby")).toBeInTheDocument();
    expect(screen.getByText("Alice Wonder")).toBeInTheDocument();
    expect(screen.getByText("4 / 10 players")).toBeInTheDocument();
    expect(screen.getByText("hard")).toBeInTheDocument();

    const joinBtn = screen.getByTestId("join-instance-button-inst-1");
    expect(joinBtn).toBeInTheDocument();
    expect(joinBtn.getAttribute("href")).toBe("/instances/inst-1");
  });

  it("renders in-progress card when status is running", () => {
    const runningInstance: InstanceListItemDto = {
      ...baseInstance,
      status: "running",
    };

    render(<InstanceCard instance={runningInstance} />);

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    const watchBtn = screen.getByTestId("view-instance-button-inst-1");
    expect(watchBtn).toHaveTextContent("Watch Match");
  });

  it("renders finished card when status is finished", () => {
    const finishedInstance: InstanceListItemDto = {
      ...baseInstance,
      status: "finished",
    };

    render(<InstanceCard instance={finishedInstance} />);

    expect(screen.getByText("Finished")).toBeInTheDocument();
    const resultsBtn = screen.getByTestId("view-instance-button-inst-1");
    expect(resultsBtn).toHaveTextContent("View Results");
  });

  it("renders 'No players' when playerCount is 0", () => {
    const emptyInstance: InstanceListItemDto = {
      ...baseInstance,
      playerCount: 0,
    };

    render(<InstanceCard instance={emptyInstance} />);
    expect(screen.getByText("No players")).toBeInTheDocument();
  });
});
