/**
 * `useInstanceRealtimeStore` — per-instance realtime state.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.7 — Instance lobby, authenticated room, and host
 *                lifecycle controls.
 * Source ticket: TKT-5.7.B6.
 *
 * ## Purpose
 *
 * Holds the realtime-derived slice of the per-instance state: the
 * roster mirror (keyed by `userId`), the lifecycle event sequence
 * (used for deduplication), and the last-applied `instanceStatus`.
 * REST reads from `useInstance` / `useInstancePlayers` populate the
 * canonical state; the realtime store only mirrors the *deltas*
 * applied between REST reads.
 *
 * ## Why zustand (not React context)
 *
 * - The project already vendors `zustand@5.0.13`.
 * - The lobby orchestrator (`InstanceRoomPage`), the lobby chrome,
 *   the player roster, and the realtime bridge (this module) are not
 *   in the same component subtree. Zustand avoids prop-drilling.
 * - The store must NOT persist to `localStorage` / `sessionStorage`.
 *   The server is authoritative for every status and roster
 *   transition; persisting a local mirror would risk replaying stale
 *   state on a reconnect after the server has moved on.
 *
 * ## State shape
 *
 * The store is keyed by `instanceId`. Two instances cannot overwrite
 * one another because each action targets a specific entry. Each
 * entry tracks:
 *
 *   - `playersByUserId`: the realtime-derived roster map.
 *   - `lastEventSequence`: the highest `eventSequence` already applied.
 *   - `instanceStatus`: the latest known status (from a lifecycle
 *     event), used as a hint for the UI before the next REST read.
 *   - `closedAt`: the timestamp of the last close/cancel event.
 *
 * ## Server authority
 *
 * Status transitions are server-driven. The store applies the
 * `instanceStatus` hint optimistically and lets the next REST read
 * confirm the transition. The store never persists state across
 * page reloads.
 *
 * ## Design — actions outside the data state
 *
 * Mirrors the cross-story contract from
 * `features/attempts/stores/useAttemptsStore.ts` and
 * `features/quizzes/store/use-quiz-filters-store.ts`: state holds
 * scalar values only; actions are exported as standalone functions
 * so `getState()` returns the data state only and `reset()` can
 * replace the data state without losing the actions.
 */

import { create } from "zustand";

import type {
  InstanceLifecycleEvent,
  InstancePlayer,
  InstanceStatus,
  PlayerJoinEvent,
  PlayerLeaveEvent,
} from "../types/instance.types";

// ─── Entry shape ──────────────────────────────────────────────────────────

export interface InstanceRealtimeEntry {
  /** Map from `userId` to the realtime-mirrored `InstancePlayer`. */
  playersByUserId: Record<string, InstancePlayer>;
  /** Highest `eventSequence` already applied to this entry. */
  lastEventSequence: number;
  /** Latest known status from a lifecycle event. `null` when unknown. */
  instanceStatus: InstanceStatus | null;
  /** ISO 8601 timestamp of the last close/cancel event. `null` when unknown. */
  closedAt: string | null;
}

// ─── State + actions ──────────────────────────────────────────────────────

export interface InstanceRealtimeState {
  entries: Record<string, InstanceRealtimeEntry>;
}

export interface InstanceRealtimeActions {
  /** Apply a player join event. Drops stale events. */
  applyPlayerJoined: (event: PlayerJoinEvent) => void;
  /** Apply a player leave event. Drops stale events. */
  applyPlayerLeft: (event: PlayerLeaveEvent) => void;
  /** Apply a lifecycle event. Drops stale events. */
  applyLifecycleEvent: (event: InstanceLifecycleEvent) => void;
  /** Reset the realtime entry for an instance. */
  reset: (instanceId: string) => void;
  /** Reset all entries (used on logout). */
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

// ─── Selectors ────────────────────────────────────────────────────────────

/**
 * Select the realtime entry for an instance. Returns `null` when the
 * instance has not been touched yet.
 */
export function selectInstanceRealtimeEntry(
  state: InstanceRealtimeStore,
  instanceId: string,
): InstanceRealtimeEntry | null {
  return state.entries[instanceId] ?? null;
}

/**
 * Select the realtime-mirrored roster for an instance. Returns `null`
 * when the instance has not been touched yet.
 */
export function selectInstanceRealtimePlayers(
  state: InstanceRealtimeStore,
  instanceId: string,
): Record<string, InstancePlayer> | null {
  return state.entries[instanceId]?.playersByUserId ?? null;
}

/**
 * Select the latest known status hint for an instance. Returns
 * `null` when the instance has not been touched yet.
 */
export function selectInstanceRealtimeStatus(
  state: InstanceRealtimeStore,
  instanceId: string,
): InstanceStatus | null {
  return state.entries[instanceId]?.instanceStatus ?? null;
}

/**
 * Select the highest `eventSequence` already applied for an instance.
 * Returns `0` when the instance has not been touched yet.
 */
export function selectInstanceRealtimeLastSequence(
  state: InstanceRealtimeStore,
  instanceId: string,
): number {
  return state.entries[instanceId]?.lastEventSequence ?? 0;
}