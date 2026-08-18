

"use client";

import { useCallback, useRef, useState } from "react";

import { isApiError, ApiError } from "@/lib/api";

import { createVersionQuestion } from "@/features/quizzes/services/question-service";
import { getQuestionEditorCopy } from "@/features/quizzes/constants/question-errors";
import type {
QuizAuthorQuestionDto,
CreateQuestionDto,
} from "@/features/quizzes/types/author-dtos";
import type { UserCopyEntry } from "@/lib/api/error-codes";

export interface UseCreateVersionQuestionOptions {

onSuccess?: (question: QuizAuthorQuestionDto) => void;

onError?: (error: ApiError) => void;

onRateLimit?: (seconds: number) => void;
}

export interface UseCreateVersionQuestionReturn {

createQuestion: (
quizId: string,
versionId: string,
payload: CreateQuestionDto,
  ) => Promise<QuizAuthorQuestionDto | null>;

isSubmitting: boolean;

error: ApiError | null;

errorCopy: UserCopyEntry | null;

fieldErrors: Record<string, string>;

cooldownSeconds: number | null;

resetError: () => void;
}

function emitBreadcrumb(
_category: string,
_data: { status: string; durationMs: number; code?: string },
): void {

void _category;
void _data;
}

export function useCreateVersionQuestion(
options: UseCreateVersionQuestionOptions = {},
): UseCreateVersionQuestionReturn {
const { onSuccess, onError, onRateLimit } = options;

const [isSubmitting, setIsSubmitting] = useState(false);
const [error, setError] = useState<ApiError | null>(null);
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);

const inFlightRef = useRef<Promise<QuizAuthorQuestionDto | null> | null>(
null,
  );

const errorCopy = error ? getQuestionEditorCopy(error.code) : null;

const createQuestion = useCallback(
async (
quizId: string,
versionId: string,
payload: CreateQuestionDto,
    ): Promise<QuizAuthorQuestionDto | null> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

if (cooldownSeconds !== null) {
return null;
      }

setIsSubmitting(true);
setError(null);
setFieldErrors({});
const startedAt = Date.now();

const core = (async (): Promise<QuizAuthorQuestionDto | null> => {
try {
const question = await createVersionQuestion(
quizId,
versionId,
payload,
          );

onSuccess?.(question);

emitBreadcrumb("phase4:4.10:create-question", {
status: "success",
durationMs: Date.now() - startedAt,
          });

return question;
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

emitBreadcrumb("phase4:4.10:create-question", {
status: "cooldown",
durationMs: Date.now() - startedAt,
code: err.code,
              });

return null;
            }

if (err.status === 422) {

const errors: Record<string, string> = {};
const detail = err.detail as unknown;

if (typeof detail === "string") {

if (detail.toLowerCase().includes("questiontext")) {
errors.questionText = detail;
                } else if (detail.toLowerCase().includes("position")) {
errors.position = detail;
                } else {
errors._general = detail;
                }
              } else if (Array.isArray(detail)) {

for (const item of detail) {
if (typeof item === "object" && item !== null) {
const d = item as Record<string, unknown>;
const field = String(d.field ?? d.path ?? "_general");
const message = String(d.message ?? "Validation error");
errors[field] = message;
                  }
                }
              } else {
errors._general = "Please check your answers";
              }

setFieldErrors(errors);
            }

setError(err);
onError?.(err);

emitBreadcrumb("phase4:4.10:create-question", {
status: "error",
durationMs: Date.now() - startedAt,
code: err.code,
            });

throw err;
          }

const unknownErr =
err instanceof Error ? err.message : "Unknown error";
const apiErr = new ApiError({
status: 0,
code: "GLOBAL_UNKNOWN",
message: unknownErr,
          });

setError(apiErr);
onError?.(apiErr);

emitBreadcrumb("phase4:4.10:create-question", {
status: "error",
durationMs: Date.now() - startedAt,
code: "GLOBAL_UNKNOWN",
          });

throw apiErr;
        }
      })();

inFlightRef.current = core;

try {
return await core;
      } finally {
inFlightRef.current = null;
setIsSubmitting(false);
      }
    },
[cooldownSeconds, onSuccess, onError, onRateLimit],
  );

const resetError = useCallback(() => {
setError(null);
setFieldErrors({});
setCooldownSeconds(null);
  }, []);

return {
createQuestion,
isSubmitting,
error,
errorCopy,
fieldErrors,
cooldownSeconds,
resetError,
  };
}
