

import * as Sentry from "@sentry/nextjs";

export const EPIC_6_10_BREADCRUMB_CATEGORY = "social:6.10" as const;

export const SOCIAL_EPIC_6_10_VERSION = "1.0.0" as const;

export const EPIC_6_10_RECONNECT_CATEGORY =
"social:6.10:reconnect-reconciliation" as const;

export const EPIC_6_10_MALFORMED_PAYLOAD_CATEGORY =
"social:6.10:malformed-payload" as const;

export const EPIC_6_10_SELF_ACTION_REJECTION_CATEGORY =
"social:6.10:self-action-rejection" as const;

export const EPIC_6_10_SEQUENCE_GUARD_DROP_CATEGORY =
"social:6.10:sequence-guard-drop" as const;

export interface SocialRealtimeBreadcrumbData {

eventType: string;

actorUserId?: string;

targetUserId?: string;

correlationId?: string;

deduplicated?: boolean;

sequenceGuard?: "allow" | "drop";

invalidationKeys?: string[];

activeUserIds?: string[];

durationMs?: number;

reason?: string;

epicVersion?: string;
}

export interface ReconnectReconciliationBreadcrumbData {

activeUserIds: string[];

invalidationKeys: string[];

durationMs: number;

epicVersion?: string;
}

function sanitiseArray(values: string[]): string[] | undefined {
const filtered = values.filter((v) => {

if (v === "friendshipId" || v === "followId") return false;

if (v.includes("friendshipId") || v.includes("followId")) return false;

if (v.includes("token") || v.includes("authorization") || v.includes("cookie")) return false;
return true;
  });

return filtered.length > 0 ? filtered : undefined;
}

function sanitiseString(value: unknown): string | undefined {
if (typeof value !== "string") return undefined;

if (value === "friendshipId" || value === "followId") {
return undefined;
  }

if (value.includes("friendshipId=") || value.includes("followId=")) {
return undefined;
  }

if (
value.includes("token") ||
value.includes("authorization") ||
value.includes("cookie")
  ) {
return undefined;
  }
return value;
}

export function addSocialRealtimeBreadcrumb(
data: SocialRealtimeBreadcrumbData,
): void {
const payload: Record<string, string | number | boolean | string[]> = {
eventType: data.eventType,
epic: data.epicVersion ?? SOCIAL_EPIC_6_10_VERSION,
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

export function addReconnectReconciliationBreadcrumb(
data: ReconnectReconciliationBreadcrumbData,
): void {
const sanitisedKeys = sanitiseArray(data.invalidationKeys);
const sanitisedUsers = sanitiseArray(data.activeUserIds);

const payload: Record<string, string | number | string[] | undefined> = {
activeUserIds: sanitisedUsers,
invalidationKeys: sanitisedKeys,
durationMs: data.durationMs,
epic: data.epicVersion ?? SOCIAL_EPIC_6_10_VERSION,
  };

Sentry.addBreadcrumb({
category: EPIC_6_10_RECONNECT_CATEGORY,
data: payload as Record<string, string | number | string[]>,
  });
}

export function phase6Social10MalformedPayloadBreadcrumb(
eventType: string,
reason: string,
): void {
const sanitisedReason = sanitiseString(reason);
const payload: Record<string, string> = {
eventType,
epic: SOCIAL_EPIC_6_10_VERSION,
...(sanitisedReason !== undefined ? { reason: sanitisedReason } : {}),
  };

Sentry.addBreadcrumb({
category: EPIC_6_10_MALFORMED_PAYLOAD_CATEGORY,
data: payload,
  });
}

export function phase6Social10SelfActionRejectionBreadcrumb(
eventType: string,
userId: string,
): void {
const sanitisedUserId = sanitiseString(userId);
if (sanitisedUserId === undefined) return;

const payload: Record<string, string> = {
eventType,
userId: sanitisedUserId,
epic: SOCIAL_EPIC_6_10_VERSION,
  };

Sentry.addBreadcrumb({
category: EPIC_6_10_SELF_ACTION_REJECTION_CATEGORY,
data: payload,
  });
}

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
epic: SOCIAL_EPIC_6_10_VERSION,
  };

Sentry.addBreadcrumb({
category: EPIC_6_10_SEQUENCE_GUARD_DROP_CATEGORY,
data: payload,
  });
}

export function phase6Social10Breadcrumb(
data: SocialRealtimeBreadcrumbData,
): void {
addSocialRealtimeBreadcrumb(data);
}
