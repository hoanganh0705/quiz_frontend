"use client";

const DEFAULT_TTL_MS = 15_000;

import { useSyncExternalStore } from "react";

interface FlagEntry {
markedAt: number;
ttlMs: number;
}

const flags = new Map<string, FlagEntry>();

type FlagListener = () => void;
const listeners = new Set<FlagListener>();

function notifyListeners(): void {
for (const listener of listeners) {
listener();
  }
}

export function markRecentlyVerified(
actionId: string,
ttlMs: number = DEFAULT_TTL_MS,
): void {
flags.set(actionId, {
markedAt: Date.now(),
ttlMs,
  });

notifyListeners();
}

export function consumeRecentlyVerified(actionId: string): boolean {
const entry = flags.get(actionId);
if (!entry) {
return false;
  }

const age = Date.now() - entry.markedAt;
if (age >= entry.ttlMs) {

flags.delete(actionId);
notifyListeners();
return false;
  }

flags.delete(actionId);
notifyListeners();
return true;
}

export function isRecentlyVerified(actionId: string): boolean {
const entry = flags.get(actionId);
if (!entry) {
return false;
  }

const age = Date.now() - entry.markedAt;
if (age >= entry.ttlMs) {
flags.delete(actionId);
notifyListeners();
return false;
  }

return true;
}

export function clearVerificationFlags(): void {
flags.clear();
notifyListeners();
}

export function _debugFlags(): Record<string, FlagEntry> {
return Object.fromEntries(flags.entries());
}

export function _resetVerificationFlags(): void {
flags.clear();
notifyListeners();
}

export function useVerificationFlag(actionId: string): boolean {
const subscribe = (listener: FlagListener): (() => void) => {
listeners.add(listener);
return () => {
listeners.delete(listener);
    };
  };

const getSnapshot = (): boolean => isRecentlyVerified(actionId);
const getServerSnapshot = (): boolean => false;

return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
