

import { describe, expect, it, beforeEach } from "vitest";

import {
useInstanceRealtimeStore,
selectInstanceRealtimeEntry,
selectInstanceRealtimePlayers,
selectInstanceRealtimeStatus,
selectInstanceRealtimeLastSequence,
type InstanceRealtimeEntry,
} from "@/features/instances/stores/useInstanceRealtimeStore";
import type {
InstanceLifecycleEvent,
InstancePlayer,
PlayerJoinEvent,
PlayerLeaveEvent,
} from "@/features/instances/types/instance.types";

function makePlayer(overrides: Partial<InstancePlayer> = {}): InstancePlayer {
return {
id: "u-1",
userId: "u-1",
displayName: "Alice",
isCurrentUser: false,
isHost: false,
...overrides,
  } as InstancePlayer;
}

function makePlayerJoinEvent(
overrides: Partial<{ instanceId: string; eventSequence: number; player: InstancePlayer }> = {},
): PlayerJoinEvent {
return {
type: "player_joined",
instanceId: overrides.instanceId ?? "inst-1",
at: "2026-01-01T00:00:00Z",
eventSequence: overrides.eventSequence ?? 1,
player: overrides.player ?? makePlayer({ id: "u-1", userId: "u-1" }),
  };
}

function makePlayerLeftEvent(
overrides: Partial<{ instanceId: string; eventSequence: number; playerId: string }> = {},
): PlayerLeaveEvent {
return {
type: "player_left",
instanceId: overrides.instanceId ?? "inst-1",
playerId: overrides.playerId ?? "u-1",
at: "2026-01-01T00:00:00Z",
eventSequence: overrides.eventSequence ?? 1,
  };
}

function makeLifecycleEvent(
overrides: Partial<{
instanceId: string;
eventSequence: number;
type: InstanceLifecycleEvent["type"];
status: InstanceLifecycleEvent["status"];
at: string;
  }> = {},
): InstanceLifecycleEvent {
return {
type: overrides.type ?? "instance_started",
instanceId: overrides.instanceId ?? "inst-1",
at: overrides.at ?? "2026-01-01T00:00:00Z",
eventSequence: overrides.eventSequence ?? 1,
status: overrides.status,
  } as InstanceLifecycleEvent;
}

describe("instanceRealtime.store", () => {
beforeEach(() => {
useInstanceRealtimeStore.getState().resetAll();
  });

describe("applyPlayerJoined", () => {
it("adds a player to the per-instance entry", () => {
useInstanceRealtimeStore
        .getState()
        .applyPlayerJoined(makePlayerJoinEvent({ player: makePlayer({ id: "u-1" }) }));

const players = selectInstanceRealtimePlayers(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(players?.["u-1"]).toBeDefined();
    });

it("deduplicates by playerId (same eventSequence does not double the entry)", () => {
useInstanceRealtimeStore
        .getState()
        .applyPlayerJoined(makePlayerJoinEvent({ eventSequence: 1, player: makePlayer({ id: "u-1" }) }));
useInstanceRealtimeStore
        .getState()
        .applyPlayerJoined(makePlayerJoinEvent({ eventSequence: 1, player: makePlayer({ id: "u-1" }) }));

const players = selectInstanceRealtimePlayers(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(Object.keys(players ?? {}).filter((k) => k === "u-1").length).toBe(1);
    });

it("collapses duplicate player_joined events for the same player into one entry", () => {
const ev = makePlayerJoinEvent({
eventSequence: 1,
player: makePlayer({ id: "u-1" }),
      });
useInstanceRealtimeStore.getState().applyPlayerJoined(ev);
useInstanceRealtimeStore.getState().applyPlayerJoined(ev);
useInstanceRealtimeStore.getState().applyPlayerJoined(ev);

const players = selectInstanceRealtimePlayers(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
const count = Object.values(players ?? {}).filter((p) => p.id === "u-1").length;
expect(count).toBe(1);
    });

it("drops stale events (eventSequence <= lastEventSequence)", () => {
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({
eventSequence: 5,
player: makePlayer({ id: "u-1" }),
        }),
      );
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({
eventSequence: 3,
player: makePlayer({ id: "u-9" }),
        }),
      );

const players = selectInstanceRealtimePlayers(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(players?.["u-1"]).toBeDefined();
expect(players?.["u-9"]).toBeUndefined();
    });

it("updates lastEventSequence on newer sequences", () => {
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({
eventSequence: 1,
player: makePlayer({ id: "u-1" }),
        }),
      );
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({
eventSequence: 7,
player: makePlayer({ id: "u-2" }),
        }),
      );

expect(
selectInstanceRealtimeLastSequence(
useInstanceRealtimeStore.getState(),
"inst-1",
        ),
      ).toBe(7);
    });

it("isolates entries between two different instances", () => {
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({
instanceId: "inst-1",
eventSequence: 1,
player: makePlayer({ id: "u-1" }),
        }),
      );
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({
instanceId: "inst-2",
eventSequence: 1,
player: makePlayer({ id: "u-1" }),
        }),
      );

expect(
selectInstanceRealtimePlayers(
useInstanceRealtimeStore.getState(),
"inst-1",
        )?.["u-1"],
      ).toBeDefined();
expect(
selectInstanceRealtimePlayers(
useInstanceRealtimeStore.getState(),
"inst-2",
        )?.["u-1"],
      ).toBeDefined();
    });
  });

