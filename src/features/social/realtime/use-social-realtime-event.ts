/**
 * `useSocialRealtimeEvent` — typed socket-event listener wrapper for the
 * social realtime layer.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source ticket: TKT-6.10.E7.
 *
 * ## Purpose
 *
 * The seven listener hooks (TKT-6.10.E1–E6 + the badge re-router in
 * TKT-6.10.E8) all need to do the same thing on every socket event:
 *
 *   1. Receive the raw payload from `useRealtimeEvent`.
 *   2. Validate the payload via `validateSocialPayload`.
 *   3. Deduplicate via the shared `EventDeduplicator`.
 *   4. Order-check via the shared `EventSequenceGuard`.
 *   5. On accept, call the listener's `dispatch(payload)` callback
 *      which owns the SWR invalidation.
 *
 * `useSocialRealtimeEvent` is the **thin pass-through** wrapper that
 * encapsulates the dedup / sequence / validation trio so the listener
 * hooks don't have to duplicate it. The wrapper:
 *
 *   - Accepts `(socket, eventName, dispatch, options?)`.
 *   - On every event, applies the dedup + sequence guard + validation
 *     trio before calling `dispatch`.
 *   - On drop, emits a `phase6:6.10` Sentry breadcrumb tagged
 *     `deduplicated: true` or `sequenceGuard: 'drop'`.
 *   - Cleans up the socket listener on unmount.
 *   - Returns nothing — the `dispatch` callback owns invalidation.
 *
 * ## Why a wrapper and not inlining
 *
 * The trio (dedup + sequence + validation) is identical across all
 * seven listener hooks. Inlining it would produce ~30 lines of
 * identical scaffolding per hook (~210 lines of duplication) and
 * make future changes (e.g., adding a third filter) a cross-cutting
 * edit. The wrapper is the single source of truth.
 *
 * ## Why pass-through and not a full invalidator
 *
 * The wrapper is intentionally thin — it does NOT call `mutateCarefully`
 * directly. Each listener owns its invalidation set (relationship →
 * `makeRelationshipKey`; follow → `makeFollowersKey` + ...; etc.) and
 * the dispatch callback captures the per-hook shape. Decoupling the
 * wrapper from the invalidation lets the listener hooks vary the
 * invalidation set without changing the wrapper.
 *
 * ## SSR safety
 *
 * The wrapper is a pure pass-through over `useRealtimeEvent`, which
 * itself no-ops when `socket === null` or `enabled === false`. SSR
 * calls render through without registering any listeners.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The wrapper does NOT touch the payload — it forwards the validated
 * payload verbatim to the `dispatch` callback. The lint script
 * (`scripts/phase6-lint-invariants.mjs`, TKT-6.10.G3) greps every
 * file under `src/features/social/realtime/` for `friendshipId` /
 * `followId` and fails the build if any field is added. The breadcrumb
 * payload (TKT-6.10.G2, `phase6_6_10_sentry.ts`) likewise never
 * carries the banned fields.
 */

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
} from "@/lib/social/phase6_6_10_sentry";

import type { SocialEventKind } from "./social-event-payloads";

// ─── Public types ───────────────────────────────────────────────────────────

/**
 * Options forwarded to `useSocialRealtimeEvent`.
 */
export interface UseSocialRealtimeEventOptions {
  /**
   * Set to `false` to skip registration. Default: `true`.
   * Useful when the listener hook is wrapped in a feature-flag gate
   * and the caller wants to short-circuit the wrapper itself.
   */
  enabled?: boolean;
}

/**
 * The dispatch callback shape. The listener hook owns the invalidation
 * set; the wrapper forwards the validated payload verbatim.
 *
 * @param payload - The validated `SocialSocketEventPayload` for the
 *                  event kind. The discriminated union from
 *                  `validateSocialPayload` is the typed source.
 */
export type SocialRealtimeDispatch<TPayload> = (payload: TPayload) => void;

// ─── Internal helpers ───────────────────────────────────────────────────────

/**
 * Compose the canonical dedup key. Matches the Epic 6.7.G1 / 6.8.G3
 * spec: `${type}::${actorUserId}::${targetUserId}::${correlationId}`.
 *
 * The wrapper never constructs the key directly because `validation.payload`
 * carries the four fields as a discriminated union; this helper accepts
 * the four fields as plain arguments so it works for every event kind.
 */
function makeDedupKey(
  eventType: string,
  actorUserId: string,
  targetUserId: string,
  correlationId: string,
): string {
  return `${eventType}::${actorUserId}::${targetUserId}::${correlationId}`;
}

/**
 * Compose the canonical sequence key. Matches the
 * `EventSequenceGuard` (`TKT-6.10.D2`) contract:
 * `${eventType}::${actorUserId}::${targetUserId}`.
 */
