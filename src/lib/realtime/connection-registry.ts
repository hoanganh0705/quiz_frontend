/**
 * Connection registry for Socket.IO namespace connections.
 *
 * Source epic:   Epic 5.1.
 * Source ticket: TKT-5.1.B2.
 *
 * ## Purpose
 *
 * `useSocket(namespace)` must return the same Socket.IO connection instance
 * when called multiple times in the same tab for the same namespace. Without
 * a registry, two components on the same page would each open a new Socket.IO
 * connection — doubling server load, duplicating events, and causing race
 * conditions in the application state.
 *
 * ## Guarantees
 *
 * 1. **Singleton per namespace**: `getOrCreateSocket` returns the same socket
 *    on repeated calls with the same `namespace`.
 * 2. **Listener deduplication**: `registerSocketListener` only adds a handler
 *    once per `id`. Calling it twice with the same `id` is a no-op.
 * 3. **Per-listener cleanup**: `unregisterSocketListener` removes exactly one handler.
 * 4. **No global disconnect**: `unregisterSocketListener` never closes the socket.
 * 5. **SSR guard**: All exports no-op if `typeof window === 'undefined'`.
 *
 * ## Socket-like interface
 *
 * The module uses a `SocketLike` interface rather than importing from
 * `socket.io-client` so it can be mocked cleanly in tests without requiring
 * the package to be installed. The actual socket factory (which calls the real
 * `socket.io-client`) lives in `socket-adapter.ts`.
 */

import { logger } from '@/shared/log';

export interface SocketLike {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  disconnect(): void;
}

const MAX_LISTENERS = 50;

interface ListenerEntry {
  id: string;
  handler: (...args: unknown[]) => void;
}

interface NamespaceState {
  socket: SocketLike;
  listeners: Map<string, ListenerEntry>;
}

const registry = new Map<string, NamespaceState>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getOrCreateSocket(
  namespace: string,
  factory: (namespace: string) => SocketLike,
): SocketLike {
  if (!isBrowser()) return factory(namespace);

  const existing = registry.get(namespace);
  if (existing) return existing.socket;

  const socket = factory(namespace);
  registry.set(namespace, { socket, listeners: new Map() });
  return socket;
}

export function registerSocketListener(
  namespace: string,
  id: string,
  eventName: string,
  handler: (...args: unknown[]) => void,
): boolean {
  if (!isBrowser()) return false;
  const state = registry.get(namespace);
  if (!state) return false;

  const compositeKey = `${id}::${eventName}`;
  if (state.listeners.has(compositeKey)) return false;

  state.listeners.set(compositeKey, { id, handler });
  state.socket.on(eventName, handler);

  if (state.listeners.size > MAX_LISTENERS) {
    logger.warn(
      'realtime.connection-registry',
      `namespace has ${state.listeners.size} listeners (recommended max ${MAX_LISTENERS})`,
      { namespace },
    );
  }
  return true;
}

export function unregisterSocketListener(
  namespace: string,
  id: string,
  eventName: string,
): void {
  if (!isBrowser()) return;
  const state = registry.get(namespace);
  if (!state) return;

  const compositeKey = `${id}::${eventName}`;
  const entry = state.listeners.get(compositeKey);
  if (!entry) return;

  state.socket.off(eventName, entry.handler);
  state.listeners.delete(compositeKey);
}

export function disposeSocket(namespace: string): void {
  if (!isBrowser()) return;
  const state = registry.get(namespace);
  if (!state) return;

  state.socket.disconnect();
  state.listeners.clear();
  registry.delete(namespace);
}

export function getListenerCount(namespace: string): number {
  if (!isBrowser()) return 0;
  return registry.get(namespace)?.listeners.size ?? 0;
}

export function hasSocket(namespace: string): boolean {
  if (!isBrowser()) return false;
  return registry.has(namespace);
}

/** Resets the module-level registry. FOR TEST USE ONLY. */
export function __resetRegistryForTest(): void {
  registry.clear();
}

export class ConnectionRegistry {
  getOrCreate(namespace: string, factory: (ns: string) => SocketLike): SocketLike {
    return getOrCreateSocket(namespace, factory);
  }

  registerListener(
    namespace: string,
    id: string,
    eventName: string,
    handler: (...args: unknown[]) => void,
  ): boolean {
    return registerSocketListener(namespace, id, eventName, handler);
  }

  unregisterListener(namespace: string, id: string, eventName: string): void {
    return unregisterSocketListener(namespace, id, eventName);
  }

  dispose(namespace: string): void {
    return disposeSocket(namespace);
  }

  getListenerCount(namespace: string): number {
    return getListenerCount(namespace);
  }

  has(namespace: string): boolean {
    return hasSocket(namespace);
  }
}
