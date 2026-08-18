

"use client";

import { useCallback, useMemo } from "react";

import { useRealtimeEvent } from "@/lib/realtime/useRealtimeEvent";
import type { Socket } from "@/lib/realtime/socket-adapter";

import { useEventDeduplicator } from "./event-deduplicator";
import { useEventSequenceGuard } from "./event-sequence-guard";
import {
validateSocialPayload,
type ValidationResult,
} from "./validate-social-payload";

import {
addSocialRealtimeBreadcrumb,
} from "@/lib/social/social-realtime-sentry";

import type { SocialEventKind } from "./social-event-payloads";

export interface UseSocialRealtimeEventOptions {

enabled?: boolean;
}

export type SocialRealtimeDispatch<TPayload> = (payload: TPayload) => void;

function makeDedupKey(
eventType: string,
actorUserId: string,
targetUserId: string,
correlationId: string,
): string {
return `${eventType}::${actorUserId}::${targetUserId}::${correlationId}`;
}

function makeSequenceKey(
eventType: string,
actorUserId: string,
targetUserId: string,
): `${string}::${string}::${string}` {
return `${eventType}::${actorUserId}::${targetUserId}` as const;
}

export function useSocialRealtimeEvent<TPayload>(
socket: Socket | null,
eventName: SocialEventKind | string,
dispatch: SocialRealtimeDispatch<TPayload>,
options: UseSocialRealtimeEventOptions = {},
): void {
const { enabled = true } = options;

const dedup = useEventDeduplicator();
const sequenceGuard = useEventSequenceGuard();

const stableDispatch = useCallback(dispatch, [dispatch]);

const handler = useCallback(
(frame: unknown) => {

const payload = unwrapPayload(frame);

const validated: ValidationResult = validateSocialPayload(
eventName as SocialEventKind,
payload,
      );

if (!validated.ok) {
emitDropBreadcrumb(eventName, {
reason: validated.reason,
        });
return;
      }

const typedPayload = validated.payload as unknown as TPayload & {
actorUserId: string;
targetUserId: string;
correlationId: string;
      };

const dedupKey = makeDedupKey(
eventName,
typedPayload.actorUserId,
typedPayload.targetUserId,
typedPayload.correlationId,
      );
if (dedup.has(dedupKey)) {
emitDropBreadcrumb(eventName, {
deduplicated: true,
actorUserId: typedPayload.actorUserId,
targetUserId: typedPayload.targetUserId,
correlationId: typedPayload.correlationId,
        });
return;
      }
dedup.add(dedupKey);

const sequenceKey = makeSequenceKey(
eventName,
typedPayload.actorUserId,
typedPayload.targetUserId,
      );
const sequence = deriveSequenceNumber(typedPayload);
const decision = sequenceGuard.accept(sequenceKey, sequence);
if (decision === "drop") {
emitDropBreadcrumb(eventName, {
sequenceGuard: "drop",
actorUserId: typedPayload.actorUserId,
targetUserId: typedPayload.targetUserId,
correlationId: typedPayload.correlationId,
        });
return;
      }

emitAcceptedBreadcrumb(eventName, typedPayload);
stableDispatch(typedPayload as TPayload);
    },
[eventName, dedup, sequenceGuard, stableDispatch],
  );

const resolvedEventName = useMemo(() => {
if (!enabled) return null;
return eventName;
  }, [enabled, eventName]);

useRealtimeEvent(socket, resolvedEventName, handler, { enabled });
}

function unwrapPayload(frame: unknown): unknown {
if (frame !== null && typeof frame === "object" && "data" in frame) {
return (frame as { data: unknown }).data;
  }
return frame;
}

function deriveSequenceNumber(payload: unknown): number {
if (typeof payload !== "object" || payload === null) return 0;
const candidate = payload as Record<string, unknown>;

const timestampCandidates = [
"changedAt",
"requestedAt",
"respondedAt",
"cancelledAt",
"addedAt",
"removedAt",
"followedAt",
"createdAt",
  ];

for (const field of timestampCandidates) {
const value = candidate[field];
if (typeof value === "string") {
const parsed = Date.parse(value);
if (!Number.isNaN(parsed)) return parsed;
    }
  }

return 0;
}

function emitDropBreadcrumb(
eventName: string,
options: {
reason?: string;
deduplicated?: boolean;
sequenceGuard?: "allow" | "drop";
actorUserId?: string;
targetUserId?: string;
correlationId?: string;
  },
): void {
addSocialRealtimeBreadcrumb({
eventType: eventName,
deduplicated: options.deduplicated ?? false,
sequenceGuard: options.sequenceGuard,
actorUserId: options.actorUserId,
targetUserId: options.targetUserId,
correlationId: options.correlationId,
reason: options.reason,
  });
}

function emitAcceptedBreadcrumb(
eventName: string,
payload: {
actorUserId: string;
targetUserId: string;
correlationId: string;
  },
): void {
addSocialRealtimeBreadcrumb({
eventType: eventName,
sequenceGuard: "allow",
actorUserId: payload.actorUserId,
targetUserId: payload.targetUserId,
correlationId: payload.correlationId,
  });
}
