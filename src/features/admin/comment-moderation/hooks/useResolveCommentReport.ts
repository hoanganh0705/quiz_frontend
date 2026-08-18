'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError, getComments } from '@/lib/api';
import { addCommentModerationBreadcrumb } from '@/lib/admin/admin_live_sentry';

import {
patchCommentReport,
} from '@/features/admin/services/comment-moderation.service';
import {
broadcastCommentModerationInvalidate,
} from '../cache/comment-moderation-cross-tab';
import { commentReportsKeyMatcher } from './useCommentReports';
import {
COMMENT_REPORT_ACTIONS,
getSdkStatusForCommentReportAction,
isCommentReportConsumerAction,
requiresCompanionHide,
type CommentReportActionMetadata,
type CommentReportConsumerAction,
} from '../action-enum';
import { type CommentReportDto } from '../admin-comment-report-types';

export interface ResolveOptions {

note?: string;
}

export interface ResolveAuditSnapshot {

beforeReportId: string | null;

beforeAction: CommentReportConsumerAction | null;

afterReportId: string | null;

afterPayload: CommentReportDto | null;
}

export interface UseResolveCommentReportResult {

resolve: (
reportId: string,
consumerAction: CommentReportConsumerAction,
options?: ResolveOptions,
  ) => Promise<CommentReportDto>;

isPending: boolean;

error: ApiError | null;

lastOutcome: ResolveOutcome | null;

reset: () => void;

audit: ResolveAuditSnapshot;
}

export type ResolveOutcome =
| { kind: 'success'; payload: CommentReportDto; cause: null }
  | { kind: 'not-found'; cause: ApiError }
  | { kind: 'already-resolved'; cause: ApiError }
  | { kind: 'forbidden'; cause: ApiError }
  | { kind: 'reverted'; cause: ApiError };

