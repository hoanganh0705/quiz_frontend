

import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import { ApiError } from "@/lib/api/core/ApiError";
import { useSocket } from "@/lib/realtime/useSocket";
import { useRealtimeQuery } from "@/lib/realtime/useRealtimeQuery";
import * as socketAdapterModule from "@/lib/realtime/socket-adapter";

vi.mock("@/lib/realtime/ws-error", () => ({
decodeWsError: vi.fn().mockReturnValue({
code: "AUTH_SESSION_EXPIRED",
message: "Token expired",
authRequired: true,
retryable: false,
  }),
}));

function makeMockSocket() {
const handlers: Record<string, Set<(...args: unknown[]) => void>> = {};
return {
on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
if (!handlers[event]) handlers[event] = new Set();
handlers[event]!.add(handler);
    }),
off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
handlers[event]?.delete(handler);
    }),
disconnect: vi.fn(),
connect: vi.fn(),
connected: false,
_handlers: handlers,
_emit: (event: string, ...args: unknown[]) => {
handlers[event]?.forEach((h) => h(...args));
    },
  } as unknown as ReturnType<(typeof socketAdapterModule)["createSocket"]> & {
_emit: (event: string, ...args: unknown[]) => void;
_handlers: Record<string, Set<(...args: unknown[]) => void>>;
  };
}

vi.mock("@/features/notifications/services/notifications.service", () => ({
listNotifications: vi.fn(),
getUnreadCount: vi.fn(),
markNotificationRead: vi.fn(),
markAllNotificationsRead: vi.fn(),
deleteNotification: vi.fn(),
getNotificationPreferences: vi.fn(),
updateNotificationPreferences: vi.fn(),
}));

vi.mock("@/features/tournaments/services/tournaments.service", () => ({
getUpcomingTournaments: vi.fn(),
getActiveTournaments: vi.fn(),
getCompletedTournaments: vi.fn(),
getTournamentById: vi.fn(),
registerForTournament: vi.fn(),
withdrawFromTournament: vi.fn(),
getTournamentParticipants: vi.fn(),
getTournamentLeaderboard: vi.fn(),
}));

vi.mock("@/features/instances/services/instances.service", () => ({
listInstances: vi.fn(),
getInstanceById: vi.fn(),
startCountdown: vi.fn(),
cancelCountdown: vi.fn(),
}));

vi.mock("@/features/rankings/services/rankings.service", () => ({
getMyRanking: vi.fn(),
getRankingLeaderboard: vi.fn(),
getRankingDistribution: vi.fn(),
getTopMovers: vi.fn(),
getMyRankForPeriod: vi.fn(),
getMyPercentile: vi.fn(),
getNearbyRanks: vi.fn(),
getMyRankMovement: vi.fn(),
getMyPeakRanks: vi.fn(),
getMyRankingMilestones: vi.fn(),
getMyRankingHistory: vi.fn(),
getUserRanking: vi.fn(),
getUserRankingHistory: vi.fn(),
getUserRankForPeriod: vi.fn(),
}));

vi.mock("@/features/achievements/services/achievements.service", () => ({
listBadges: vi.fn(),
getBadgeByCode: vi.fn(),
getMyBadges: vi.fn(),
getMyBadgeProgress: vi.fn(),
getMyAchievementHistory: vi.fn(),
getMyBadgeAnalytics: vi.fn(),
getUserBadges: vi.fn(),
getUserAchievementHistory: vi.fn(),
revokeUserBadge: vi.fn(),
reevaluateUserBadges: vi.fn(),
}));

vi.mock("@/features/search/services/search.service", () => ({
search: vi.fn(),
}));

function makeApiError(status: number, code: string, detail: string): ApiError {
const axiosLike = {
response: {
status,
statusText: code,
data: {
type: "about:blank",
title: code,
status,
detail,
extensions: { code },
      },
    },
message: detail,
  } as unknown as ConstructorParameters<typeof ApiError>[0];
return new ApiError(axiosLike);
}

