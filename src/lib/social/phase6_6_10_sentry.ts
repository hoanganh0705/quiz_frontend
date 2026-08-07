/**
 * `phase6_6_10_sentry.ts` — Phase 6.10 Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 6.10 — Realtime Social Notifications and Relationship
 *                Invalidation.
 * Source story:  Story 6.10 (realtime social notifications).
 *
 * ## Purpose
 *
 * Centralised helpers for the `phase6:6.10` Sentry breadcrumb category
 * that every social realtime hook (TKT-6.10.E1–E6), the shared listener
 * wrapper (TKT-6.10.E7), the two UI primitives (TKT-6.10.E8, E9), and
 * the WS-error / reconnect-reconciliation primitives (TKT-6.10.F1, F2)
 * emit.
 *
 * The helpers in this file are the **only** functions the social
 * realtime layer uses to emit breadcrumbs; the `phase6-lint-invariants`
 * script asserts that no caller bypasses them.
 *
 * ## Breadcrumb payload contract
 *
 * The payload shape is locked by the Phase 6.10 telemetry contract:
 *
 * ```ts
 * {
 *   category: "phase6:6.10",
 *   data: {
 *     eventType: string,
 *     actorUserId?: string,
 *     targetUserId?: string,
 *     correlationId?: string,
 *     deduplicated?: boolean,
 *     sequenceGuard?: "allow" | "drop",
 *     invalidationKeys?: string[],
 *     activeUserIds?: string[],
 *     durationMs?: number,
 *     reason?: string,
 *     epic: "1.0.0",
 *   }
 * }
 * ```
 *
 * ## Why this file ships with Batch E
 *
 * The seven listener hooks (TKT-6.10.E1–E6), the shared wrapper
 * (TKT-6.10.E7), and the reconciliation hook (TKT-6.10.F2) all
 * reference `phase6Social10Breadcrumb` from this ticket set. Shipping
 * the helper alongside the consumer hooks keeps the breadcrumb shape
 * stable and lets a future H-ticket replace every ad-hoc
 * `Sentry.addBreadcrumb` call with a single import.
 *
 * ## `friendshipId` / `followId` hygiene
 *
 * The breadcrumb payload shape NEVER carries `friendshipId` or
 * `followId`. The lint script
 * (`scripts/phase6-lint-invariants.mjs`, TKT-6.10.G3) fails the build
 * if any field named `friendshipId` is added to this file.
 */

import * as Sentry from "@sentry/nextjs";

// ─── Constants ────────────────────────────────────────────────────────────

/**
 * The breadcrumb category for Epic 6.10 telemetry. Distinct from the
 * Epic 6.1 / 6.2 / 6.3 / 6.4 / 6.5 / 6.6 / 6.7 / 6.8 / 6.9 categories
 * so the Sentry dashboard can split the realtime layer's events from
 * the rest of Phase 6.
 */
export const EPIC_6_10_BREADCRUMB_CATEGORY = "phase6:6.10" as const;

/**
 * The Epic 6.10 version. Emitted as a breadcrumb data field so the
 * dashboard can split event volumes by Phase 6 release-train.
 */
export const EPIC_6_10_VERSION = "1.0.0" as const;

/**
 * The reconnect-reconciliation breadcrumb category. Distinct from
 * `phase6:6.10` so the Sentry dashboard can split the periodic
 * reconciliation events from the per-event invalidations.
 */
export const EPIC_6_10_RECONNECT_CATEGORY =
  "phase6:6.10:reconnect-reconciliation" as const;

/**
 * The malformed-payload breadcrumb sub-category. Distinct from the
 * canonical `phase6:6.10` so the dashboard can split validation
 * failures from accepted events.
 */
export const EPIC_6_10_MALFORMED_PAYLOAD_CATEGORY =
  "phase6:6.10:malformed-payload" as const;

/**
 * The self-action rejection breadcrumb sub-category. Distinct from the
 * canonical `phase6:6.10` so the dashboard can split self-actions
 * from accepted events.
 */
export const EPIC_6_10_SELF_ACTION_REJECTION_CATEGORY =
  "phase6:6.10:self-action-rejection" as const;

/**
 * The sequence-guard drop breadcrumb sub-category. Distinct from the
 * canonical `phase6:6.10` so the dashboard can split out-of-order
 * drops from accepted events.
 */
export const EPIC_6_10_SEQUENCE_GUARD_DROP_CATEGORY =
  "phase6:6.10:sequence-guard-drop" as const;

// ─── Payload shape ────────────────────────────────────────────────────────

/**
 * The payload shape for an Epic 6.10 breadcrumb. The fields are the
 * union of the documented Phase 6.10 telemetry contract for the
 * realtime social layer.
 *
 * Every field is optional except `eventType`; the helper omits
 * `undefined` fields from the payload so the dashboard never sees
 * `null` placeholders.
 */
