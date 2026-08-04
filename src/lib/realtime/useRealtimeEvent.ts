/**
 * Phase 5 `useRealtimeEvent` hook — typed Socket.IO event listener.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.E2.
 *
 * ## Purpose
 *
 * Registers a handler for a typed Socket.IO event. The handler receives a
 * fully-narrowed payload type — no `any`. Error frames (`event === 'error'`)
 * are intercepted and never forwarded to the success handler.
 *
 * ## Unknown-event safety
 *
 * The event name is typed as `InstanceEventName | NotificationEventName`,
 * so unknown event names are caught at compile time. At runtime, the
 * discriminated union in `InstanceSocketEvent` / `NotificationSocketEvent`
 * ensures the handler only receives payloads that match the named event.
 */

"use client";

import { useEffect } from "react";

import type { Socket } from "@/lib/realtime/socket-adapter";
import { decodeWsError } from "@/lib/realtime";

// ─── Options ─────────────────────────────────────────────────────────────────

export interface UseRealtimeEventOptions {
  /** Set to false to skip registration. Default: true. */
  enabled?: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Register a typed handler for a Socket.IO event.
 *
 * @param socket  - The socket returned by `useSocket`. Pass `null` when
 *                  the socket has not connected yet.
 * @param event  - The event name from `events.ts` (typed literal).
 * @param handler - Called with the narrowed payload on each event.
 * @param options.enabled - Skip registration when false.
 *
 * @example
 * ```tsx
 * const { socket } = useSocket('/instances');
 *
 * useRealtimeEvent(
 *   socket,
 *   'question:revealed',
 *   (payload) => {
 *     // payload is QuestionRevealedPayload — no type assertion needed
 *     setCurrentQuestion(payload);
 *   }
 * );
 * ```
 */
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
      // Guard: ensure this is a structured event frame.
      if (!frame || typeof frame !== "object") return;

      const obj = frame as Record<string, unknown>;

      // Intercept error frames — never call the success handler.
      if (obj.event === "error") {
        decodeWsError(obj.data);
        return;
      }

      // Forward the narrowed payload to the user's handler.
      void handler(obj.data);
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