function makeSequenceKey(
  eventType: string,
  actorUserId: string,
  targetUserId: string,
): `${string}::${string}::${string}` {
  return `${eventType}::${actorUserId}::${targetUserId}` as const;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Typed listener wrapper for social socket events.
 *
 * Registers a `useRealtimeEvent` handler for `eventName` and applies
 * the dedup + sequence guard + validation trio before calling
 * `dispatch(payload)`. On drop (deduplicated, out-of-order, or
 * invalid payload), emits a `phase6:6.10` Sentry breadcrumb tagged
 * with the drop reason.
 *
 * The wrapper is a **pass-through** for accepted events — the dispatch
 * callback owns invalidation.
 *
 * @param socket    - The `useSocket` socket instance (or `null` while connecting).
 * @param eventName - The event name (one of the `SocialEventKind` literals).
 * @param dispatch  - Called with the validated payload on every accepted event.
 * @param options.enabled - Set to `false` to skip registration. Default: `true`.
 *
 * @example
 * ```ts
 * useSocialRealtimeEvent<RelationshipChangedPayload>(
 *   socket,
 *   "relationship.changed",
 *   (payload) => {
 *     mutateCarefully(SOCIAL_CACHE_KEYS.makeRelationshipKey(payload.targetUserId));
 *   }
 * );
 * ```
 */
export function useSocialRealtimeEvent<TPayload>(
  socket: Socket | null,
  eventName: SocialEventKind | string,
  dispatch: SocialRealtimeDispatch<TPayload>,
  options: UseSocialRealtimeEventOptions = {},
): void {
  const { enabled = true } = options;

  const dedup = useEventDeduplicator();
  const sequenceGuard = useEventSequenceGuard();

  // Memoise the dispatch so the `useRealtimeEvent` effect does not
  // re-register on every render (the effect dep list includes `handler`).
  const stableDispatch = useCallback(dispatch, [dispatch]);

  const handler = useCallback(
    (frame: unknown) => {
      // ── Step 1: route-shape check ───────────────────────────────────
      // The wrapper expects either:
      //   (a) the raw socket frame `{ event: string; data: ... }` (the
      //       shape `useRealtimeEvent` receives), or
      //   (b) the bare payload (defensive — caller may forward
      //       either).
      const payload = unwrapPayload(frame);

      // ── Step 2: validate the payload ─────────────────────────────────
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

      // ── Step 3: dedup ────────────────────────────────────────────────
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

      // ── Step 4: sequence guard ───────────────────────────────────────
      // The wire format does not carry a `sequence` field today; the
      // guard accepts any positive integer sequence derived from the
      // timestamp's millisecond value. This is the documented Epic
      // 6.10 stand-in for true server-assigned monotonic sequence
      // numbers (which the backend will emit in a future release).
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

      // ── Step 5: dispatch ─────────────────────────────────────────────
      emitAcceptedBreadcrumb(eventName, typedPayload);
      stableDispatch(typedPayload as TPayload);
    },
    [eventName, dedup, sequenceGuard, stableDispatch],
  );

  // Resolve the event-name argument: the wrapper accepts either a
  // registered event name (passed to `useRealtimeEvent`) or `null` to
  // skip registration. We map `null` / `undefined` to `null` so the
  // underlying hook no-ops.
  const resolvedEventName = useMemo(() => {
    if (!enabled) return null;
    return eventName;
  }, [enabled, eventName]);

  useRealtimeEvent(socket, resolvedEventName, handler, { enabled });
}

// ─── Internal utilities ──────────────────────────────────────────────────────

/**
 * Unwrap a socket frame into a payload.
 *
 * `useRealtimeEvent` forwards the `data` field of the structured
 * socket frame `{ event: string; data: unknown }`; the wrapper accepts
 * either the unwrapped payload or the wrapped frame for defensive
 * reasons (callers may pass either).
 */
function unwrapPayload(frame: unknown): unknown {
  if (frame !== null && typeof frame === "object" && "data" in frame) {
    return (frame as { data: unknown }).data;
  }
  return frame;
}

/**
 * Derive a monotonic sequence number from the validated payload.
 *
 * The wire format does not carry a server-assigned sequence today;
 * we derive a per-payload monotonic number from the event-specific
 * ISO timestamp (e.g., `changedAt`, `requestedAt`). The guard's
 * `accept` returns `'allow'` for any strictly-increasing sequence,
 * so two events with the same timestamp produce a `'drop'` for the
 * second — which is correct: identical timestamps for the same pair
 * indicate either a replay or an out-of-order delivery.
 */
function deriveSequenceNumber(payload: unknown): number {
  if (typeof payload !== "object" || payload === null) return 0;
  const candidate = payload as Record<string, unknown>;

  // Look for the event-specific timestamp field in priority order.
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

/**
 * Emit a `phase6:6.10` breadcrumb for a dropped event.
 */
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

/**
 * Emit a `phase6:6.10` breadcrumb for an accepted event.
 */
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
