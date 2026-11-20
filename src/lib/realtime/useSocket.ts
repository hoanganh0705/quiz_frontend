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

const BACKOFF_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000] as const;

export interface UseSocketOptions {
  autoConnect?: boolean;

  enabled?: boolean;
}

export interface UseSocketReturn {
  connectionState: SocketConnectionState;

  context: ConnectionStateContext;

  socket: Socket | null;

  error: WsError | null;

  reconnect: () => void;

  disconnect: () => void;
}

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
  const isMountedRef = useRef(true);

  const safeSetState = useCallback((fn: () => void) => {
    if (!isMountedRef.current || typeof window === "undefined") return;
    try {
      fn();
    } catch {
      // Ignore if unmounted during transition
    }
  }, []);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const connect = useCallback(() => {
    if (!enabled) return;

    const token = getAuthToken();

    const next = ConnectionStateReducer(contextRef.current, {
      type: "CONNECT",
    });
    contextRef.current = next;
    safeSetState(() => {
      setContext(next);
      setError(null);
    });

    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const io = createSocket(namespace, {
      auth: token ? { token } : {},
      transports: ["websocket", "polling"],
    });

    safeSetState(() => setSocket(io));

    io.on("connect", () => {
      const nextCtx = ConnectionStateReducer(contextRef.current, {
        type: "OPEN",
      });
      contextRef.current = nextCtx;
      safeSetState(() => {
        setContext(nextCtx);
        setError(null);
      });
    });

    io.on("disconnect", () => {
      const nextCtx = ConnectionStateReducer(contextRef.current, {
        type: "DISCONNECT",
      });
      contextRef.current = nextCtx;
      safeSetState(() => setContext(nextCtx));
    });

    io.on("connect_error", (err: any) => {
      const wsError = decodeWsError(err);
      const nextCtx = ConnectionStateReducer(contextRef.current, {
        type: "ERROR",
        error: wsError,
      });
      contextRef.current = nextCtx;
      safeSetState(() => {
        setError(wsError);
        setContext(nextCtx);
      });

      if (wsError.authRequired) {
        const authCtx = ConnectionStateReducer(nextCtx, {
          type: "AUTH_REQUIRED",
        });
        contextRef.current = authCtx;
        safeSetState(() => setContext(authCtx));
        return;
      }

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
          safeSetState(() => setContext(retryCtx));
          io.connect();
        }, delay);
      }
    });
  }, [enabled, namespace, safeSetState]);

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

  useEffect(() => {
    if (!enabled || !autoConnect) return;
    connect();
  }, [enabled, autoConnect]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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
