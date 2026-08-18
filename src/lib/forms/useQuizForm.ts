"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
useForm,
type FieldErrors,
type FieldValues,
type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

import { isApiError } from "@/lib/api";
import {
getUserCopy,
type ErrorCode as ApiErrorCode,
type UserCopyEntry,
} from "@/lib/api/error-codes";

import { TAG_SLUG_INVALID_COPY } from "./regex";

export type UseQuizFormMode = "single" | "bulk" | "readonly";

export interface UseQuizFormBulkRow<T> {
index: number;
values: T;
}

export interface BulkError {
index: number;
status: number;
code: ErrorCode;
message: string;
field?: string;
}

export type ErrorCode = ApiErrorCode | "GLOBAL_UNKNOWN";

export interface UseQuizFormOptions<
T extends z.ZodType<FieldValues, any, any>,
> {
schema: T;
defaultValues: z.infer<T>;
mode?: UseQuizFormMode;
formId?: string;

submit?: (values: z.infer<T>) => Promise<void>;

bulkHandler?: (
values: z.infer<T>[],
  ) => Promise<{ ok: boolean; results: BulkError[] }>;
}

export interface UseQuizFormReturn<T extends z.ZodType<FieldValues, any, any>> {

form: UseFormReturn<z.infer<T>>;

errors: FieldErrors<z.infer<T>>;
isSubmitting: boolean;
isBulkSubmitting: boolean;
isDirty: boolean;

mode: UseQuizFormMode;

isHydrating: boolean;

markHydrated: () => void;
bulkError: BulkError[];

lastError: (UserCopyEntry & { code: string }) | null;

submit: () => Promise<void>;

bulkSubmit: (
rows: UseQuizFormBulkRow<z.infer<T>>[],
overrides?: {
bulkHandler?: UseQuizFormOptions<T>["bulkHandler"];
    },
  ) => Promise<void>;
reset: () => void;
}

const GLOBAL_UNKNOWN_CODE = "GLOBAL_UNKNOWN" as const;

function emitBreadcrumb(data: {
formId?: string;
status: "success" | "error" | "noop" | "partial" | "cooldown";
durationMs: number;
code?: string;
bulkErrorCount?: number;
}): void {
try {
const sentry =

(typeof require !== "undefined" ? require("@sentry/nextjs") : null) as {
addBreadcrumb?: (crumb: {
category: string;
data: Record<string, unknown>;
        }) => void;
      } | null;
sentry?.addBreadcrumb?.({
category: "phase4:4.2",
data: { ...data },
    });
  } catch {
    // Telemetry is best-effort; never let Sentry failure break the form.
  }
}

function zodIssueToBulkError(
index: number,
rowValues: unknown,
issue: { message: string; path?: ReadonlyArray<PropertyKey> },
): BulkError {
const field =
issue.path && issue.path.length > 0
? issue.path.map((segment) => String(segment)).join(".")
: undefined;
return {
index,
status: 0,
code: "GLOBAL_VALIDATION_FAILED",
message: issue.message || "Validation failed.",
field,
  };
}