export interface SocialRealtimeBreadcrumbData {
  /** The event name (e.g. `"relationship.changed"`). */
  eventType: string;
  /** The user who initiated the action. */
  actorUserId?: string;
  /** The user the action was directed at. */
  targetUserId?: string;
  /** The correlation id of the server-side mutation. */
  correlationId?: string;
  /** Whether the event was dropped by the deduplicator. */
  deduplicated?: boolean;
  /** Whether the event was dropped by the sequence guard. */
  sequenceGuard?: "allow" | "drop";
  /** The SWR cache keys that were invalidated. */
  invalidationKeys?: string[];
  /** The set of active target user ids (reconnect reconciliation). */
  activeUserIds?: string[];
  /** The measured duration in ms (reconnect reconciliation). */
  durationMs?: number;
  /** Optional reason / discriminator string. */
  reason?: string;
  /** The Epic 6.10 version. Defaults to `EPIC_6_10_VERSION`. */
  epicVersion?: string;
}

/**
 * The payload shape for the reconnect-reconciliation breadcrumb. The
 * shape extends the canonical breadcrumb data with the reconciliation-
 * specific fields (`activeUserIds`, `invalidationKeys`, `durationMs`).
 */
export interface ReconnectReconciliationBreadcrumbData {
  /** The set of active target user ids that were reconciled. */
  activeUserIds: string[];
  /** The SWR cache keys that were invalidated. */
  invalidationKeys: string[];
  /** The measured reconciliation duration in ms. */
  durationMs: number;
  /** The Epic 6.10 version. Defaults to `EPIC_6_10_VERSION`. */
  epicVersion?: string;
}

/**
 * Filter an array of strings, removing any element that contains a
 * forbidden identifier (`friendshipId`, `followId`, or auth-token
 * substrings). Returns `undefined` if the array should be omitted from
 * the payload entirely.
 */
function sanitiseArray(values: string[]): string[] | undefined {
  const filtered = values.filter((v) => {
    // Block exact identifier matches.
    if (v === "friendshipId" || v === "followId") return false;
    // Block any string that contains the identifier as a substring — this
    // catches keys like `"social/v1/friendshipId"` or URL params.
    if (v.includes("friendshipId") || v.includes("followId")) return false;
    // Block auth-token patterns in any value.
    if (v.includes("token") || v.includes("authorization") || v.includes("cookie")) return false;
    return true;
  });
  // Omit the field entirely if every element was stripped.
  return filtered.length > 0 ? filtered : undefined;
}

function sanitiseString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // Block exact field-name matches.
  if (value === "friendshipId" || value === "followId") {
    return undefined;
  }
  // Block field-name patterns that could appear in serialised forms.
  if (value.includes("friendshipId=") || value.includes("followId=")) {
    return undefined;
  }
  // Block any value that contains auth/security tokens or identifiers.
  // The spec forbids `token`, `authorization`, and `cookie` from ever
  // appearing in the payload — this catches values like `"Bearer abc123"`
  // or `"Cookie: session=xyz"`.
  if (
    value.includes("token") ||
    value.includes("authorization") ||
    value.includes("cookie")
  ) {
    return undefined;
  }
  return value;
}

/**
 * Emit a `phase6:6.10` breadcrumb for an Epic 6.10 (realtime social)
 * event.
 *
 * The breadcrumb is the canonical telemetry surface for the seven
 * listener hooks (TKT-6.10.E1–E6), the shared wrapper (TKT-6.10.E7),
 * and the badge sync layer (TKT-6.10.E8). The function is a thin
 * wrapper around `Sentry.addBreadcrumb` so callers can stay
 * declarative.
 *
 * @example
 *   addSocialRealtimeBreadcrumb({
 *     eventType: "relationship.changed",
 *     actorUserId: "user-1",
 *     targetUserId: "user-2",
 *     correlationId: "corr-1",
 *     invalidationKeys: ["social/v1/relationship/user-2"],
 *   });
 */
export function addSocialRealtimeBreadcrumb(
  data: SocialRealtimeBreadcrumbData,
): void {
  const payload: Record<string, string | number | boolean | string[]> = {
    eventType: data.eventType,
    epic: data.epicVersion ?? EPIC_6_10_VERSION,
  };

  const actor = sanitiseString(data.actorUserId);
  if (actor !== undefined) payload.actorUserId = actor;

  const target = sanitiseString(data.targetUserId);
  if (target !== undefined) payload.targetUserId = target;

  const correlation = sanitiseString(data.correlationId);
  if (correlation !== undefined) payload.correlationId = correlation;

  if (data.deduplicated !== undefined) payload.deduplicated = data.deduplicated;
  if (data.sequenceGuard !== undefined) payload.sequenceGuard = data.sequenceGuard;
  if (data.invalidationKeys !== undefined) payload.invalidationKeys = data.invalidationKeys;
  if (data.activeUserIds !== undefined) payload.activeUserIds = data.activeUserIds;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.reason !== undefined) {
    const reason = sanitiseString(data.reason);
    if (reason !== undefined) payload.reason = reason;
  }

  Sentry.addBreadcrumb({
    category: EPIC_6_10_BREADCRUMB_CATEGORY,
    data: payload,
  });
}

