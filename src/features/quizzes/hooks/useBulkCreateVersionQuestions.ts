

'use client';

import { useCallback, useRef, useState } from 'react';

import { isApiError, type ApiError } from '@/lib/api';

import { bulkCreateVersionQuestions } from '@/features/quizzes/services/question-service';
import type {
BulkCreateQuestionsDto,
BulkQuestionResultItem,
QuizAuthorQuestionDto,
} from '@/features/quizzes/types/author-dtos';

export interface BulkProgress {

current: number;

total: number;

label: string;
}

export interface BulkCreateResult {

ok: boolean;

questions: QuizAuthorQuestionDto[];

results: BulkQuestionResultItem[];
}

export interface UseBulkCreateVersionQuestionsOptions {

onComplete?: (result: BulkCreateResult) => void;

onError?: (error: ApiError) => void;

onRateLimit?: (seconds: number) => void;
}

export interface UseBulkCreateVersionQuestionsReturn {

bulkCreate: (
quizId: string,
versionId: string,
payload: BulkCreateQuestionsDto,
  ) => Promise<BulkCreateResult>;

isLoading: boolean;

progress: BulkProgress | null;

result: BulkCreateResult | null;

cooldownSeconds: number | null;

clearResult: () => void;
}

function emitBreadcrumb(
_category: string,
_data: {
status: string;
durationMs: number;
code?: string;
itemCount?: number;
successCount?: number;
  },
): void {

void _category;
void _data;
}

export function useBulkCreateVersionQuestions(
options: UseBulkCreateVersionQuestionsOptions = {},
): UseBulkCreateVersionQuestionsReturn {
const { onComplete, onError, onRateLimit } = options;

const [isLoading, setIsLoading] = useState(false);
const [progress, setProgress] = useState<BulkProgress | null>(null);
const [result, setResult] = useState<BulkCreateResult | null>(null);
const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

const inFlightRef = useRef<Promise<BulkCreateResult> | null>(null);

const bulkCreate = useCallback(
async (
quizId: string,
versionId: string,
payload: BulkCreateQuestionsDto,
    ): Promise<BulkCreateResult> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

if (cooldownSeconds !== null) {
return {
ok: false,
questions: [],
results: payload.questions.map((_, i) => ({
index: i,
status: 429,
code: 'GLOBAL_RATE_LIMITED',
message: 'Rate limited. Please wait before trying again.',
          })),
        };
      }

setIsLoading(true);
setProgress({
current: 0,
total: payload.questions.length,
label: `Adding 0 of ${payload.questions.length}...`,
      });

const startedAt = Date.now();
const total = payload.questions.length;

const core = (async (): Promise<BulkCreateResult> => {
try {

setProgress({
current: 0,
total,
label: `Adding 0 of ${total}...`,
          });

const response = await bulkCreateVersionQuestions(quizId, versionId, payload);

const successCount = response.questions.length;
const failedCount = total - successCount;

const bulkResult: BulkCreateResult = {
ok: failedCount === 0,
questions: response.questions,
results: response.results,
          };

setProgress({
current: total,
total,
label: `Added ${successCount} of ${total} questions`,
          });

setResult(bulkResult);
onComplete?.(bulkResult);

emitBreadcrumb('phase4:4.10:bulk-create-questions', {
status: bulkResult.ok ? 'success' : 'partial',
durationMs: Date.now() - startedAt,
itemCount: total,
successCount,
          });

return bulkResult;
        } catch (err) {
if (isApiError(err)) {

if (err.status === 429) {
const seconds = 60;
setCooldownSeconds(seconds);

const interval = setInterval(() => {
setCooldownSeconds((prev) => {
if (prev === null || prev <= 1) {
clearInterval(interval);
return null;
                  }
return prev - 1;
                });
              }, 1000);

onRateLimit?.(seconds);

const rateLimitResult: BulkCreateResult = {
ok: false,
questions: [],
results: payload.questions.map((_, i) => ({
index: i,
status: 429,
code: 'GLOBAL_RATE_LIMITED',
message: `Rate limited. Please wait ${seconds} seconds.`,
                })),
              };

setResult(rateLimitResult);
onComplete?.(rateLimitResult);

emitBreadcrumb('phase4:4.10:bulk-create-questions', {
status: 'cooldown',
durationMs: Date.now() - startedAt,
code: err.code,
              });

return rateLimitResult;
            }

const errorResult: BulkCreateResult = {
ok: false,
questions: [],
results: payload.questions.map((_, i) => ({
index: i,
status: err.status,
code: err.code,
message: err.detail ?? err.message,
              })),
            };

setResult(errorResult);
onError?.(err);
onComplete?.(errorResult);

emitBreadcrumb('phase4:4.10:bulk-create-questions', {
status: 'error',
durationMs: Date.now() - startedAt,
code: err.code,
itemCount: total,
            });

return errorResult;
          }

const errorResult: BulkCreateResult = {
ok: false,
questions: [],
results: payload.questions.map((_, i) => ({
index: i,
status: 0,
code: 'GLOBAL_UNKNOWN',
message: err instanceof Error ? err.message : 'Unknown error',
            })),
          };

setResult(errorResult);
onComplete?.(errorResult);

emitBreadcrumb('phase4:4.10:bulk-create-questions', {
status: 'error',
durationMs: Date.now() - startedAt,
code: 'GLOBAL_UNKNOWN',
itemCount: total,
          });

return errorResult;
        }
      })();

inFlightRef.current = core;

try {
return await core;
      } finally {
inFlightRef.current = null;
setIsLoading(false);
setProgress(null);
      }
    },
[cooldownSeconds, onComplete, onError, onRateLimit],
  );

const clearResult = useCallback(() => {
setResult(null);
  }, []);

return {
bulkCreate,
isLoading,
progress,
result,
cooldownSeconds,
clearResult,
  };
}