export function useQuizForm<T extends z.ZodType<FieldValues, any, any>>(
opts: UseQuizFormOptions<T>,
): UseQuizFormReturn<T> {
const {
schema,
defaultValues,
mode = "single",
formId,
submit: injectedSubmit,
bulkHandler: injectedBulkHandler,
  } = opts;

const form = useForm<z.infer<T>, unknown, z.infer<T>>({
resolver: zodResolver(schema as never) as never,
defaultValues,
mode: "onSubmit",
reValidateMode: "onChange",
  });

const [isSubmitting, setIsSubmitting] = useState(false);
const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
const [bulkError, setBulkError] = useState<BulkError[]>([]);
const [lastError, setLastError] = useState<
(UserCopyEntry & { code: string }) | null
  >(null);

const [isHydrating, setIsHydrating] = useState<boolean>(true);
const markHydrated = useCallback((): void => {
setIsHydrating(false);
  }, []);

const inFlightSubmitRef = useRef<Promise<void> | null>(null);

const classify = useCallback(
(err: unknown): UserCopyEntry & { code: string } => {
if (isApiError(err)) {
return { ...getUserCopy(err.code), code: err.code };
      }
return { ...getUserCopy(GLOBAL_UNKNOWN_CODE), code: GLOBAL_UNKNOWN_CODE };
    },
[],
  );

const submit = useCallback((): Promise<void> => {
if (inFlightSubmitRef.current) {
return inFlightSubmitRef.current;
    }
if (mode === "readonly") {

return Promise.resolve();
    }
if (typeof injectedSubmit !== "function") {

setLastError(null);
return Promise.resolve();
    }

setIsSubmitting(true);
setLastError(null);
const startedAt = Date.now();

const core = (async (): Promise<void> => {

const valid = await form.trigger();
if (!valid) {
emitBreadcrumb({
formId,
status: "noop",
durationMs: Date.now() - startedAt,
        });
return;
      }
const values = form.getValues();
try {
await injectedSubmit(values);
setLastError(null);
emitBreadcrumb({
formId,
status: "success",
durationMs: Date.now() - startedAt,
        });
      } catch (err) {
const classified = classify(err);
setLastError(classified);
emitBreadcrumb({
formId,
status: "error",
durationMs: Date.now() - startedAt,
code: classified.code,
        });
      }
    })();

void core.finally(() => {
inFlightSubmitRef.current = null;
setIsSubmitting(false);
    });

inFlightSubmitRef.current = core;
return core;
  }, [classify, form, formId, injectedSubmit, mode]);

const bulkSubmit = useCallback(
async (
rows: UseQuizFormBulkRow<z.infer<T>>[],
overrides?: {
bulkHandler?: UseQuizFormOptions<T>["bulkHandler"];
      },
    ): Promise<void> => {
if (mode === "readonly") {

return;
      }
setIsBulkSubmitting(true);
setBulkError([]);
setLastError(null);
const startedAt = Date.now();

try {

const rowErrors: BulkError[] = [];
const validRows: Array<{ index: number; values: z.infer<T> }> = [];
for (const row of rows) {
const result = schema.safeParse(row.values);
if (!result.success) {
const firstIssue = result.error.issues[0];
if (firstIssue) {
rowErrors.push(
zodIssueToBulkError(row.index, row.values, {
message: firstIssue.message,
path: firstIssue.path as ReadonlyArray<PropertyKey>,
                }),
              );
            }
          } else {
validRows.push({ index: row.index, values: result.data });
          }
        }

if (validRows.length === 0) {

setBulkError(rowErrors);
emitBreadcrumb({
formId,
status: "noop",
durationMs: Date.now() - startedAt,
bulkErrorCount: rowErrors.length,
          });
return;
        }

const bulkHandler =
overrides?.bulkHandler ?? injectedBulkHandler ?? injectedSubmit;

if (typeof bulkHandler !== "function") {

setBulkError(rowErrors);
emitBreadcrumb({
formId,
status: "noop",
durationMs: Date.now() - startedAt,
bulkErrorCount: rowErrors.length,
          });
return;
        }

let handlerResult: { ok: boolean; results: BulkError[] };
if (bulkHandler === injectedSubmit) {

const results: BulkError[] = [];
for (const row of validRows) {
try {
await injectedSubmit!(row.values);
            } catch (err) {
if (isApiError(err)) {
results.push({
index: row.index,
status: err.status,
code: err.code as ErrorCode,
message: err.detail ?? err.message ?? "Submission failed.",
                });
              } else {
results.push({
index: row.index,
status: 0,
code: GLOBAL_UNKNOWN_CODE,
message: "Submission failed.",
                });
              }
            }
          }
handlerResult = { ok: results.length === 0, results };
        } else {
try {
handlerResult = await (
bulkHandler as NonNullable<UseQuizFormOptions<T>["bulkHandler"]>
            )(validRows.map((r) => r.values));
          } catch (err) {
const classified = classify(err);
setLastError(classified);
setBulkError(rowErrors);
emitBreadcrumb({
formId,
status: "error",
durationMs: Date.now() - startedAt,
code: classified.code,
bulkErrorCount: rowErrors.length,
            });
return;
          }
        }

const handlerIndices = new Set(
handlerResult.results.map((r) => r.index),
        );
const merged: BulkError[] = [
...handlerResult.results,
...rowErrors.filter((r) => !handlerIndices.has(r.index)),
        ];

if (
handlerResult.ok &&
handlerResult.results.length === 0 &&
rowErrors.length === 0
        ) {

setBulkError([]);
form.reset();
emitBreadcrumb({
formId,
status: "success",
durationMs: Date.now() - startedAt,
bulkErrorCount: 0,
          });
return;
        }

setBulkError(merged);
emitBreadcrumb({
formId,
status: "partial",
durationMs: Date.now() - startedAt,
bulkErrorCount: merged.length,
        });
      } finally {
setIsBulkSubmitting(false);
      }
    },
[classify, form, formId, injectedBulkHandler, injectedSubmit, mode, schema],
  );

const reset = useCallback((): void => {
form.reset();
setLastError(null);
setBulkError([]);
  }, [form]);

const errors = useMemo<FieldErrors<z.infer<T>>>(
() => form.formState.errors as FieldErrors<z.infer<T>>,
[form.formState.errors],
  );

const isDirty = mode === "readonly" ? false : form.formState.isDirty;

void TAG_SLUG_INVALID_COPY;

return {
form,
errors,
isSubmitting,
isBulkSubmitting,
isDirty,
mode,
isHydrating,
markHydrated,
bulkError,
lastError,
submit,
bulkSubmit,
reset,
  };
}
