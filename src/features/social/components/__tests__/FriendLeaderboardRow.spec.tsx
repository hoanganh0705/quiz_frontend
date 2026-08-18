

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FriendLeaderboardRow } from "@/features/social/components/FriendLeaderboardRow";
import type { FriendLeaderboardEntryDto } from "@/features/social/types";

const trackMock = vi.fn();
vi.mock(
"@/features/social/utils/friend-leaderboard-analytics",
async () => {
const actual = await vi.importActual<
typeof import("@/features/social/utils/friend-leaderboard-analytics")
    >("@/features/social/utils/friend-leaderboard-analytics");
return {
...actual,
trackFriendLeaderboardRowTapped: (event: unknown) => trackMock(event),
    };
  },
);

function makeEntry(
overrides: Partial<FriendLeaderboardEntryDto> = {},
): FriendLeaderboardEntryDto {
return {
rank: 1,
userId: "11111111-1111-1111-1111-111111111111",
username: "alice",
displayName: "Alice A.",
avatarUrl: null,
xp: 1234,
friendSince: "2026-01-01T00:00:00.000Z",
...overrides,
  };
}

beforeEach(() => {
trackMock.mockReset();
});

describe("FriendLeaderboardRow — navigation", () => {
it("renders a Link whose href is /users/{userId}", () => {
const entry = makeEntry({
userId: "22222222-2222-2222-2222-222222222222",
    });
render(<FriendLeaderboardRow entry={entry} period="week" />);
const link = screen.getByTestId("friend-leaderboard-row");
expect(link.tagName.toLowerCase()).toBe("a");
expect(link.getAttribute("href")).toBe(
"/users/22222222-2222-2222-2222-222222222222",
    );
  });

it("never serialises internal ids into the href or query string", () => {
const entry = makeEntry();

expect((entry as unknown as { followId?: unknown }).followId).toBeUndefined();
expect(
(entry as unknown as { friendshipId?: unknown }).friendshipId,
    ).toBeUndefined();
render(<FriendLeaderboardRow entry={entry} period="week" />);
const link = screen.getByTestId("friend-leaderboard-row");
const href = link.getAttribute("href") ?? "";
expect(href).not.toMatch(/followId|friendshipId/);
  });
});

describe("FriendLeaderboardRow — analytics emission", () => {
it("fires the analytics wrapper with userId + period on click", () => {
const entry = makeEntry({ userId: "user-1" });
render(<FriendLeaderboardRow entry={entry} period="month" />);
fireEvent.click(screen.getByTestId("friend-leaderboard-row"));
expect(trackMock).toHaveBeenCalledWith({
userId: "user-1",
period: "month",
    });
  });

it("does not leak internal ids into the analytics payload", () => {
const entry = makeEntry();
render(<FriendLeaderboardRow entry={entry} period="all" />);
fireEvent.click(screen.getByTestId("friend-leaderboard-row"));
const payload = trackMock.mock.calls[0]?.[0] as Record<string, unknown>;
expect(payload).not.toHaveProperty("followId");
expect(payload).not.toHaveProperty("friendshipId");
  });

it("calls the optional onNavigate callback with the userId", () => {
const onNavigate = vi.fn();
const entry = makeEntry({ userId: "user-9" });
render(
<FriendLeaderboardRow
entry={entry}
period="week"
onNavigate={onNavigate}
      />,
    );
fireEvent.click(screen.getByTestId("friend-leaderboard-row"));
expect(onNavigate).toHaveBeenCalledWith("user-9");
  });
});

describe("FriendLeaderboardRow — render", () => {
it("renders the rank badge with the canonical rank value", () => {
const entry = makeEntry({ rank: 42 });
render(<FriendLeaderboardRow entry={entry} period="week" />);
const rank = screen.getByTestId("friend-leaderboard-row-rank");
expect(rank.textContent).toBe("42");
  });

it("renders the XP badge with the canonical XP value", () => {
const entry = makeEntry({ xp: 9999 });
render(<FriendLeaderboardRow entry={entry} period="week" />);
const xp = screen.getByTestId("friend-leaderboard-row-xp");
expect(xp.textContent).toMatch(/9999/);
expect(xp.textContent).toMatch(/XP/);
  });

it("renders the username and display name when present", () => {
const entry = makeEntry({ username: "alice", displayName: "Alice A." });
render(<FriendLeaderboardRow entry={entry} period="week" />);
expect(screen.getByText("alice")).toBeInTheDocument();
expect(screen.getByText("Alice A.")).toBeInTheDocument();
  });

it("omits the display name row when displayName is null", () => {
const entry = makeEntry({ username: "bob", displayName: null });
render(<FriendLeaderboardRow entry={entry} period="week" />);
expect(screen.getByText("bob")).toBeInTheDocument();

const secondary = document.querySelectorAll(
"span.text-sm.text-muted-foreground",
    );
expect(secondary.length).toBe(0);
  });

it("exposes the period as a data attribute for analytics consumers", () => {
const entry = makeEntry();
render(<FriendLeaderboardRow entry={entry} period="all" />);
const link = screen.getByTestId("friend-leaderboard-row");
expect(link.getAttribute("data-period")).toBe("all");
  });
});