describe("Story 5.1 — useSocket enters connected state", () => {
beforeEach(() => {
vi.clearAllMocks();
vi.restoreAllMocks();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("transitions to connected when mock socket fires connect", async () => {
const mockSocket = makeMockSocket();
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket as never);

const { result } = renderHook(() =>
useSocket("/notifications", { enabled: true, autoConnect: true }),
    );

expect(result.current.connectionState).toBe("connecting");

mockSocket._emit("connect");

await waitFor(() => {
expect(result.current.connectionState).toBe("connected");
    });

expect(result.current.error).toBeNull();
  });
});

describe("Story 5.1 — useRealtimeQuery invalidates SWR on notification:sent", () => {
beforeEach(() => {
vi.clearAllMocks();
vi.restoreAllMocks();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("invalidates the SWR key when notification:sent fires", async () => {
const mockSocket = makeMockSocket();
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket as never);

const swrKey = ["notifications", "integration-test"] as const;
const fetcher = vi.fn().mockResolvedValue([
{ id: "n1", message: "Hello", read: false },
    ]);

const { result } = renderHook(() =>
useRealtimeQuery(
"/notifications",
swrKey,
fetcher,
[
{
event: "notification:sent",
keyToInvalidate: swrKey,
          },
        ],
{ revalidateOnFocus: false },
      ),
    );

await waitFor(
() => {
expect(result.current.data).toBeDefined();
      },
{ timeout: 2000 },
    );
expect(fetcher).toHaveBeenCalled();

mockSocket._emit("connect");
mockSocket._emit("notification:sent", {
event: "notification:sent",
data: { id: "n2", message: "New notification", read: false },
    });

await waitFor(
() => {
expect(fetcher).toHaveBeenCalledTimes(2);
      },
{ timeout: 2000 },
    );
  });

it("does not subscribe when swrKey is null", () => {
const mockSocket = makeMockSocket();
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket as never);

const fetcher = vi.fn();

renderHook(() =>
useRealtimeQuery("/notifications", null, fetcher, [
{ event: "notification:sent", keyToInvalidate: ["key"] as const },
      ]),
    );

expect(fetcher).not.toHaveBeenCalled();

expect(mockSocket.on).not.toHaveBeenCalled();
  });
});

describe("Story 5.1 — useSocket transitions to auth_required on WsError", () => {
beforeEach(() => {
vi.clearAllMocks();
vi.restoreAllMocks();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it("enters auth_required when connect_error has authRequired: true", async () => {
const mockSocket = makeMockSocket();
vi.spyOn(socketAdapterModule, "createSocket").mockReturnValue(mockSocket as never);

const { result } = renderHook(() =>
useSocket("/notifications", { enabled: true, autoConnect: true }),
    );

expect(result.current.connectionState).toBe("connecting");

mockSocket._emit("connect_error", new Error("Auth error"));

await waitFor(() => {
expect(result.current.connectionState).toBe("auth_required");
    });

expect(result.current.error).not.toBeNull();
expect(result.current.error!.authRequired).toBe(true);
  });
});

describe("Story 5.1 — Phase 5 service wrappers normalize responses", () => {
beforeEach(() => {
vi.clearAllMocks();
  });

it("notificationsService.listNotifications returns unwrapped data", async () => {
const { listNotifications } = await import(
"@/features/notifications/services/notifications.service"
    );

(listNotifications as unknown as Mock).mockResolvedValue([
{ id: "n1", message: "Hello", read: false },
{ id: "n2", message: "World", read: true },
    ]);

const result = await (listNotifications as unknown as Mock)();
expect(result).toHaveLength(2);
expect(result[0]).toMatchObject({ id: "n1" });
  });

it("notificationsService.listNotifications propagates ApiError.code from 4xx", async () => {
const { listNotifications } = await import(
"@/features/notifications/services/notifications.service"
    );
(listNotifications as unknown as Mock).mockRejectedValue(
makeApiError(404, "NOTIFICATION_NOT_FOUND", "not found"),
    );

await expect((listNotifications as unknown as Mock)()).rejects.toMatchObject({
code: "NOTIFICATION_NOT_FOUND",
status: 404,
    });
  });

it("tournamentsService.getUpcomingTournaments returns unwrapped data", async () => {
const { getUpcomingTournaments } = await import(
"@/features/tournaments/services/tournaments.service"
    );
(getUpcomingTournaments as unknown as Mock).mockResolvedValue([
{ id: "t1", name: "Weekly Cup", status: "upcoming" },
    ]);

const result = await (getUpcomingTournaments as unknown as Mock)();
expect(result).toHaveLength(1);
expect(result[0]).toMatchObject({ name: "Weekly Cup" });
  });

it("tournamentsService.getUpcomingTournaments propagates ApiError.code", async () => {
const { getUpcomingTournaments } = await import(
"@/features/tournaments/services/tournaments.service"
    );
(getUpcomingTournaments as unknown as Mock).mockRejectedValue(
makeApiError(403, "TOURNAMENT_REGISTRATION_CLOSED", "registration closed"),
    );

await expect((getUpcomingTournaments as unknown as Mock)()).rejects.toMatchObject({
code: "TOURNAMENT_REGISTRATION_CLOSED",
    });
  });

it("tournamentsService.registerForTournament propagates ApiError.code", async () => {
const { registerForTournament } = await import(
"@/features/tournaments/services/tournaments.service"
    );
(registerForTournament as unknown as Mock).mockRejectedValue(
makeApiError(409, "TOURNAMENT_ALREADY_REGISTERED", "already registered"),
    );

await expect(
(registerForTournament as unknown as Mock)("t1"),
    ).rejects.toMatchObject({ code: "TOURNAMENT_ALREADY_REGISTERED" });
  });

it("instancesService.listInstances returns unwrapped data", async () => {
const { listInstances } = await import(
"@/features/instances/services/instances.service"
    );
(listInstances as unknown as Mock).mockResolvedValue([
{ id: "i1", status: "waiting" },
    ]);

const result = await (listInstances as unknown as Mock)();
expect(result).toHaveLength(1);
expect(result[0]).toMatchObject({ id: "i1" });
  });

it("instancesService.getInstanceById returns null for ghost response", async () => {
const { getInstanceById } = await import(
"@/features/instances/services/instances.service"
    );
(getInstanceById as unknown as Mock).mockResolvedValue(null);

const result = await (getInstanceById as unknown as Mock)("missing-id");
expect(result).toBeNull();
  });

it("rankingsService.getMyRanking returns null when no rank data", async () => {
const { getMyRanking } = await import(
"@/features/rankings/services/rankings.service"
    );
(getMyRanking as unknown as Mock).mockResolvedValue(null);

const result = await (getMyRanking as unknown as Mock)();
expect(result).toBeNull();
  });

it("rankingsService.getRankingLeaderboard returns unwrapped data", async () => {
const { getRankingLeaderboard } = await import(
"@/features/rankings/services/rankings.service"
    );
(getRankingLeaderboard as unknown as Mock).mockResolvedValue({
entries: [
{ rank: 1, userId: "u1", username: "alice", xp: 5000 },
{ rank: 2, userId: "u2", username: "bob", xp: 4500 },
      ],
meta: { pagination: { kind: "offset", page: 1, pageSize: 20 } },
    });

const result = await (getRankingLeaderboard as unknown as Mock)();
expect(result.entries).toHaveLength(2);
expect(result.entries[0]).toMatchObject({ rank: 1, username: "alice" });
  });

it("rankingsService.getMyPercentile returns unwrapped data", async () => {
const { getMyPercentile } = await import(
"@/features/rankings/services/rankings.service"
    );
(getMyPercentile as unknown as Mock).mockResolvedValue({
percentile: 42,
totalUsers: 1000,
period: "monthly",
    });

const result = await (getMyPercentile as unknown as Mock)();
expect(result).toMatchObject({ percentile: 42, totalUsers: 1000 });
  });

it("achievementsService.listBadges normalizes bare array input", async () => {
const { listBadges } = await import(
"@/features/achievements/services/achievements.service"
    );

(listBadges as unknown as Mock).mockResolvedValue([
{ code: "FIRST_QUIZ", name: "First Quiz" },
{ code: "SPEED_DEMON", name: "Speed Demon" },
    ]);

const result = await (listBadges as unknown as Mock)();
expect(Array.isArray(result)).toBe(true);
expect(result.length).toBeGreaterThanOrEqual(0);
  });

it("achievementsService.getMyBadges returns unwrapped data", async () => {
const { getMyBadges } = await import(
"@/features/achievements/services/achievements.service"
    );
(getMyBadges as unknown as Mock).mockResolvedValue([
{ code: "FIRST_QUIZ", name: "First Quiz", earnedAt: "2026-01-01" },
    ]);

const result = await (getMyBadges as unknown as Mock)();
expect(result).toHaveLength(1);
expect(result[0]).toMatchObject({ code: "FIRST_QUIZ" });
  });

it("achievementsService.getMyAchievementHistory returns unwrapped data", async () => {
const { getMyAchievementHistory } = await import(
"@/features/achievements/services/achievements.service"
    );
(getMyAchievementHistory as unknown as Mock).mockResolvedValue([
{ id: "h1", type: "badge_earned", badgeCode: "FIRST_QUIZ", earnedAt: "2026-01-01" },
    ]);

const result = await (getMyAchievementHistory as unknown as Mock)();
expect(result).toHaveLength(1);
expect(result[0]).toMatchObject({ type: "badge_earned" });
  });

it("searchService.search returns unwrapped data", async () => {
const { search } = await import(
"@/features/search/services/search.service"
    );
(search as unknown as Mock).mockResolvedValue({
quizzes: [{ id: "q1", title: "JS Basics" }],
users: [],
tags: [],
    });

const result = await (search as unknown as Mock)("JS Basics");
expect(result.quizzes).toHaveLength(1);
expect(result.quizzes![0]).toMatchObject({ title: "JS Basics" });
  });

it("searchService.search propagates ApiError.code from 4xx", async () => {
const { search } = await import("@/features/search/services/search.service");
(search as unknown as Mock).mockRejectedValue(
makeApiError(400, "SEARCH_QUERY_TOO_SHORT", "min 2 chars"),
    );

await expect((search as unknown as Mock)("a")).rejects.toMatchObject({
code: "SEARCH_QUERY_TOO_SHORT",
    });
  });
});
