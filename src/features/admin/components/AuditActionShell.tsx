'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { ApiError } from '@/lib/api/core/ApiError';
import type { ErrorCode } from '@/lib/api/error-codes';
import {
addAdminAuditBreadcrumb,
addAdminBreadcrumb,
type AdminBreadcrumbStatus,
} from '@/lib/admin/admin_live_sentry';

import { RequestIdBanner } from './RequestIdBanner';

export type AuditActionStatus = 'idle' | 'pending' | 'success' | 'failure';

export interface AuditActionShellState {
isPending: boolean;
status: AuditActionStatus;
error: ApiError | null;
retry: () => void;
}

export interface AuditActionBreadcrumbStarted {
surface: 'admin:7.1';
action: string;
status: 'started';
before: unknown;
startedAt: string;
}

export interface AuditActionBreadcrumbSuccess {
surface: 'admin:7.1';
action: string;
status: 'success';
before: unknown;
after: unknown;
finishedAt: string;
}

export interface AuditActionBreadcrumbFailure {
surface: 'admin:7.1';
action: string;
status: 'failure';
before: unknown;
errorCode: ErrorCode;
requestId: string;
correlationId: string;
redactedPayload: unknown;
finishedAt: string;
}

export type AuditActionBreadcrumb =
| AuditActionBreadcrumbStarted
  | AuditActionBreadcrumbSuccess
  | AuditActionBreadcrumbFailure;

export interface AuditActionShellProps {
action: string;
before: unknown;
mutate: () => Promise<unknown>;
redactFields?: readonly string[];
onBreadcrumb?: (breadcrumb: AuditActionBreadcrumb) => void;
children: (state: AuditActionShellState) => ReactNode;
}

function redactValue(value: unknown, fields: readonly string[]): unknown {
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

function nowIso(): string {
return new Date().toISOString();
}

function statusFromCode(
code: AdminBreadcrumbStatus,
): AdminBreadcrumbStatus {
return code;
}

export function AuditActionShell({
action,
before,
mutate,
redactFields = [],
onBreadcrumb,
children,
}: AuditActionShellProps) {
const [status, setStatus] = useState<AuditActionStatus>('idle');
const [error, setError] = useState<ApiError | null>(null);
const attemptRef = useRef(0);

const emit = useCallback(
(breadcrumb: AuditActionBreadcrumb) => {
if (onBreadcrumb) onBreadcrumb(breadcrumb);
    },
[onBreadcrumb],
  );

const redactedBefore = useMemo(
() => redactValue(before, redactFields),
[before, redactFields],
  );

const run = useCallback(async () => {
attemptRef.current += 1;
setStatus('pending');
setError(null);

const startedAt = Date.now();
emit({
surface: 'admin:7.1',
action,
status: 'started',
before: redactedBefore,
startedAt: new Date(startedAt).toISOString(),
    });

let afterSnapshot: unknown = undefined;
try {
const result = await mutate();
afterSnapshot = result;
setStatus('success');
const finishedAt = Date.now();
const redactedAfter = redactValue(afterSnapshot, redactFields);
emit({
surface: 'admin:7.1',
action,
status: 'success',
before: redactedBefore,
after: redactedAfter,
finishedAt: new Date(finishedAt).toISOString(),
      });

addAdminAuditBreadcrumb({
action,
route: action,
before: redactedBefore,
after: redactedAfter,
status: statusFromCode('success'),
durationMs: finishedAt - startedAt,
      });
    } catch (caught: unknown) {
const apiError =
caught instanceof ApiError
? caught
: new ApiError({
isAxiosError: true,
name: 'ApiError',
message: String(caught),
config: undefined,
request: undefined,
response: {
status: 0,
data: { status: 0, detail: String(caught), title: 'UnknownError' },
              },
toJSON: () => ({}),
            } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
setError(apiError);
setStatus('failure');
const finishedAt = Date.now();
const redactedPayload = redactValue(
{
requestId: apiError.requestId,
detail: apiError.detail,
extensions: apiError['data']?.extensions,
        },
redactFields,
      );
emit({
surface: 'admin:7.1',
action,
status: 'failure',
before: redactedBefore,
errorCode: apiError.code,
requestId: apiError.requestId,
correlationId: apiError.correlationId,
redactedPayload,
finishedAt: new Date(finishedAt).toISOString(),
      });
addAdminBreadcrumb({
action,
route: action,
status: statusFromCode('failure'),
durationMs: finishedAt - startedAt,
code: apiError.code,
requestId: apiError.requestId,
correlationId: apiError.correlationId,
redactedPayload,
redactFields,
      });
    }
  }, [action, emit, mutate, redactFields, redactedBefore]);

const state: AuditActionShellState = {
isPending: status === 'pending',
status,
error,
retry: () => {

void run();
    },
  };

return (
<div data-testid="audit-action-shell" data-action={action}>
{status === 'failure' && error?.requestId ? (
<RequestIdBanner error={error} />
      ) : null}
{children(state)}
</div>
  );
}

