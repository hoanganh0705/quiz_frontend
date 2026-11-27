import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrivacySettings } from "../PrivacySettings";

import type { UserMeResponseDto } from "@/features/users/types/user-backend";

function makeProfile(privacy?: Record<string, unknown>): UserMeResponseDto {
  return {
    userId: "user-1",
    username: "johndoe",
    email: "john@example.com",
    displayName: "John Doe",
    avatarUrl: null,
    bio: null,
    xpTotal: 0,
    currentStreak: 0,
    longestStreak: 0,
    settings: {
      privacy: {
        isPublic: true,
        showStatistics: true,
        showAchievements: true,
        showActivity: true,
        showRankImprovement: true,
        showTournamentActivity: true,
        ...(privacy ?? {}),
      },
    },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  };
}

const mockState = {
  mutate: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  isSuccess: false,
  isError: false,
  lastError: null,
  lastApiError: null,
  resetError: vi.fn(),
};

vi.mock("@/features/users/hooks/useUpdateMySettings", () => ({
  useUpdateMySettings: vi.fn().mockImplementation(() => mockState),
}));

describe("PrivacySettings", () => {
  beforeEach(() => {
    mockState.isPending = false;
    mockState.isSuccess = false;
    mockState.isError = false;
    mockState.lastError = null;
    mockState.mutate.mockClear();
  });

  it("renders skeletons while profile is null", () => {
    const { container } = render(<PrivacySettings profile={null} />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders the h2 section header", () => {
    render(<PrivacySettings profile={makeProfile()} />);
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /Privacy Settings/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders all six UserPrivacySettingsDto toggles", () => {
    render(<PrivacySettings profile={makeProfile()} />);
    expect(screen.getByLabelText(/Toggle Public Profile/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Toggle Show Statistics/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Toggle Show Achievements/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Toggle Show Recent Activity/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Toggle Show Rank Improvement/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Toggle Show Tournament Activity/i),
    ).toBeInTheDocument();
  });

  it("submits exact UserPrivacySettingsDto keys when toggling a switch", () => {
    render(<PrivacySettings profile={makeProfile()} />);
    fireEvent.click(screen.getByLabelText(/Toggle Public Profile/i));
    expect(mockState.mutate).toHaveBeenCalledWith({
      privacy: {
        isPublic: false,
        showStatistics: true,
        showAchievements: true,
        showActivity: true,
        showRankImprovement: true,
        showTournamentActivity: true,
      },
    });
  });

  it("disables toggles while pending", () => {
    mockState.isPending = true;
    const { rerender } = render(<PrivacySettings profile={makeProfile()} />);
    rerender(<PrivacySettings profile={makeProfile()} />);
    const toggles = screen.getAllByRole("switch");
    for (const toggle of toggles) {
      expect(toggle).toBeDisabled();
    }
  });
});
