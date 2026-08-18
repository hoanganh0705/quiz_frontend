

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SocketLike } from "../connection-registry";

import {
ConnectionRegistry,
disposeSocket,
getListenerCount,
getOrCreateSocket,
hasSocket,
registerSocketListener,
unregisterSocketListener,
__resetRegistryForTest,
} from "../connection-registry";

type EmitSocket = SocketLike & { _emit(event: string, ...args: unknown[]): void };

function makeSocket(): EmitSocket {
const handlers = new Map<string, Set<(...args: unknown[]) => void>>();
return {
on(event: string, handler: (...args: unknown[]) => void) {
if (!handlers.has(event)) handlers.set(event, new Set());
handlers.get(event)!.add(handler);
    },
off(event: string, handler: (...args: unknown[]) => void) {
handlers.get(event)?.delete(handler);
    },
disconnect() {
handlers.clear();
    },
_emit(event: string, ...args: unknown[]) {
handlers.get(event)?.forEach((h) => h(...args));
    },
  };
}

let _counter = 0;
function ns(): string {
return `/test-${++_counter}-${Date.now()}`;
}

beforeEach(() => {
vi.clearAllMocks();
__resetRegistryForTest();
});

afterEach(() => {
__resetRegistryForTest();
});

describe("ConnectionRegistry — singleton", () => {
it("(1) returns the same socket on repeated calls for the same namespace", () => {
const n = ns();
const factory = () => makeSocket();
const s1 = getOrCreateSocket(n, factory);
const s2 = getOrCreateSocket(n, factory);
const s3 = getOrCreateSocket(n, factory);
expect(s1).toBe(s2);
expect(s2).toBe(s3);
  });

it("(1) different namespaces get different sockets", () => {
const n1 = ns();
const n2 = ns();
const s1 = getOrCreateSocket(n1, makeSocket);
const s2 = getOrCreateSocket(n2, makeSocket);
expect(s1).not.toBe(s2);
  });

it("(1) subsequent calls do not re-instantiate after a listener is added", () => {
const n = ns();
const factory = () => makeSocket();
const s1 = getOrCreateSocket(n, factory);
registerSocketListener(n, "lid-1", "foo", vi.fn());
const s2 = getOrCreateSocket(n, factory);
expect(s1).toBe(s2);
  });
});

describe("ConnectionRegistry — listener deduplication", () => {
it("(2) registering the same (namespace, id) pair twice is a no-op", () => {
const n = ns();
getOrCreateSocket(n, makeSocket);
const h1 = vi.fn();
const h2 = vi.fn();

const first = registerSocketListener(n, "dup-id", "foo", h1);
const second = registerSocketListener(n, "dup-id", "foo", h2);
expect(first).toBe(true);
expect(second).toBe(false);

const s = getOrCreateSocket(n, makeSocket);
(s as EmitSocket)._emit("foo", "arg");
expect(h1).toHaveBeenCalledTimes(1);
expect(h2).not.toHaveBeenCalled();
  });

it("(2) different ids can register the same event independently", () => {
const n = ns();
getOrCreateSocket(n, makeSocket);
const h1 = vi.fn();
const h2 = vi.fn();

registerSocketListener(n, "id-1", "foo", h1);
registerSocketListener(n, "id-2", "foo", h2);

const s = getOrCreateSocket(n, makeSocket);
(s as EmitSocket)._emit("foo", "arg");
expect(h1).toHaveBeenCalledTimes(1);
expect(h2).toHaveBeenCalledTimes(1);
  });

it("(2) the same id on different events are independent", () => {
const n = ns();
getOrCreateSocket(n, makeSocket);
const hFoo = vi.fn();
const hBar = vi.fn();

registerSocketListener(n, "same-id", "foo", hFoo);
registerSocketListener(n, "same-id", "bar", hBar);

const s = getOrCreateSocket(n, makeSocket);
(s as EmitSocket)._emit("foo");
expect(hFoo).toHaveBeenCalledTimes(1);
expect(hBar).not.toHaveBeenCalled();
(s as EmitSocket)._emit("bar");
expect(hBar).toHaveBeenCalledTimes(1);
  });
});

