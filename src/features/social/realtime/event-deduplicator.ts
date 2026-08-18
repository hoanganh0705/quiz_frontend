

"use client";

import { createContext, useContext } from "react";

export const EVENT_DEDUP_CAP = 200;

export interface EventDeduplicatorInterface {
has(key: string): boolean;
add(key: string): void;
clear(): void;
size(): number;
}

export class EventDeduplicator implements EventDeduplicatorInterface {
private readonly keys = new Set<string>();

has(key: string): boolean {
return this.keys.has(key);
  }

add(key: string): void {

if (this.keys.has(key)) {
this.keys.delete(key);
    } else if (this.keys.size >= EVENT_DEDUP_CAP) {

const oldest = this.keys.values().next().value;
if (oldest !== undefined) this.keys.delete(oldest);
    }
this.keys.add(key);
  }

clear(): void {
this.keys.clear();
  }

size(): number {
return this.keys.size;
  }
}

export const EventDeduplicatorContext =
createContext<EventDeduplicatorInterface | null>(null);

export function useEventDeduplicator(): EventDeduplicatorInterface {
const dedup = useContext(EventDeduplicatorContext);
if (dedup === null) {
throw new Error(
"useEventDeduplicator must be called inside a <RealtimeSocialShell> provider. " +
"Wrap your tree in <RealtimeSocialShell> from " +
"'@/features/social/realtime/realtime-social-shell' (TKT-6.10.G1).",
    );
  }
return dedup;
}