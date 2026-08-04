/**
 * Typed Socket.IO connection state machine.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.D2.
 *
 * ## Purpose
 *
 * Every Socket.IO connection managed by `ConnectionRegistry` transitions
 * through a set of well-defined states. This module provides:
 *
 *   - The `SocketConnectionState` union (the six valid states).
 *   - The `ConnectionStateContext` (mutable snapshot of the connection).
 *   - The `ConnectionStateReducer` pure function (state transitions without
 *     side effects — usable in React `useReducer` or any other context).
 *
 * ## States
 *
 *   `idle`            — No connection attempted yet.
 *   `connecting`      — `socket.connect()` called; handshake not yet complete.
 *   `connected`       — Handshake complete; socket is fully usable.
 *   `reconnecting`    — Connection lost; automatic reconnect in progress.
 *   `disconnected`    — Reconnect exhausted or manually disconnected.
 *   `auth_required`   — Auth error received; no automatic reconnect.
 *
 * ## Transitions
 *
 * The reducer is a pure function: `(context, event) => context`. It never
 * calls `socket.connect()` or `socket.disconnect()` — callers are
 * responsible for translating state transitions into socket API calls.
 *
 * ## Max retry
 *
 * After `MAX_RETRY_COUNT` failed reconnect attempts, the state transitions
 * to `disconnected` instead of `reconnecting`. The caller should stop
 * retrying and surface an error to the user.
 */

import type { WsError } from "./ws-error";

// ─── State types ────────────────────────────────────────────────────────────────

/** The six valid connection states. */
export type SocketConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "auth_required";

/**
 * Mutable snapshot of a Socket.IO connection's current state.
 *
 * Passed to `ConnectionStateReducer` as the first argument; returned as
 * the new context after applying a transition.
 */
export interface ConnectionStateContext {
  /** The current connection state. */
  state: SocketConnectionState;
  /**
   * Number of reconnect attempts since the last successful `OPEN` event.
   * Resets to `0` when `OPEN` is received.
   */
  retryCount: number;
  /**
   * The last non-retryable error that caused a state change, if any.
   * Cleared when a new `CONNECT` or `OPEN` event is received.
   */
  lastError: WsError | null;
  /** When the last `CONNECT` event was received, if any. */
  startedAt: Date | null;
  /** When the socket last reached `connected`, if any. */
  connectedAt: Date | null;
}

/**
 * Events that drive state transitions.
 *
 * These are modelled as discriminated union members so the reducer can
 * exhaustively match on `event.type`.
 */
export type ConnectionStateEvent =
  | { type: "CONNECT" }
  | { type: "OPEN" }
  | { type: "ERROR"; error: WsError }
  | { type: "RETRY" }
  | { type: "DISCONNECT" }
  | { type: "AUTH_REQUIRED" }
  | { type: "RESET" };

// ─── Constants ─────────────────────────────────────────────────────────────────

/**
 * Maximum number of automatic reconnect attempts before the state transitions
 * to `disconnected` instead of `reconnecting`.
 */
export const MAX_RETRY_COUNT = 5;

// ─── Initial context ───────────────────────────────────────────────────────────

/**
 * The initial `ConnectionStateContext` for a new connection.
 * Corresponds to the `idle` state.
 */
export const INITIAL_CONNECTION_CONTEXT: ConnectionStateContext = {
  state: "idle",
  retryCount: 0,
  lastError: null,
  startedAt: null,
  connectedAt: null,
};

// ─── Reducer ───────────────────────────────────────────────────────────────────

/**
 * Pure state transition function for Socket.IO connection state.
 *
 * @param context - The current connection context.
 * @param event   - The event driving the transition.
 * @returns The new connection context.
 *
 * ## Transition table
 *
 * | Event          | Condition                          | Next state     | Notes                              |
 * |----------------|------------------------------------|----------------|------------------------------------|
 * | CONNECT        | always                             | connecting     | Sets `startedAt`                   |
 * | OPEN           | always                             | connected      | Resets `retryCount`, sets `connectedAt` |
 * | ERROR          | error.authRequired === true         | auth_required | Stores error in `lastError`        |
 * | ERROR          | error.authRequired === false        | reconnecting   | Increments `retryCount`             |
 * | ERROR          | retryCount >= MAX_RETRY_COUNT       | disconnected  | Stops retrying                     |
 * | RETRY          | retryCount < MAX_RETRY_COUNT        | reconnecting   | Increments `retryCount`            |
 * | AUTH_REQUIRED  | always                             | auth_required | Stores empty error in `lastError`   |
 * | DISCONNECT     | always                             | disconnected  | Clears `lastError`                 |
 * | RESET          | always                             | idle          | Resets all fields to initial values |
 *
 * @example
 * ```ts
 * const [context, dispatch] = useReducer(ConnectionStateReducer, INITIAL_CONNECTION_CONTEXT);
 *
 * socket.on('connect',    () => dispatch({ type: 'OPEN' }));
 * socket.on('disconnect', () => dispatch({ type: 'DISCONNECT' }));
 * socket.on('connect_error', (err) => dispatch({ type: 'ERROR', error: decodeWsError(err) }));
 * ```
 */
export function ConnectionStateReducer(
  context: ConnectionStateContext,
  event: ConnectionStateEvent,
): ConnectionStateContext {
  const now = new Date();

  switch (event.type) {
    case "CONNECT":
      return {
        ...INITIAL_CONNECTION_CONTEXT,
        state: "connecting",
        startedAt: now,
        connectedAt: null,
        lastError: null,
        retryCount: 0,
      };

    case "OPEN":
      return {
        ...context,
        state: "connected",
        connectedAt: now,
        retryCount: 0,
        lastError: null,
      };

    case "ERROR": {
      if (event.error.authRequired) {
        return {
          ...context,
          state: "auth_required",
          lastError: event.error,
        };
      }

      const nextRetryCount = context.retryCount + 1;

      if (nextRetryCount >= MAX_RETRY_COUNT) {
        return {
          ...context,
          state: "disconnected",
          retryCount: nextRetryCount,
          lastError: event.error,
        };
      }

      return {
        ...context,
        state: "reconnecting",
        retryCount: nextRetryCount,
        lastError: event.error,
      };
    }

    case "RETRY": {
      if (context.retryCount >= MAX_RETRY_COUNT) {
        return {
          ...context,
          state: "disconnected",
        };
      }
      return {
        ...context,
        state: "reconnecting",
        retryCount: context.retryCount + 1,
      };
    }

    case "AUTH_REQUIRED":
      return {
        ...context,
        state: "auth_required",
        lastError: context.lastError ?? null,
      };

    case "DISCONNECT":
      return {
        ...context,
        state: "disconnected",
        lastError: null,
      };

    case "RESET":
      return { ...INITIAL_CONNECTION_CONTEXT };

    default: {
      // Exhaustiveness check — if TypeScript accepts this, all event types
      // are handled. If a new event type is added to `ConnectionStateEvent`
      // and this line is reached, TypeScript will flag it as a compile error.
      const _exhaustive: never = event;
      return context;
    }
  }
}
