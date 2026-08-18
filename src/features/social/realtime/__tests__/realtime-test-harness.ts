

import type { Socket } from "@/lib/realtime/socket-adapter";

export interface RealtimeSocialStubSocketRecord {

onCalls: Array<{ event: string; handlerIndex: number }>;

offCalls: Array<{ event: string; handlerIndex: number }>;

emitCalls: Array<{ event: string; payload: unknown }>;

disconnectCalls: number;

connectCalls: number;
}

export interface RealtimeSocialStubSocket extends Socket {

record: RealtimeSocialStubSocketRecord;

_emit: (event: string, ...args: unknown[]) => void;

_reset: () => void;
}

export function createRealtimeSocialStubSocket(): RealtimeSocialStubSocket {
const record: RealtimeSocialStubSocketRecord = {
onCalls: [],
offCalls: [],
emitCalls: [],
disconnectCalls: 0,
connectCalls: 0,
  };

const handlers = new Map<string, Array<(...args: unknown[]) => void>>();
let handlerCounter = 0;

const handlerIndex = new Map<(...args: unknown[]) => void, number>();

interface InternalStub {
on<Ev extends string>(
event: Ev,
handler: (...args: unknown[]) => void,
    ): InternalStub;
off<Ev extends string>(
event: Ev,
handler: (...args: unknown[]) => void,
    ): InternalStub;
emit(event: string, payload?: unknown): InternalStub;
disconnect(): InternalStub;
connect(): InternalStub;
connected: boolean;
record: RealtimeSocialStubSocketRecord;
_emit(event: string, ...args: unknown[]): void;
_reset(): void;
  }

const stub: InternalStub = {
on(event, handler) {
record.onCalls.push({ event, handlerIndex: handlerCounter });
handlerIndex.set(handler, handlerCounter);
handlerCounter += 1;
const list = handlers.get(event);
if (list) {
list.push(handler);
      } else {
handlers.set(event, [handler]);
      }
return stub;
    },
off(event, handler) {
const index = handlerIndex.get(handler);
if (index !== undefined) {
record.offCalls.push({ event, handlerIndex: index });
      }
const list = handlers.get(event);
if (list) {
const idx = list.indexOf(handler);
if (idx >= 0) list.splice(idx, 1);
      }
return stub;
    },
emit(event, payload) {
record.emitCalls.push({ event, payload });
return stub;
    },
disconnect() {
record.disconnectCalls += 1;
return stub;
    },
connect() {
record.connectCalls += 1;
return stub;
    },
connected: false,
record,
_emit(event, ...args) {
const list = handlers.get(event);
if (!list) return;

for (const handler of [...list]) {
handler(...args);
      }
    },
_reset() {
record.onCalls.length = 0;
record.offCalls.length = 0;
record.emitCalls.length = 0;
record.disconnectCalls = 0;
record.connectCalls = 0;
    },
  };

return stub as unknown as RealtimeSocialStubSocket;
}

export interface RealtimeSocialStubDedup {
has(key: string): boolean;
add(key: string): void;
clear(): void;
size(): number;
}

export interface RealtimeSocialStubSequenceGuard {
accept(key: string, sequence: number): "allow" | "drop";
clear(): void;
size(): number;
}

export interface RealtimeSocialStubContext {

dedup: RealtimeSocialStubDedup;

sequenceGuard: RealtimeSocialStubSequenceGuard;

reset(): void;
}

export function createRealtimeSocialStubContext(): RealtimeSocialStubContext {

const dedupSet = new Set<string>();
const DEDUP_CAP = 200;

const sequenceCounters = new Map<string, number>();

const dedup: RealtimeSocialStubDedup = {
has(key: string) {
return dedupSet.has(key);
    },
add(key: string) {
if (dedupSet.size >= DEDUP_CAP) {

const oldest = dedupSet.values().next().value;
if (oldest !== undefined) dedupSet.delete(oldest);
      }
dedupSet.add(key);
    },
clear() {
dedupSet.clear();
    },
size() {
return dedupSet.size;
    },
  };

const sequenceGuard: RealtimeSocialStubSequenceGuard = {
accept(key: string, sequence: number) {
const last = sequenceCounters.get(key) ?? 0;
if (sequence <= last) return "drop";
sequenceCounters.set(key, sequence);
return "allow";
    },
clear() {
sequenceCounters.clear();
    },
size() {
return sequenceCounters.size;
    },
  };

return {
dedup,
sequenceGuard,
reset() {
dedup.clear();
sequenceGuard.clear();
    },
  };
}

export function makeStubTabId(tabId?: string): string {
if (tabId !== undefined) return tabId;

return `stub-${Math.random().toString(36).slice(2, 10)}`;
}
