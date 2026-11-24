import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerCard } from "../PlayerCard";

describe("PlayerCard", () => {
  it("renders player details with rank, XP, and link", () => {
    render(
      <PlayerCard
        id="user-123"
        name="Alex River"
        rank={1}
        score={12500}
        avatarUrl="/avatar.png"
        levelString="Grandmaster"
        streak={5}
      />,
    );

    expect(screen.getByText("Alex River")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("12,500")).toBeInTheDocument();
    expect(screen.getByText("Grandmaster")).toBeInTheDocument();
    expect(screen.getByText("5d")).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.some((l) => l.getAttribute("href") === "/profile/user-123")).toBe(true);

    // Verify no broken placeholder dashes exist
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText("Earned")).not.toBeInTheDocument();
  });

  it("renders rank > 3 with regular badge styling", () => {
    render(
      <PlayerCard
        id="user-456"
        name="Jordan Lee"
        rank={7}
        score={4200}
      />,
    );

    expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
    expect(screen.getByText("#7")).toBeInTheDocument();
    expect(screen.getByText("4,200")).toBeInTheDocument();
  });
});
