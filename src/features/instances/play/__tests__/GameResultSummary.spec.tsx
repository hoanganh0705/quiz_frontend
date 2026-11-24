import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameResultSummary } from "../components/shared/GameResultSummary";
import { GameClosedSummary } from "../components/shared/GameClosedSummary";
import type { FinalLeaderboardDto } from "../types/gameplay.types";

describe("GameResultSummary", () => {
  const mockFinalLeaderboard: FinalLeaderboardDto = {
    instanceId: "inst-123",
    closedAt: "2026-11-23T09:18:00Z",
    totalQuestions: 6,
    winnerPlayerId: "user-1",
    entries: [
      {
        playerId: "user-1",
        displayName: "Quiz Admin",
        score: 370,
        rank: 1,
        answeredCount: 6,
        lastAwardedAt: null,
        eventSequence: 1,
      },
      {
        playerId: "user-2",
        displayName: "Power User",
        score: 350,
        rank: 2,
        answeredCount: 6,
        lastAwardedAt: null,
        eventSequence: 2,
      },
      {
        playerId: "user-3",
        displayName: "Learner User",
        score: 100,
        rank: 3,
        answeredCount: 5,
        lastAwardedAt: null,
        eventSequence: 3,
      },
    ],
  };

  it("renders Battle Complete header and does not render closed error", () => {
    render(
      <GameResultSummary
        finalLeaderboard={mockFinalLeaderboard}
        playerProgress={{
          instanceId: "inst-123",
          playerId: "user-1",
          answeredCount: 6,
          totalQuestions: 6,
          currentScore: 370,
          rank: 1,
          isConnected: true,
          eventSequence: 1,
        }}
        currentPlayerId="user-1"
        instanceId="inst-123"
      />,
    );

    expect(screen.getByText("Battle Complete!")).toBeInTheDocument();
    expect(screen.getByText(/Champion! You finished in 1st place!/i)).toBeInTheDocument();
    expect(screen.queryByText(/The host has closed this game/i)).toBeNull();
  });

  it("renders the 3-tier podium with winner crown and display names", () => {
    render(
      <GameResultSummary
        finalLeaderboard={mockFinalLeaderboard}
        playerProgress={null}
        currentPlayerId="user-1"
        instanceId="inst-123"
      />,
    );

    // Winner and runner-up display names appear on podium and standings
    expect(screen.getAllByText(/Quiz Admin/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Power User/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Learner User/i).length).toBeGreaterThanOrEqual(1);

    // Final standings header
    expect(screen.getByText("Final Standings")).toBeInTheDocument();
    expect(screen.getAllByTestId("result-row")).toHaveLength(3);
  });

  it("renders action buttons including Return to Lobby", () => {
    render(
      <GameResultSummary
        finalLeaderboard={mockFinalLeaderboard}
        playerProgress={null}
        currentPlayerId="user-1"
        instanceId="inst-123"
      />,
    );

    const returnBtn = screen.getByTestId("return-to-instance");
    expect(returnBtn).toBeInTheDocument();
    expect(returnBtn.closest("a")).toHaveAttribute("href", "/instances/inst-123");
  });
});

describe("GameClosedSummary", () => {
  it("renders Battle Cancelled variant when cancelled", () => {
    render(
      <GameClosedSummary
        closure={{
          instanceId: "inst-123",
          status: "cancelled",
          closedAt: "2026-11-23T09:18:00Z",
          reason: "host_cancelled",
          finalLeaderboard: null,
          eventSequence: 1,
        }}
        instanceId="inst-123"
      />,
    );

    expect(screen.getByText("Battle Cancelled")).toBeInTheDocument();
    expect(screen.getByText(/This game was cancelled before it could finish/i)).toBeInTheDocument();
  });

  it("renders friendly Battle Complete message when finished normally", () => {
    render(
      <GameClosedSummary
        closure={{
          instanceId: "inst-123",
          status: "closed",
          closedAt: "2026-11-23T09:18:00Z",
          reason: "normal",
          finalLeaderboard: null,
          eventSequence: 1,
        }}
        instanceId="inst-123"
      />,
    );

    expect(screen.getByText("Battle Complete!")).toBeInTheDocument();
  });
});
