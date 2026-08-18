

import { create } from "zustand";

import type {
InstanceLifecycleEvent,
InstancePlayer,
InstanceStatus,
PlayerJoinEvent,
PlayerLeaveEvent,
} from "../types/instance.types";

export interface InstanceRealtimeEntry {

playersByUserId: Record<string, InstancePlayer>;

lastEventSequence: number;

instanceStatus: InstanceStatus | null;

closedAt: string | null;
}

export interface InstanceRealtimeState {
entries: Record<string, InstanceRealtimeEntry>;
}

export interface InstanceRealtimeActions {

applyPlayerJoined: (event: PlayerJoinEvent) => void;

applyPlayerLeft: (event: PlayerLeaveEvent) => void;

applyLifecycleEvent: (event: InstanceLifecycleEvent) => void;

reset: (instanceId: string) => void;

resetAll: () => void;
}

export type InstanceRealtimeStore =
InstanceRealtimeState & InstanceRealtimeActions;

const INITIAL_STATE: InstanceRealtimeState = {
entries: {},
};

function ensureEntry(
state: InstanceRealtimeState,
instanceId: string,
): InstanceRealtimeEntry {
const existing = state.entries[instanceId];
if (existing !== undefined) return existing;
return {
playersByUserId: {},
lastEventSequence: 0,
instanceStatus: null,
closedAt: null,
  };
}

function isStale(
entry: InstanceRealtimeEntry,
eventSequence: number,
): boolean {
return typeof eventSequence !== "number" || eventSequence <= entry.lastEventSequence;
}

export const useInstanceRealtimeStore = create<InstanceRealtimeStore>(
(set) => ({
...INITIAL_STATE,

applyPlayerJoined: (event) => {
set((state) => {
const entry = ensureEntry(state, event.instanceId);
if (isStale(entry, event.eventSequence)) return state;

const nextPlayersByUserId = {
...entry.playersByUserId,
[event.player.id]: event.player,
        };

return {
entries: {
...state.entries,
[event.instanceId]: {
...entry,
playersByUserId: nextPlayersByUserId,
lastEventSequence: event.eventSequence,
            },
          },
        };
      });
    },

applyPlayerLeft: (event) => {
set((state) => {
const entry = ensureEntry(state, event.instanceId);
if (isStale(entry, event.eventSequence)) return state;

const nextPlayersByUserId = { ...entry.playersByUserId };
delete nextPlayersByUserId[event.playerId];

return {
entries: {
...state.entries,
[event.instanceId]: {
...entry,
playersByUserId: nextPlayersByUserId,
lastEventSequence: event.eventSequence,
            },
          },
        };
      });
    },

applyLifecycleEvent: (event) => {
set((state) => {
const entry = ensureEntry(state, event.instanceId);
if (isStale(entry, event.eventSequence)) return state;

const isTerminal =
event.type === "instance_closed" || event.type === "instance_cancelled";

return {
entries: {
...state.entries,
[event.instanceId]: {
...entry,
lastEventSequence: event.eventSequence,
instanceStatus:
event.status ?? entry.instanceStatus ?? null,
closedAt: isTerminal ? event.at : entry.closedAt,
            },
          },
        };
      });
    },

reset: (instanceId) => {
set((state) => {
if (state.entries[instanceId] === undefined) return state;
const nextEntries = { ...state.entries };
delete nextEntries[instanceId];
return { entries: nextEntries };
      });
    },

resetAll: () => {
set(() => ({ entries: {} }));
    },
  }),
);

export function selectInstanceRealtimeEntry(
state: InstanceRealtimeStore,
instanceId: string,
): InstanceRealtimeEntry | null {
return state.entries[instanceId] ?? null;
}

export function selectInstanceRealtimePlayers(
state: InstanceRealtimeStore,
instanceId: string,
): Record<string, InstancePlayer> | null {
return state.entries[instanceId]?.playersByUserId ?? null;
}

export function selectInstanceRealtimeStatus(
state: InstanceRealtimeStore,
instanceId: string,
): InstanceStatus | null {
return state.entries[instanceId]?.instanceStatus ?? null;
}

export function selectInstanceRealtimeLastSequence(
state: InstanceRealtimeStore,
instanceId: string,
): number {
return state.entries[instanceId]?.lastEventSequence ?? 0;
}