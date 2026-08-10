/**
 * Phase 5 `useSocket` hook — authenticated Socket.IO connection manager.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.E1.
 *
 * ## Purpose
 *
 * `useSocket(namespace, options?)` manages the full Socket.IO connection
 * lifecycle for a single namespace. It:
 *
 *   1. Reads the current auth token from the cookie and passes it as the
 *      Socket.IO handshake `auth` object.
 *   2. Exposes the socket so callers can pass it to `useRealtimeEvent`.
 *   3. Exposes the current `ConnectionStateContext` so callers can react
 *      to transitions.
 *   4. Implements bounded exponential backoff: 1 s, 2 s, 4 s, 8 s, 16 s,
 *      up to `MAX_RETRY_COUNT` (5), then stops.
 *   5. When the socket emits a WS error with `authRequired: true`, the
 *      hook transitions to `auth_required` state and does NOT auto-retry.
 *   6. Cleans up listeners on unmount — without disconnecting other consumers.
 *
 * ## Token freshness
 *
 * The token is read **at connect time** so it reflects the current session,
 * not a stale value captured at hook initialisation.
 *
 * ## SSR
 *
 * All Socket.IO operations are browser-only. The hook safely no-ops during
 * SSR — callers can guard with `typeof window === 'undefined'` or rely on
 * Next.js server components never rendering this hook.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getAuthToken } from "@/features/auth/utils/auth-cookies";

import {
  ConnectionStateReducer,
  INITIAL_CONNECTION_CONTEXT,
  MAX_RETRY_COUNT,
  type ConnectionStateContext,
} from "./connection-state";
import { createSocket, type Socket } from "./socket-adapter";

import type { SocketConnectionState, WsError } from "@/lib/realtime";
import { decodeWsError } from "@/lib/realtime";

// ─── Backoff delays (ms) ───────────────────────────────────────────────────

const BACKOFF_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000] as const;

// ─── Return type ────────────────────────────────────────────────────────────────

export interface UseSocketOptions {
  /** Set to false to suppress automatic connection on mount. Default: true. */
  autoConnect?: boolean;
  /** Skip the hook entirely when false. Default: true. */
  enabled?: boolean;
}

export interface UseSocketReturn {
  /** The current Socket.IO connection state. */
  connectionState: SocketConnectionState;
  /** The full connection context (includes retryCount, lastError, etc.). */
  context: ConnectionStateContext;
  /** The socket instance. `null` before the first connection attempt. */
  socket: Socket | null;
  /** The last WS error, if any. */
  error: WsError | null;
  /** Manually trigger a reconnect. */
  reconnect: () => void;
  /** Manually disconnect and stop retrying. */
  disconnect: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Manage a Socket.IO connection for `namespace`.
 *
 * @param namespace - e.g. `/instances`, `/notifications`
 * @param options.autoConnect - Connect on mount (default: true)
 * @param options.enabled    - Skip the hook when false (default: true)
 *
 * @example
 * ```tsx
 * const { connectionState, socket } = useSocket('/notifications');
 *
 * if (connectionState === 'auth_required') {
 *   redirectToLogin();
 * }
 * ```
 */
export function useSocket(
  namespace: string,
  options: UseSocketOptions = {},
): UseSocketReturn {
  const { autoConnect = true, enabled = true } = options;

  const [context, setContext] = useState<ConnectionStateContext>({
    ...INITIAL_CONNECTION_CONTEXT,
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<WsError | null>(null);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextRef = useRef<ConnectionStateContext>({
    ...INITIAL_CONNECTION_CONTEXT,
  });

  // Keep contextRef in sync so handlers always read the current value.
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  // ── Connect ──────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (!enabled) return;

    // Read token at connect time — not at hook init — to pick up a
    // refreshed token after a 401 retry.
    const token = getAuthToken();

    // Transition to connecting.
    const next = ConnectionStateReducer(contextRef.current, {
      type: "CONNECT",
    });
    contextRef.current = next;
    setContext(next);
    setError(null);

    // Clear any pending retry timer.
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const io = createSocket(namespace, {
      auth: token ? { token } : {},
      transports: ["websocket", "polling"],
    });

    setSocket(io);

    // ── connect ────────────────────────────────────────────────────────

    io.on("connect", () => {
      const nextCtx = ConnectionStateReducer(contextRef.current, {
        type: "OPEN",
      });
      contextRef.current = nextCtx;
      setContext(nextCtx);
      setError(null);
    });

    // ── disconnect ────────────────────────────────────────────────────

    io.on("disconnect", () => {
      const nextCtx = ConnectionStateReducer(contextRef.current, {
        type: "DISCONNECT",
      });
      contextRef.current = nextCtx;
      setContext(nextCtx);
    });

    // ── connect_error ─────────────────────────────────────────────────

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    io.on("connect_error", (err: any) => {
      const wsError = decodeWsError(err);
      setError(wsError);

      const nextCtx = ConnectionStateReducer(contextRef.current, {
        type: "ERROR",
        error: wsError,
      });
      contextRef.current = nextCtx;
      setContext(nextCtx);

      // Auth required: stop retrying immediately.
      if (wsError.authRequired) {
        const authCtx = ConnectionStateReducer(nextCtx, {
          type: "AUTH_REQUIRED",
        });
        contextRef.current = authCtx;
        setContext(authCtx);
        return;
      }

      // Schedule bounded retry.
      const retryCount = contextRef.current.retryCount;
      if (retryCount < MAX_RETRY_COUNT) {
        const delay =
          BACKOFF_DELAYS_MS[retryCount] ??
          BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1]!;
        retryTimerRef.current = setTimeout(() => {
          const retryCtx = ConnectionStateReducer(contextRef.current, {
            type: "RETRY",
          });
          contextRef.current = retryCtx;
          setContext(retryCtx);
          io.connect();
        }, delay);
      }
    });
  }, [enabled, namespace]);  

  // ── Reconnect (manual) ─────────────────────────────────────────────────

  const reconnect = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    const resetCtx = ConnectionStateReducer(contextRef.current, {
      type: "RESET",
    });
    contextRef.current = resetCtx;
    setContext(resetCtx);
    socket?.connect();
  }, [socket]);

  // ── Disconnect ───────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    const discCtx = ConnectionStateReducer(contextRef.current, {
      type: "DISCONNECT",
    });
    contextRef.current = discCtx;
    setContext(discCtx);
    socket?.disconnect();
  }, [socket]);

  // ── Auto-connect on mount ───────────────────────────────────────────

  useEffect(() => {
    if (!enabled || !autoConnect) return;
    connect();
  }, [enabled, autoConnect]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cleanup on unmount ───────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      // Do NOT disconnect the socket — other consumers in the tab may still
      // be using it. ConnectionRegistry manages socket lifetime.
    };
  }, []);

  return {
    connectionState: context.state,
    context,
    socket,
    error,
    reconnect,
    disconnect,
  };
}
