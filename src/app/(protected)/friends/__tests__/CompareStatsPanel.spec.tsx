

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const { useUserProfileBundleMock, useUnfriendMock } = vi.hoisted(() => ({
useUserProfileBundleMock: vi.fn(),
useUnfriendMock: vi.fn(),
}));

vi.mock("@/features/users/hooks/use-user-profile-bundle", () => ({
useUserProfileBundle: useUserProfileBundleMock,
}));

vi.mock("@/features/social/hooks", () => ({
useUnfriend: useUnfriendMock,
useFriends: vi.fn(),
useIncomingRequests: vi.fn(),
useOutgoingRequests: vi.fn(),
useSendFriendRequest: vi.fn(),
useRespondFriendRequest: vi.fn(),
useCancelFriendRequest: vi.fn(),
}));

import { CompareStatsPanel } from "@/app/(protected)/friends/_components/CompareStatsPanel";
import { ApiError } from "@/lib/api";
import type { SocialUserSummaryDto } from "@/features/social/types";

const FRIEND: SocialUserSummaryDto = Object.freeze({
id: "friend-1",
userId: "friend-1",
userName: "admin_master",
displayName: "Admin Master",
avatarUrl: null,
isPrivate: false,
createdAt: "2026-01-01T00:00:00.000Z",
});

const MY_ANALYTICS = Object.freeze({
xpTotal: 1200,
quizzesCompleted: 42,
averageScore: 81.5,
totalTimeSpentMinutes: 180,
currentStreak: 3,
longestStreak: 9,
tournamentsPlayed: 2,
tournamentsWon: 1,
});

function loadingReturn() {
return {
summary: null,
analytics: null,
xpHistory: null,
recentActivity: [],
notFound: false,
isLoading: true,
error: null,
retry: vi.fn(),
isRetrying: false,
  };
}

function populatedReturn() {
return {
summary: null,
analytics: {
userId: FRIEND.userId,
summary: {
totalAttempts: 18,
completedQuizzes: 12,
averageScore: 78.5,
      },
lastUpdated: "2026-01-01T00:00:00.000Z",
    },
xpHistory: null,
recentActivity: [],
notFound: false,
isLoading: false,
error: null,
retry: vi.fn(),
isRetrying: false,
  };
}

function privateReturn() {
return {
summary: null,
analytics: null,
xpHistory: null,
recentActivity: [],
notFound: false,
isLoading: false,
error: new ApiError({
status: 403,
code: "SOCIAL_PROFILE_PRIVATE",
message: "Profile is private",
    }),
retry: vi.fn(),
isRetrying: false,
  };
}

function serverErrorReturn() {
return {
summary: null,
analytics: null,
xpHistory: null,
recentActivity: [],
notFound: false,
isLoading: false,
error: new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Server exploded",
    }),
retry: vi.fn(),
isRetrying: false,
  };
}

beforeEach(() => {
useUserProfileBundleMock.mockReset();
useUnfriendMock.mockReset();

useUnfriendMock.mockReturnValue({
unfriend: vi.fn(),
isPending: false,
error: null,
alreadyNotFriends: false,
  });
});

afterEach(() => {
cleanup();
});

function renderPanel() {
return render(
<CompareStatsPanel
friend={FRIEND}
myAnalytics={MY_ANALYTICS}
myAnalyticsLoading={false}
viewerLabel="You"
    />,
  );
}

describe("CompareStatsPanel (live integration)", () => {
it("(1) renders empty themValue while the profile bundle is loading", () => {
useUserProfileBundleMock.mockReturnValue(loadingReturn());

renderPanel();

const quizzesRow = screen
      .getByText("Quizzes Played")
      .closest(".border.border-border");
expect(quizzesRow).not.toBeNull();
expect(quizzesRow?.textContent).toContain("You: 42");

const placeholders = screen.getAllByLabelText(
/Admin Master Quizzes Played not available/,
    );
expect(placeholders.length).toBeGreaterThan(0);
expect(screen.getByText("Loading friend stats…")).toBeInTheDocument();
  });

it("(2) renders the friend's summary numbers and percent formatting", () => {
useUserProfileBundleMock.mockReturnValue(populatedReturn());

renderPanel();

const quizzesRow = screen
      .getByText("Quizzes Played")
      .closest(".border.border-border");
expect(quizzesRow?.textContent).toContain("You: 42");
expect(quizzesRow?.textContent).toContain("Admin Master: 12");

const averageRow = screen
      .getByText("Average Score")
      .closest(".border.border-border");
expect(averageRow?.textContent).toContain("You: 81.5%");
expect(averageRow?.textContent).toContain("Admin Master: 78.5%");

const totalRow = screen
      .getByText("Total Attempts")
      .closest(".border.border-border");
expect(totalRow?.textContent).toContain("You: 42");
expect(totalRow?.textContent).toContain("Admin Master: 18");

expect(screen.queryByText(/connections$/)).toBeNull();
expect(screen.queryByText(/followers$/)).toBeNull();
  });

it("(3) renders 'Private' for every metric when the profile is 403", () => {
useUserProfileBundleMock.mockReturnValue(privateReturn());

renderPanel();

const quizzesRow = screen
      .getByText("Quizzes Played")
      .closest(".border.border-border");
const averageRow = screen
      .getByText("Average Score")
      .closest(".border.border-border");
const totalRow = screen
      .getByText("Total Attempts")
      .closest(".border.border-border");
expect(quizzesRow?.textContent).toContain("Admin Master: Private");
expect(averageRow?.textContent).toContain("Admin Master: Private");
expect(totalRow?.textContent).toContain("Admin Master: Private");

expect(screen.queryByText(/connections$/)).toBeNull();
expect(screen.queryByText(/followers$/)).toBeNull();
  });

it("(4) renders the em-dash fallback and a status line on 500", () => {
useUserProfileBundleMock.mockReturnValue(serverErrorReturn());

renderPanel();

expect(screen.getByText("Quizzes Played")).toBeInTheDocument();

const placeholders = screen.getAllByLabelText(
/Admin Master Quizzes Played not available/,
    );
expect(placeholders.length).toBeGreaterThan(0);

expect(screen.getByText("Friend stats unavailable.")).toBeInTheDocument();
  });

it("dispatches the unfriend mutation on click", () => {
useUserProfileBundleMock.mockReturnValue(populatedReturn());
const unfriend = vi.fn();
useUnfriendMock.mockReturnValue({
unfriend,
isPending: false,
error: null,
alreadyNotFriends: false,
    });

renderPanel();

const button = screen.getByRole("button", { name: "Unfriend Admin Master" });
fireEvent.click(button);

expect(unfriend).toHaveBeenCalledTimes(1);
  });
});
