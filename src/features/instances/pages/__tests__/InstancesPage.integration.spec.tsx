import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import * as React from "react";

import { InstancesPage } from "@/features/instances/pages/InstancesPage";

const mockUseInstancesFeatureFlag = vi.fn();
vi.mock("@/features/instances/hooks/useInstancesFeatureFlag", () => ({
  useInstancesFeatureFlag: () => mockUseInstancesFeatureFlag(),
}));

const mockRefresh = vi.fn();
const mockUseListInstances = vi.fn();
vi.mock("@/features/instances/hooks/useListInstances", () => ({
  useListInstances: () => mockUseListInstances(),
}));

describe("InstancesPage integration", () => {
  beforeEach(() => {
    mockUseInstancesFeatureFlag.mockReturnValue({ isPlaceholder: false });
    mockRefresh.mockReset();
    mockUseListInstances.mockReturnValue({
      instances: [
        {
          instanceId: "inst-1",
          quizId: "q-1",
          quizTitle: "Space Exploration",
          quizSlug: "space-exploration",
          hostUserId: "u-1",
          hostUsername: "cosmonaut",
          playerCount: 3,
          status: "open",
          difficulty: "medium",
          durationMs: 300000,
          createdAt: "2026-01-01T00:00:00Z",
        },
        {
          instanceId: "inst-2",
          quizId: "q-2",
          quizTitle: "Ocean Biology",
          quizSlug: "ocean-biology",
          hostUserId: "u-2",
          hostUsername: "diver",
          playerCount: 8,
          status: "running",
          difficulty: "hard",
          durationMs: 400000,
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders placeholder when flag is placeholder", () => {
    mockUseInstancesFeatureFlag.mockReturnValue({ isPlaceholder: true });

    render(<InstancesPage />);
    expect(screen.getByTestId("instance-placeholder")).toBeInTheDocument();
  });

  it("renders page header, filters, and instance items", () => {
    render(<InstancesPage />);

    expect(screen.getByText("Live Battles & Competitions")).toBeInTheDocument();
    expect(screen.getByText("Space Exploration")).toBeInTheDocument();
    expect(screen.getByText("Ocean Biology")).toBeInTheDocument();
    expect(screen.getByText("Showing 2 rooms")).toBeInTheDocument();
  });

  it("filters rooms by status tab", () => {
    render(<InstancesPage />);

    // Click Open Lobbies
    fireEvent.click(screen.getByTestId("filter-open"));
    expect(screen.getByText("Space Exploration")).toBeInTheDocument();
    expect(screen.queryByText("Ocean Biology")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 1 room")).toBeInTheDocument();

    // Click In Progress
    fireEvent.click(screen.getByTestId("filter-running"));
    expect(screen.queryByText("Space Exploration")).not.toBeInTheDocument();
    expect(screen.getByText("Ocean Biology")).toBeInTheDocument();
  });

  it("calls refresh when refresh button is clicked", async () => {
    render(<InstancesPage />);

    const refreshBtn = screen.getByTestId("refresh-instances-button");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