describe("ConnectionRegistry — per-listener cleanup", () => {
it("(3) unregisterSocketListener removes only the target handler", () => {
const n = ns();
getOrCreateSocket(n, makeSocket);
const h1 = vi.fn();
const h2 = vi.fn();
const h3 = vi.fn();
registerSocketListener(n, "id-1", "foo", h1);
registerSocketListener(n, "id-2", "foo", h2);
registerSocketListener(n, "id-3", "foo", h3);

unregisterSocketListener(n, "id-2", "foo");

const s = getOrCreateSocket(n, makeSocket);
(s as EmitSocket)._emit("foo");
expect(h1).toHaveBeenCalledTimes(1);
expect(h2).not.toHaveBeenCalled();
expect(h3).toHaveBeenCalledTimes(1);
  });

it("(3) unregisterSocketListener on an unknown id is a no-op", () => {
const n = ns();
getOrCreateSocket(n, makeSocket);
const h = vi.fn();
registerSocketListener(n, "id-1", "foo", h);

unregisterSocketListener(n, "unknown-id", "foo");

const s = getOrCreateSocket(n, makeSocket);
(s as EmitSocket)._emit("foo");
expect(h).toHaveBeenCalledTimes(1);
  });

it("(3) unregisterSocketListener does not affect other events", () => {
const n = ns();
getOrCreateSocket(n, makeSocket);
const hFoo = vi.fn();
const hBar = vi.fn();
registerSocketListener(n, "id-1", "foo", hFoo);
registerSocketListener(n, "id-1", "bar", hBar);

unregisterSocketListener(n, "id-1", "foo");

const s = getOrCreateSocket(n, makeSocket);
(s as EmitSocket)._emit("foo");
expect(hFoo).not.toHaveBeenCalled();
(s as EmitSocket)._emit("bar");
expect(hBar).toHaveBeenCalledTimes(1);
  });
});

describe("ConnectionRegistry — disposal", () => {
it("(4) disposeSocket removes the namespace from the registry", () => {
const n = ns();
getOrCreateSocket(n, makeSocket);
expect(hasSocket(n)).toBe(true);

disposeSocket(n);

expect(hasSocket(n)).toBe(false);
  });

it("(4) a fresh getOrCreateSocket after dispose creates a new socket", () => {
const n = ns();
const factory = () => makeSocket();
const s1 = getOrCreateSocket(n, factory);
disposeSocket(n);
const s2 = getOrCreateSocket(n, factory);
expect(s1).not.toBe(s2);
  });

it("(4) disposeSocket is a no-op for unknown namespaces", () => {
expect(() => disposeSocket("/never-registered")).not.toThrow();
  });
});

describe("ConnectionRegistry — class API", () => {
it("(5) ConnectionRegistry mirrors the module functions", () => {
const reg = new ConnectionRegistry();
const n = ns();
const factory = () => makeSocket();

const s1 = reg.getOrCreate(n, factory);
const s2 = reg.getOrCreate(n, factory);
expect(s1).toBe(s2);

const h1 = vi.fn();
const h2 = vi.fn();
expect(reg.registerListener(n, "id-foo", "foo", h1)).toBe(true);
expect(reg.registerListener(n, "id-bar", "bar", h2)).toBe(true);

expect(reg.getListenerCount(n)).toBe(2);

reg.unregisterListener(n, "id-foo", "foo");

const s3 = reg.getOrCreate(n, factory);
(s3 as EmitSocket)._emit("foo");
expect(h1).not.toHaveBeenCalled();
(s3 as EmitSocket)._emit("bar");
expect(h2).toHaveBeenCalledTimes(1);

expect(reg.has(n)).toBe(true);
expect(reg.getListenerCount(n)).toBe(1);

reg.dispose(n);
expect(reg.has(n)).toBe(false);
  });
});
