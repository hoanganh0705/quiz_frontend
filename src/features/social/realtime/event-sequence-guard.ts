

"use client";

import { createContext, useContext } from "react";

export type SequenceGuardDecision = "allow" | "drop";

export type SequenceKey = `${string}::${string}::${string}`;

export interface EventSequenceGuardInterface {
accept(key: SequenceKey, sequence: number): SequenceGuardDecision;
clear(): void;
size(): number;
}

export class EventSequenceGuard implements EventSequenceGuardInterface {
private readonly counters = new Map<SequenceKey, number>();

accept(key: SequenceKey, sequence: number): SequenceGuardDecision {
const last = this.counters.get(key) ?? 0;
if (sequence <= last) return "drop";
this.counters.set(key, sequence);
return "allow";
  }

clear(): void {
this.counters.clear();
  }

size(): number {
return this.counters.size;
  }
}

export const EventSequenceGuardContext =
createContext<EventSequenceGuardInterface | null>(null);

export function useEventSequenceGuard(): EventSequenceGuardInterface {
const guard = useContext(EventSequenceGuardContext);
if (guard === null) {
throw new Error(
"useEventSequenceGuard must be called inside a <RealtimeSocialShell> provider. " +
"Wrap your tree in <RealtimeSocialShell> from " +
"'@/features/social/realtime/realtime-social-shell' (TKT-6.10.G1).",
    );
  }
return guard;
}