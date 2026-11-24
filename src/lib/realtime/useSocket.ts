"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getAuthToken } from "@/features/auth/utils/auth-cookies";

import {
  ConnectionStateReducer,
  INITIAL_CONNECTION_CONTEXT,
  MAX_RETRY_COUNT,
  type ConnectionStateContext,
} from "./connection-state";
import { createSocket, getExistingSocket, type Socket } from "./socket-adapter";

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

  const initialContext = useMemo<ConnectionStateContext>(() => {
    if (!enabled || !autoConnect) return INITIAL_CONNECTION_CONTEXT;
    const existing = getExistingSocket(namespace);
    if (existing?.connected) {
      return {
        ...INITIAL_CONNECTION_CONTEXT,
        state: "connected",
        connectedAt: new Date(),
      };
    }
    return INITIAL_CONNECTION_CONTEXT;
  }, [enabled, autoConnect, namespace]);

  const [context, setContext] = useState<ConnectionStateContext>(initialContext);
  const [socket, setSocket] = useState<Socket | null>(() => {
    if (!enabled || !autoConnect) return null;
    return getExistingSocket(namespace);
  });
  const [error, setError] = useState<WsError | null>(null);

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextRef = useRef<ConnectionStateContext>(initialContext);
  const isMountedRef = useRef(true);
  isMountedRef.current = true;

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

    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const io = createSocket(namespace, {
      auth: token ? { token } : {},
      transports: ["websocket", "polling"],
    });

    (io as any).auth = token ? { token } : {};

    safeSetState(() => setSocket(io));

    const onConnect = () => {
      const nextCtx = ConnectionStateReducer(contextRef.current, {
        type: "OPEN",
      });
      contextRef.current = nextCtx;
      safeSetState(() => {
        setContext(nextCtx);
        setError(null);
      });
    };

    const onDisconnect = () => {
      const nextCtx = ConnectionStateReducer(contextRef.current, {
        type: "DISCONNECT",
      });
      contextRef.current = nextCtx;
      safeSetState(() => setContext(nextCtx));
    };

    const onConnectError = (err: any) => {
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
    };

    io.on("connect", onConnect);
    io.on("disconnect", onDisconnect);
    io.on("connect_error", onConnectError);

    if (io.connected) {
      onConnect();
    } else {
      const next = ConnectionStateReducer(contextRef.current, {
        type: "CONNECT",
      });
      contextRef.current = next;
      safeSetState(() => {
        setContext(next);
        setError(null);
      });
      if (autoConnect) {
        io.connect();
      }
    }

    return () => {
      io.off("connect", onConnect);
      io.off("disconnect", onDisconnect);
      io.off("connect_error", onConnectError);
    };
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
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [enabled, autoConnect, connect]);

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
