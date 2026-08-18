"use client";

import { useCallback, useRef } from "react";

import * as Sentry from "@sentry/nextjs";

import { getFeatureFlagValue } from "@/lib/feature-flags";

import type {
GameplayEventEnvelope,
GameplayEventName,
} from "../types/gameplay.types";

type SequenceMap = Partial<Record<GameplayEventName, number>>;

const MAX_SAFE_SEQ = Number.MAX_SAFE_INTEGER;

function compareSeq(a: number | undefined, b: number | undefined): number {
if (a === undefined && b === undefined) return 0;
if (a === undefined) return -1;
if (b === undefined) return 1;
return a < b ? -1 : a > b ? 1 : 0;
}

export interface UseSocketEventSequenceResult {

shouldAccept: (event: GameplayEventName, sequence: number) => boolean;

markAccepted: (event: GameplayEventName, sequence: number) => void;

lastAcceptedSequence: (event: GameplayEventName) => number;

reset: () => void;

snapshot: () => SequenceMap;
}

export function useSocketEventSequence(
instanceId: string | null,
): UseSocketEventSequenceResult {
const flagValue = getFeatureFlagValue("multiplayer_play_live");
const isPlaceholder = flagValue === "placeholder";

const registry = useRef<Map<string, SequenceMap>>(new Map());

function getMap(id: string): SequenceMap {
if (!registry.current.has(id)) {
registry.current.set(id, {});
    }

return registry.current.get(id)!;
  }

const shouldAccept = useCallback(
(event: GameplayEventName, sequence: number): boolean => {
if (instanceId === null) return false;
if (isPlaceholder) return false;
if (!Number.isFinite(sequence) || sequence < 0) return false;

const map = getMap(instanceId);
const last = map[event];
return compareSeq(sequence, last) > 0;
    },
[instanceId, isPlaceholder],
  );

const markAccepted = useCallback(
(event: GameplayEventName, sequence: number): void => {
if (instanceId === null) return;
if (isPlaceholder) return;
if (!Number.isFinite(sequence) || sequence < 0) return;

const map = getMap(instanceId);
const last = map[event];

if (compareSeq(sequence, last) > 0) {
map[event] = sequence;

Sentry.addBreadcrumb({
category: "phase5:5.8",
message: `sequence:accepted`,
data: {
event,
instanceId,
sequence,
last,
          },
level: "debug",
        });
      }
    },
[instanceId, isPlaceholder],
  );

const lastAcceptedSequence = useCallback(
(event: GameplayEventName): number => {
if (instanceId === null) return 0;
return getMap(instanceId)[event] ?? 0;
    },
[instanceId],
  );

const reset = useCallback((): void => {
if (instanceId === null) return;
registry.current.delete(instanceId);

Sentry.addBreadcrumb({
category: "phase5:5.8",
message: `sequence:reset`,
data: { instanceId },
level: "info",
    });
  }, [instanceId]);

const snapshot = useCallback((): SequenceMap => {
if (instanceId === null) return {};
return { ...getMap(instanceId) };
  }, [instanceId]);

return { shouldAccept, markAccepted, lastAcceptedSequence, reset, snapshot };
}

export function applyWithSequence<T>(
envelope: GameplayEventEnvelope<T>,
{ shouldAccept, markAccepted, onDrop }: {
shouldAccept: (event: GameplayEventName, seq: number) => boolean;
markAccepted: (event: GameplayEventName, seq: number) => void;
onDrop?: (envelope: GameplayEventEnvelope<T>) => void;
  },
): void {
if (shouldAccept(envelope.event, envelope.eventSequence)) {
markAccepted(envelope.event, envelope.eventSequence);
  } else if (onDrop) {
onDrop(envelope);
  }
}
