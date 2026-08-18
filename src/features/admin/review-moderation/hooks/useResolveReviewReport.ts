'use client';

import { useCallback, useRef, useState } from 'react';

import { mutate as globalMutate } from 'swr';

import { ApiError, getReviews } from '@/lib/api';
import { addReviewModerationBreadcrumb } from '@/lib/admin/admin_live_sentry';

import { patchReviewReport } from '@/features/admin/services/review-moderation.service';
import {
reviewReportsKeyMatcher,
} from './useReviewReports';
import {
REPORT_ACTIONS,
getSdkStatusForAction,
isReportConsumerAction,
requiresCompanionDelete,
type ReportConsumerAction,
type ReportActionMetadata,
} from '../action-enum';
import {
type AdminReportDto,
type ReportAction,
} from '../admin-report-types';
import {
broadcastReviewModerationInvalidate,
} from '../cache/review-moderation-cross-tab';

export interface ResolveOptions {

note?: string;
}

export interface ResolveAuditSnapshot {

beforeReportId: string | null;

beforeAction: ReportConsumerAction | null;

afterReportId: string | null;

afterPayload: AdminReportDto | null;
}

export interface UseResolveReviewReportResult {

resolve: (
reportId: string,
consumerAction: ReportConsumerAction,
options?: ResolveOptions,
  ) => Promise<AdminReportDto>;

isPending: boolean;

error: ApiError | null;

lastOutcome: ResolveOutcome | null;

reset: () => void;

audit: ResolveAuditSnapshot;
}

export type ResolveOutcome =
| { kind: 'success'; payload: AdminReportDto; cause: null }
  | { kind: 'not-found'; cause: ApiError }
  | { kind: 'forbidden'; cause: ApiError }
  | { kind: 'reverted'; cause: ApiError };

function nowMs(): number {
return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

async function callAdminDeleteReview(reviewId: string): Promise<void> {
const sdk = getReviews();
await sdk.adminReviewControllerAdminDeleteReview(reviewId);
}

function reviewsKeyMatcher(key: unknown): boolean {
if (!Array.isArray(key)) return false;
return key[0] === 'reviews';
}

export function useResolveReviewReport(): UseResolveReviewReportResult {
const [isPending, setIsPending] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [lastOutcome, setLastOutcome] = useState<ResolveOutcome | null>(null);
const [beforeReportId, setBeforeReportId] = useState<string | null>(null);
const [beforeAction, setBeforeAction] = useState<ReportConsumerAction | null>(null);
const [afterReportId, setAfterReportId] = useState<string | null>(null);
const [afterPayload, setAfterPayload] = useState<AdminReportDto | null>(null);

const inFlightRef = useRef<Promise<AdminReportDto> | null>(null);

const classifyError = (apiError: ApiError): ResolveOutcome => {
const code = apiError.code;
if (code === 'REVIEW_NOT_FOUND') {
return { kind: 'not-found', cause: apiError };
    }
if (code === 'GLOBAL_FORBIDDEN') {
return { kind: 'forbidden', cause: apiError };
    }
return { kind: 'reverted', cause: apiError };
  };

const emitBreadcrumb = useCallback(
(
status: 'started' | 'success' | 'failure',
action: ReportConsumerAction,
startedAt: number,
apiError?: ApiError,
targetId?: string,
    ): void => {
const metadata: ReportActionMetadata = REPORT_ACTIONS[action];
const durationMs =
status === 'started'
? 0
: Math.max(0, Math.round(nowMs() - startedAt));
if (status === 'failure') {
addReviewModerationBreadcrumb({
action: metadata.breadcrumbAction,
route: 'admin-review-moderation.resolve',
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
addReviewModerationBreadcrumb({
action: metadata.breadcrumbAction,
route: 'admin-review-moderation.resolve',
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
consumerAction: ReportConsumerAction,
options: ResolveOptions = {},
    ): Promise<AdminReportDto> => {
if (!isReportConsumerAction(consumerAction)) {

const synthetic = new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: `Unknown report action: ${String(consumerAction)}`,
config: undefined,
request: undefined,
response: {
status: 400,
data: {
status: 400,
detail: `Unknown report action: ${String(consumerAction)}`,
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

const metadata = REPORT_ACTIONS[consumerAction];
const sdkStatus: ReportAction = getSdkStatusForAction(consumerAction);
const companionDelete = requiresCompanionDelete(consumerAction);

setBeforeReportId(reportId);
setBeforeAction(consumerAction);
setAfterReportId(null);
setAfterPayload(null);
setError(null);
setLastOutcome(null);
setIsPending(true);

const startedAt = nowMs();
emitBreadcrumb('started', consumerAction, startedAt, undefined, reportId);

const core = (async (): Promise<AdminReportDto> => {
try {
const updated = await patchReviewReport(reportId, { status: sdkStatus });

if (
companionDelete &&
typeof (updated as { reviewId?: unknown }).reviewId === 'string'
          ) {
await callAdminDeleteReview(
(updated as { reviewId: string }).reviewId,
            );
          }

setAfterReportId(reportId);
setAfterPayload(updated);
emitBreadcrumb('success', consumerAction, startedAt, undefined, reportId);

await globalMutate(
(key: readonly unknown[]) =>
reviewReportsKeyMatcher(key) || reviewsKeyMatcher(key),
undefined,
{ revalidate: true },
          );

const updatedReviewId = (updated as { reviewId?: unknown })
            .reviewId;
broadcastReviewModerationInvalidate(
'resolve',
reportId,
typeof updatedReviewId === 'string' ? updatedReviewId : null,
          );

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

if (outcome.kind === 'not-found') {
await globalMutate(
(key: readonly unknown[]) => reviewReportsKeyMatcher(key),
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
