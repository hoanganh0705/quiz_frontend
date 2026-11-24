"use client";

import { useEffect } from "react";

import type { Socket } from "@/lib/realtime/socket-adapter";
import { decodeWsError } from "@/lib/realtime";

export interface UseRealtimeEventOptions {
  enabled?: boolean;
}

export function useRealtimeEvent(
  socket: Socket | null,
  event: string | null,
  handler: (payload: unknown) => void,
  options: UseRealtimeEventOptions = {},
): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled || socket === null) return;

    const wrappedHandler = (frame: unknown) => {
      if (frame !== null && typeof frame === "object") {
        const obj = frame as Record<string, unknown>;

        if (obj.event === "error") {
          decodeWsError(obj.data);
          return;
        }

        if (
          typeof obj.event === "string" &&
          "data" in obj &&
          obj.data !== undefined
        ) {
          void handler(obj.data);
          return;
        }

        void handler(obj);
        return;
      }

      void handler(frame);
    };

    if (event !== null) {
      socket.on(event, wrappedHandler);
    }

    return () => {
      if (event !== null) {
        socket.off(event, wrappedHandler);
      }
    };
  }, [enabled, socket, event, handler]);
}