/**
 * Emit a `phase6:6.10:reconnect-reconciliation` breadcrumb for an
 * Epic 6.10 reconnect reconciliation cycle.
 *
 * The breadcrumb is the canonical telemetry surface for the
 * `useReconnectReconciliation` hook (TKT-6.10.F2). The category is
 * intentionally separate from `phase6:6.10` so the dashboard can split
 * the periodic reconciliation events from the per-event invalidations.
 *
 * @example
 * ```ts
 * addReconnectReconciliationBreadcrumb({
 *   activeUserIds: ["user-1", "user-2"],
 *   invalidationKeys: ["social/v1/requests/incoming"],
 *   durationMs: 142,
 * });
 * ```
 */
export function addReconnectReconciliationBreadcrumb(
  data: ReconnectReconciliationBreadcrumbData,
): void {
  const sanitisedKeys = sanitiseArray(data.invalidationKeys);
  const sanitisedUsers = sanitiseArray(data.activeUserIds);

  const payload: Record<string, string | number | string[] | undefined> = {
    activeUserIds: sanitisedUsers,
    invalidationKeys: sanitisedKeys,
    durationMs: data.durationMs,
    epic: data.epicVersion ?? EPIC_6_10_VERSION,
  };

  Sentry.addBreadcrumb({
    category: EPIC_6_10_RECONNECT_CATEGORY,
    data: payload as Record<string, string | number | string[]>,
  });
}

/**
 * Emit a `phase6:6.10:malformed-payload` breadcrumb when the
 * `validateSocialPayload` runtime validator rejects an event.
 *
 * The sub-category is distinct from the canonical `phase6:6.10`
 * so the dashboard can split validation failures from accepted
 * events.
 *
 * @param eventType - The event name that failed validation.
 * @param reason    - The validation failure reason.
 */
export function phase6Social10MalformedPayloadBreadcrumb(
  eventType: string,
  reason: string,
): void {
  const sanitisedReason = sanitiseString(reason);
  const payload: Record<string, string> = {
    eventType,
    epic: EPIC_6_10_VERSION,
    ...(sanitisedReason !== undefined ? { reason: sanitisedReason } : {}),
  };

  Sentry.addBreadcrumb({
    category: EPIC_6_10_MALFORMED_PAYLOAD_CATEGORY,
    data: payload,
  });
}

/**
 * Emit a `phase6:6.10:self-action-rejection` breadcrumb when the
 * `validateSocialPayload` runtime validator detects
 * `actorUserId === targetUserId`.
 *
 * The sub-category is distinct from the canonical `phase6:6.10`
 * so the dashboard can surface self-action violations separately
 * from accepted events.
 *
 * @param eventType - The event name that was rejected.
 * @param userId    - The user id that appeared as both actor and target.
 */
export function phase6Social10SelfActionRejectionBreadcrumb(
  eventType: string,
  userId: string,
): void {
  const sanitisedUserId = sanitiseString(userId);
  if (sanitisedUserId === undefined) return;

  const payload: Record<string, string> = {
    eventType,
    userId: sanitisedUserId,
    epic: EPIC_6_10_VERSION,
  };

  Sentry.addBreadcrumb({
    category: EPIC_6_10_SELF_ACTION_REJECTION_CATEGORY,
    data: payload,
  });
}

/**
 * Emit a `phase6:6.10:sequence-guard-drop` breadcrumb when the
 * `EventSequenceGuard` drops an out-of-order event.
 *
 * The sub-category is distinct from the canonical `phase6:6.10`
 * so the dashboard can surface sequence-guard drops separately from
 * accepted events.
 *
 * @param eventType   - The event name that was dropped.
 * @param actorUserId - The actor user id.
 * @param targetUserId - The target user id.
 * @param sequence    - The sequence number that was rejected.
 */
export function phase6Social10SequenceGuardDropBreadcrumb(
  eventType: string,
  actorUserId: string,
  targetUserId: string,
  sequence: number,
): void {
  const sanitisedActor = sanitiseString(actorUserId);
  const sanitisedTarget = sanitiseString(targetUserId);
  if (sanitisedActor === undefined || sanitisedTarget === undefined) return;

  const payload: Record<string, string | number> = {
    eventType,
    actorUserId: sanitisedActor,
    targetUserId: sanitisedTarget,
    sequence,
    epic: EPIC_6_10_VERSION,
  };

  Sentry.addBreadcrumb({
    category: EPIC_6_10_SEQUENCE_GUARD_DROP_CATEGORY,
    data: payload,
  });
}

/**
 * The legacy alias for `addSocialRealtimeBreadcrumb`. Kept so the
 * listener-hook tickets that reference `phase6Social10Breadcrumb` from
 * the planning document compile unchanged after the helper migration.
 *
 * @deprecated Use `addSocialRealtimeBreadcrumb` directly.
 */
export function phase6Social10Breadcrumb(
  data: SocialRealtimeBreadcrumbData,
): void {
  addSocialRealtimeBreadcrumb(data);
}
