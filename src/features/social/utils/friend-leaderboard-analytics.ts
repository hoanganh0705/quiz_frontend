

export interface FriendLeaderboardRowTappedEvent {

userId: string;

period: "week" | "month" | "all";
}

export function trackFriendLeaderboardRowTapped(
event: FriendLeaderboardRowTappedEvent,
): void {
if (typeof window === "undefined") {
return;
  }
const g = window as unknown as {
analytics?: {
track?: (name: string, payload: Record<string, unknown>) => void;
    };
  };
if (g.analytics?.track !== undefined) {
g.analytics.track("friend_leaderboard_row_tapped", { ...event });
  }
}