describe("applyPlayerLeft", () => {
it("removes a player from the entry", () => {
useInstanceRealtimeStore
        .getState()
        .applyPlayerJoined(
makePlayerJoinEvent({
eventSequence: 1,
player: makePlayer({ id: "u-1" }),
          }),
        );
useInstanceRealtimeStore
        .getState()
        .applyPlayerLeft(
makePlayerLeftEvent({ eventSequence: 2, playerId: "u-1" }),
        );

const players = selectInstanceRealtimePlayers(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(players?.["u-1"]).toBeUndefined();
    });

it("drops stale player_left events", () => {
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({ eventSequence: 5, player: makePlayer({ id: "u-1" }) }),
      );
useInstanceRealtimeStore.getState().applyPlayerLeft(
makePlayerLeftEvent({ eventSequence: 2, playerId: "u-1" }),
      );

const players = selectInstanceRealtimePlayers(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(players?.["u-1"]).toBeDefined();
    });

it("creates an empty entry for an unknown instanceId", () => {
useInstanceRealtimeStore
        .getState()
        .applyPlayerLeft(makePlayerLeftEvent({ playerId: "u-99" }));

const entry = selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-1",
      );

expect(entry).not.toBeNull();
expect(entry?.playersByUserId).toEqual({});
    });
  });

