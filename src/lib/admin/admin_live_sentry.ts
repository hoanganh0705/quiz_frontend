

import * as Sentry from '@sentry/nextjs';

export const EPIC_7_1_BREADCRUMB_CATEGORY = 'admin:7.1' as const;

export const ADMIN_EPIC_7_1_VERSION = '1.0.0' as const;

export type AdminBreadcrumbStatus =
| 'started'
  | 'success'
  | 'failure'
  | 'skipped';

export type RedactionPath = string;

export interface AddAdminBreadcrumbInput {

action: string;

route: string;

targetType?: string;

targetId?: string;
status: AdminBreadcrumbStatus;
durationMs: number;

code?: string;

requestId?: string;

correlationId?: string;

redactedPayload?: unknown;

redactFields?: readonly RedactionPath[];
}

export interface AddAdminAuditBreadcrumbInput {

action: string;

route: string;

before: unknown;

after: unknown;
status: AdminBreadcrumbStatus;
durationMs: number;
requestId?: string;
correlationId?: string;
}

export function redactValue(
value: unknown,
fields: readonly RedactionPath[],
): unknown {
if (!fields.length) return value;
if (value === null || typeof value !== 'object') return value;

const seen = new WeakSet<object>();
const visit = (node: unknown, pathSoFar: readonly string[]): unknown => {
if (node === null || typeof node !== 'object') return node;
if (seen.has(node as object)) return node;
seen.add(node as object);

if (Array.isArray(node)) {
return node.map((item) => visit(item, pathSoFar));
    }

const out: Record<string, unknown> = {};
for (const [key, v] of Object.entries(node as Record<string, unknown>)) {
const next = [...pathSoFar, key];
const isRedacted = fields.some(
(field) => field === next.join('.') || field === key,
      );
out[key] = isRedacted ? '[redacted]' : visit(v, next);
    }
return out;
  };
return visit(value, []);
}

function pickOptional<T>(
source: Record<string, T | undefined>,
keys: readonly string[],
): Record<string, T> {
const out: Record<string, T> = {};
for (const key of keys) {
const value = source[key];
if (value !== undefined) out[key] = value;
  }
return out;
}

export function addAdminBreadcrumb(input: AddAdminBreadcrumbInput): void {
const payload: Record<string, unknown> = {
action: input.action,
route: input.route,
status: input.status,
durationMs: input.durationMs,
epic: ADMIN_EPIC_7_1_VERSION,
  };

if (input.targetType !== undefined) payload.targetType = input.targetType;
if (input.targetId !== undefined) payload.targetId = input.targetId;
if (input.code !== undefined) payload.code = input.code;
if (input.requestId !== undefined) payload.requestId = input.requestId;
if (input.correlationId !== undefined)
payload.correlationId = input.correlationId;

if (input.redactedPayload !== undefined) {
const redacted = redactValue(
input.redactedPayload,
input.redactFields ?? [],
    );
payload.redactedPayload = redacted;
  }

Sentry.addBreadcrumb({
category: EPIC_7_1_BREADCRUMB_CATEGORY,
data: payload as Record<string, string | number>,
  });
}

export function addAdminAuditBreadcrumb(
input: AddAdminAuditBreadcrumbInput,
): void {
const optional = pickOptional(input as unknown as Record<string, string | undefined>, [
'requestId',
'correlationId',
  ]);
const payload: Record<string, unknown> = {
action: input.action,
route: input.route,
before: input.before,
after: input.after,
status: input.status,
durationMs: input.durationMs,
epic: ADMIN_EPIC_7_1_VERSION,
...optional,
  };

Sentry.addBreadcrumb({
category: EPIC_7_1_BREADCRUMB_CATEGORY,
data: payload as Record<string, string | number>,
  });
}

export function addTagAdminBreadcrumb(
input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
addAdminBreadcrumb({ ...input, targetType: 'tag' });
}

export function addCategoryAdminBreadcrumb(
input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
addAdminBreadcrumb({ ...input, targetType: 'category' });
}

export function addReviewModerationBreadcrumb(
input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
addAdminBreadcrumb({ ...input, targetType: 'review-report' });
}

export function addCommentModerationBreadcrumb(
input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
addAdminBreadcrumb({ ...input, targetType: 'comment' });
}

export function addRankingAdminBreadcrumb(
input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
addAdminBreadcrumb({ ...input, targetType: 'ranking' });
}

export function addAchievementAdminBreadcrumb(
input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
addAdminBreadcrumb({ ...input, targetType: 'achievement' });
}

export function addTournamentAdminBreadcrumb(
input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
addAdminBreadcrumb({ ...input, targetType: 'tournament' });
}

export function addRoleGrantBreadcrumb(
input: Omit<AddAdminBreadcrumbInput, 'targetType'>,
): void {
addAdminBreadcrumb({ ...input, targetType: 'role' });
}