function nowMs(): number {
return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

async function callAdminHideComment(commentId: string): Promise<void> {
const sdk = getComments();
await sdk.hideComment(commentId);
}

function commentsKeyMatcher(key: unknown): boolean {
if (!Array.isArray(key)) return false;
return key[0] === 'comments';
}

export function useResolveCommentReport(): UseResolveCommentReportResult {
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [lastOutcome, setLastOutcome] = useState<ResolveOutcome | null>(null);
const [beforeReportId, setBeforeReportId] = useState<string | null>(null);
const [beforeAction, setBeforeAction] = useState<CommentReportConsumerAction | null>(null);
const [afterReportId, setAfterReportId] = useState<string | null>(null);
const [afterPayload, setAfterPayload] = useState<CommentReportDto | null>(null);

const inFlightRef = useRef<Promise<CommentReportDto> | null>(null);

const classifyError = (apiError: ApiError): ResolveOutcome => {
const code = apiError.code as string;
if (code === 'COMMENT_REPORT_NOT_FOUND') {
return { kind: 'not-found', cause: apiError };
    }
if (code === 'COMMENT_REPORT_ALREADY_RESOLVED') {
return { kind: 'already-resolved', cause: apiError };
    }
if (code === 'GLOBAL_FORBIDDEN') {
return { kind: 'forbidden', cause: apiError };
    }
return { kind: 'reverted', cause: apiError };
  };

const emitBreadcrumb = useCallback(
(
status: 'started' | 'success' | 'failure',
action: CommentReportConsumerAction,
startedAt: number,
apiError?: ApiError,
targetId?: string,
    ): void => {
const metadata: CommentReportActionMetadata =
COMMENT_REPORT_ACTIONS[action];
const durationMs =
status === 'started'
? 0
: Math.max(0, Math.round(nowMs() - startedAt));
if (status === 'failure') {
addCommentModerationBreadcrumb({
action: metadata.breadcrumbAction,
route: 'admin-comment-moderation.resolve',
status,
durationMs,
targetId,
code: apiError?.code,
requestId: apiError?.requestId,
correlationId: apiError?.correlationId,
redactedPayload: {
requestId: apiError?.requestId,
detail: apiError?.detail,
          },
redactFields: ['reporterId', 'notes'],
        });
      } else {
addCommentModerationBreadcrumb({
action: metadata.breadcrumbAction,
route: 'admin-comment-moderation.resolve',
status,
durationMs,
targetId,
        });
      }
    },
[],
  );

const resolve = useCallback(
async (
reportId: string,
consumerAction: CommentReportConsumerAction,
options: ResolveOptions = {},
    ): Promise<CommentReportDto> => {
if (!isCommentReportConsumerAction(consumerAction)) {

const synthetic = new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: `Unknown comment report action: ${String(consumerAction)}`,
config: undefined,
request: undefined,
response: {
status: 400,
data: {
status: 400,
detail: `Unknown comment report action: ${String(consumerAction)}`,
title: 'GLOBAL_VALIDATION',
extensions: {
code: 'GLOBAL_VALIDATION',
requestId: 'client-validation',
              },
            },
          },
toJSON: () => ({}),
        } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
setError(synthetic);
setLastOutcome({ kind: 'reverted', cause: synthetic });
throw synthetic;
      }

if (inFlightRef.current) {
return inFlightRef.current;
      }

const metadata = COMMENT_REPORT_ACTIONS[consumerAction];
const sdkStatus = getSdkStatusForCommentReportAction(consumerAction);
const companionHide = requiresCompanionHide(consumerAction);
void options;

setBeforeReportId(reportId);
setBeforeAction(consumerAction);
setAfterReportId(null);
setAfterPayload(null);
setError(null);
setLastOutcome(null);
setIsPending(true);

const startedAt = nowMs();
emitBreadcrumb('started', consumerAction, startedAt, undefined, reportId);

const core = (async (): Promise<CommentReportDto> => {
try {
const updated = await patchCommentReport(reportId, {
status: sdkStatus,
          });

if (
companionHide &&
typeof (updated as { commentId?: unknown }).commentId === 'string'
          ) {
await callAdminHideComment(
(updated as { commentId: string }).commentId,
            );
          }

setAfterReportId(reportId);
setAfterPayload(updated);
emitBreadcrumb(
'success',
consumerAction,
startedAt,
undefined,
reportId,
          );

await globalMutate(
(key: readonly unknown[]) =>
commentReportsKeyMatcher(key) || commentsKeyMatcher(key),
undefined,
{ revalidate: true },
          );

const updatedCommentId = (updated as { commentId?: unknown })
            .commentId;
if (typeof updatedCommentId === 'string' && updatedCommentId.length > 0) {
broadcastCommentModerationInvalidate(
'resolve',
reportId,
updatedCommentId,
            );
          }

setLastOutcome({ kind: 'success', payload: updated, cause: null });
return updated;
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
data: {
status: 0,
detail: String(caught),
title: 'UnknownError',
extensions: {
code: 'UnknownError',
requestId: 'client-validation',
                      },
                    },
                  },
toJSON: () => ({}),
                } as unknown as Parameters<typeof ApiError['fromAxios']>[0]);
const outcome = classifyError(apiError);
setError(apiError);
setLastOutcome(outcome);
emitBreadcrumb(
'failure',
consumerAction,
startedAt,
apiError,
reportId,
          );

if (
outcome.kind === 'not-found' ||
outcome.kind === 'already-resolved'
          ) {
await globalMutate(
(key: readonly unknown[]) => commentReportsKeyMatcher(key),
undefined,
{ revalidate: true },
            ).catch(() => {
              // The revalidation is best-effort; failure here is
              // surfaced via the original `apiError` and is not
              // bubbled.
            });
          }

throw apiError;
        }
      })();

inFlightRef.current = core;
try {
return await core;
      } finally {
setIsPending(false);
inFlightRef.current = null;
      }
    },
[emitBreadcrumb],
  );

const reset = useCallback(() => {
setError(null);
setLastOutcome(null);
setBeforeReportId(null);
setBeforeAction(null);
setAfterReportId(null);
setAfterPayload(null);
setIsPending(false);
inFlightRef.current = null;
  }, []);

return {
resolve,
isPending,
error,
lastOutcome,
reset,
audit: {
beforeReportId,
beforeAction,
afterReportId,
afterPayload,
    },
  };
}