describe("applyLifecycleEvent", () => {
it("records instance_started with status hint", () => {
useInstanceRealtimeStore.getState().applyLifecycleEvent(
makeLifecycleEvent({ type: "instance_started", status: "running" }),
      );

const status = selectInstanceRealtimeStatus(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(status).toBe("running");
    });

it("records instance_closed and sets closedAt", () => {
useInstanceRealtimeStore.getState().applyLifecycleEvent(
makeLifecycleEvent({
type: "instance_closed",
status: "closed",
at: "2026-02-01T00:00:00Z",
        }),
      );

const entry = selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(entry?.instanceStatus).toBe("closed");
expect(entry?.closedAt).toBe("2026-02-01T00:00:00Z");
    });

it("records instance_cancelled and sets closedAt", () => {
useInstanceRealtimeStore.getState().applyLifecycleEvent(
makeLifecycleEvent({
type: "instance_cancelled",
status: "cancelled",
at: "2026-02-01T00:00:00Z",
        }),
      );

const entry = selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(entry?.instanceStatus).toBe("cancelled");
expect(entry?.closedAt).toBe("2026-02-01T00:00:00Z");
    });

it("does not change closedAt for countdown_started", () => {
useInstanceRealtimeStore.getState().applyLifecycleEvent(
makeLifecycleEvent({ type: "countdown_started" }),
      );

const entry = selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(entry?.closedAt).toBeNull();
    });

it("drops stale lifecycle events", () => {
useInstanceRealtimeStore.getState().applyLifecycleEvent(
makeLifecycleEvent({ type: "instance_started", status: "running", eventSequence: 5 }),
      );
useInstanceRealtimeStore.getState().applyLifecycleEvent(
makeLifecycleEvent({ type: "instance_closed", status: "closed", eventSequence: 3 }),
      );

const entry = selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(entry?.instanceStatus).toBe("running");
expect(entry?.closedAt).toBeNull();
    });

it("preserves the previous status when the new event omits status", () => {
useInstanceRealtimeStore.getState().applyLifecycleEvent(
makeLifecycleEvent({
type: "instance_started",
status: "running",
eventSequence: 1,
        }),
      );
useInstanceRealtimeStore.getState().applyLifecycleEvent(
makeLifecycleEvent({
type: "countdown_started",
eventSequence: 2,
        }),
      );

const status = selectInstanceRealtimeStatus(
useInstanceRealtimeStore.getState(),
"inst-1",
      );
expect(status).toBe("running");
    });
  });

describe("reset / resetAll", () => {
it("reset(instanceId) clears a single entry", () => {
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({
instanceId: "inst-1",
player: makePlayer({ id: "u-1" }),
        }),
      );
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({
instanceId: "inst-2",
player: makePlayer({ id: "u-2" }),
        }),
      );

useInstanceRealtimeStore.getState().reset("inst-1");

expect(
selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-1",
        ),
      ).toBeNull();
expect(
selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-2",
        ),
      ).not.toBeNull();
    });

it("resetAll clears every entry", () => {
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({
instanceId: "inst-1",
player: makePlayer({ id: "u-1" }),
        }),
      );
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({
instanceId: "inst-2",
player: makePlayer({ id: "u-2" }),
        }),
      );

useInstanceRealtimeStore.getState().resetAll();

expect(
selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-1",
        ),
      ).toBeNull();
expect(
selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-2",
        ),
      ).toBeNull();
    });

it("reset on an unknown instanceId is a no-op (does not throw)", () => {
expect(() =>
useInstanceRealtimeStore.getState().reset("inst-unknown"),
      ).not.toThrow();
    });
  });

describe("selectors", () => {
it("selectInstanceRealtimeEntry returns null for an unknown instance", () => {
expect(
selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-unknown",
        ),
      ).toBeNull();
    });

it("selectInstanceRealtimePlayers returns null for an unknown instance", () => {
expect(
selectInstanceRealtimePlayers(
useInstanceRealtimeStore.getState(),
"inst-unknown",
        ),
      ).toBeNull();
    });

it("selectInstanceRealtimeStatus returns null for an unknown instance", () => {
expect(
selectInstanceRealtimeStatus(
useInstanceRealtimeStore.getState(),
"inst-unknown",
        ),
      ).toBeNull();
    });

it("selectInstanceRealtimeLastSequence returns 0 for an unknown instance", () => {
expect(
selectInstanceRealtimeLastSequence(
useInstanceRealtimeStore.getState(),
"inst-unknown",
        ),
      ).toBe(0);
    });

it("selectors return the expected entry shape", () => {
useInstanceRealtimeStore.getState().applyPlayerJoined(
makePlayerJoinEvent({ player: makePlayer({ id: "u-1" }) }),
      );

const entry = selectInstanceRealtimeEntry(
useInstanceRealtimeStore.getState(),
"inst-1",
      ) as InstanceRealtimeEntry | null;

expect(entry).not.toBeNull();
expect(entry?.playersByUserId).toBeDefined();
expect(entry?.lastEventSequence).toBe(1);
expect(entry?.instanceStatus).toBeNull();
expect(entry?.closedAt).toBeNull();
    });
  });
});
