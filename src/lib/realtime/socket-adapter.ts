/**
 * Socket.IO adapter — the single import point for socket.io-client.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.B2.
 *
 * This module isolates the `socket.io-client` dependency so it can be mocked
 * in tests without requiring the package to be installed.
 *
 * ## Tests
 *
 * Mock this module with `vi.mock()` to inject test-specific socket factories:
 *
 * ```typescript
 * vi.mock("@/lib/realtime/socket-adapter", () => ({
 *   createSocket: vi.fn(() => ({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() })),
 * }));
 * ```
 */

import { io, type Socket } from "socket.io-client";

// WebSocket server URL - defaults to API URL, can be overridden with NEXT_PUBLIC_WS_URL
// The backend Socket.IO runs on the same port as the REST API
const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "");

export type { Socket };

// Fallback stub when socket.io-client is unavailable (during early development
// before the package is a runtime dependency).
function createNoopSocket(): Socket {
  return {
    on: () => createNoopSocket(),
    off: () => {},
    emit: () => {},
    disconnect: () => {},
    connect: () => createNoopSocket(),
    connected: false,
  } as unknown as Socket;
}

/**
 * Create a Socket.IO instance.
 *
 * When `socket.io-client` is not installed (early Phase 5), returns a no-op stub.
 *
 * @param url     - The full URL to the Socket.IO server (e.g. `http://localhost:8080`)
 *                  or the namespace path (e.g. `/instances`) which will be resolved
 *                  relative to the WebSocket URL.
 * @param options - Socket.IO connection options.
 */
export function createSocket(
  url: string,
  options?: { auth?: Record<string, unknown>; transports?: string[] },
): Socket {
  try {
    // If url starts with "/" or is just a namespace, prepend the WS URL
    const fullUrl = url.startsWith("/")
      ? `${WS_URL}${url}`
      : url;

    return io(fullUrl, options as Parameters<typeof io>[1]);
  } catch {
    return createNoopSocket();
  }
}
