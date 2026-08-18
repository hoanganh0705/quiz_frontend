

import type { AxiosError, AxiosResponse } from "axios";

import type { ErrorCode } from "@/lib/api/error-codes";
import type { ApiErrorInput } from "@/lib/api/error-types";

export interface ApiErrorData {
statusCode: number;
message: string | string[];
error: string;
requestId?: string;
path?: string;
method?: string;
}

const STATUS_TO_GLOBAL_CODE: Readonly<Record<number, string>> = {
400: "GLOBAL_BAD_REQUEST",
401: "GLOBAL_UNAUTHENTICATED",
403: "GLOBAL_FORBIDDEN",
404: "GLOBAL_NOT_FOUND",
405: "GLOBAL_METHOD_NOT_ALLOWED",
409: "GLOBAL_CONFLICT",
422: "GLOBAL_UNPROCESSABLE",
429: "GLOBAL_RATE_LIMITED",
};

function synthesizedCodeForStatus(status: number, message: unknown): string {
if (
status === 400 &&
Array.isArray(message) &&
message.every((entry) => typeof entry === "string")
  ) {
return "GLOBAL_VALIDATION_FAILED";
  }
if (status >= 500) {
return "GLOBAL_INTERNAL_ERROR";
  }
return STATUS_TO_GLOBAL_CODE[status] ?? "GLOBAL_INTERNAL_ERROR";
}

type Rfc7807Body = {
type?: string;
title?: string;
status?: number;
detail?: string;
instance?: string;
message?: string | string[];
extensions?: {
code?: string;
requestId?: string;
correlationId?: string;
timestamp?: string;
retryAfter?: number;
validationErrors?: Array<{ field: string; message: string }>;
  };
};

export class ApiError extends Error {

private readonly data: Rfc7807Body | undefined;
private readonly responseStatus: number | undefined;
private readonly responseStatusText: string | undefined;

constructor(error: AxiosError<unknown> | ApiErrorInput) {

const isStructural = looksLikeApiErrorInput(error);
const ax = isStructural
? (synthesizeAxiosErrorFromInput(error) as unknown as AxiosError<unknown>)
: (error as AxiosError<unknown>);

const response = ax.response as AxiosResponse | undefined;
const data = response?.data as Rfc7807Body | undefined;

const validationMessages = Array.isArray(data?.message)
? (data?.message as string[])
: [];

const message =
validationMessages.length > 0
? validationMessages.join(", ")
: (data?.detail ?? data?.message ?? ax.message ?? "");

super(typeof message === "string" ? message : String(message));

this.name = "ApiError";

this.data = data;
this.responseStatus = response?.status;
this.responseStatusText = response?.statusText;

if (Error.captureStackTrace) {
Error.captureStackTrace(this, ApiError);
    }
  }

get code(): ErrorCode {
const extCode = this.data?.extensions?.code;
if (typeof extCode === "string" && extCode.length > 0) {

return extCode as ErrorCode;
    }
return synthesizedCodeForStatus(
this.status,
this.data?.message,
    ) as ErrorCode;
  }

get title(): string {
return this.data?.title ?? this.responseStatusText ?? "";
  }

get detail(): string {
const d = this.data?.detail;
if (typeof d === "string") return d;
const m = this.data?.message;
if (typeof m === "string") return m;
if (Array.isArray(m)) return m.join(", ");
return this.message ?? "";
  }

get instance(): string {
return this.data?.instance ?? "";
  }

get requestId(): string {
return this.data?.extensions?.requestId ?? "";
  }

get correlationId(): string {
return (
this.data?.extensions?.correlationId ??
this.data?.extensions?.requestId ??
""
    );
  }

get retryAfter(): number | null {
const raw = this.data?.extensions?.retryAfter;
if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
return raw;
    }
return null;
  }

get status(): number {
return this.data?.status ?? this.responseStatus ?? 0;
  }

get isValidationError(): boolean {
return (
this.code === "GLOBAL_VALIDATION_FAILED" ||
(Array.isArray(this.data?.message) &&
(this.data?.message as unknown[]).length > 0)
    );
  }

get validationMessages(): string[] {
return Array.isArray(this.data?.message)
? (this.data?.message as string[])
: [];
  }

get isUnauthorized(): boolean {
return this.status === 401;
  }

get isForbidden(): boolean {
return this.status === 403;
  }

get isNotFound(): boolean {
return this.status === 404;
  }

get isServerError(): boolean {
return this.status >= 500;
  }

get isBadRequest(): boolean {
return this.status === 400;
  }

get isConflict(): boolean {
return this.status === 409;
  }

get isUnprocessableEntity(): boolean {
return this.status === 422;
  }

get statusCode(): number {
return (
(this.data as { statusCode?: number } | undefined)?.statusCode ??
this.status
    );
  }

get error(): string {
return this.title;
  }

override get message(): string {
return super.message;
  }

get path(): string {
return (this.data as { path?: string } | undefined)?.path ?? "";
  }

get method(): string {
return (this.data as { method?: string } | undefined)?.method ?? "";
  }

static fromAxios(error: AxiosError<unknown>): ApiError {
return new ApiError(error);
  }

static fromInput(input: ApiErrorInput): ApiError {
const status = input.status ?? 0;
const code = input.code;
const message = input.message ?? '';
const title = input.title;
const instance = input.instance;
const requestId = input.requestId;

const data: Rfc7807Body = {
status,
title: title ?? '',
detail: message,
instance: instance ?? '',
...(code !== undefined ? { extensions: { code } } : {}),
...(requestId !== undefined
? { extensions: { ...(code !== undefined ? { code } : {}), requestId } }
: {}),
    };

const response = {
data,
status,
statusText: title ?? '',
    } as AxiosResponse;

const err = {
name: 'ApiError',
message: message,
response,
isAxiosError: true,
toJSON: () => ({}),
    } as AxiosError<unknown>;

return new ApiError(err);
  }
}

export function isApiError(error: unknown): error is ApiError {
return error instanceof ApiError;
}

function looksLikeApiErrorInput(
value: unknown,
): value is ApiErrorInput {
if (typeof value !== 'object' || value === null) return false;
const v = value as Record<string, unknown>;

if ('response' in v || 'request' in v || 'config' in v) return false;
if ('isAxiosError' in v) return false;
return (
typeof v.code === 'string' ||
typeof v.status === 'number' ||
typeof v.message === 'string'
  );
}

function synthesizeAxiosErrorFromInput(input: ApiErrorInput): {
response: AxiosResponse;
isAxiosError: true;
name: string;
message: string;
toJSON: () => Record<string, unknown>;
} {
const status = input.status ?? 0;
const message = input.message ?? '';
const title = input.title ?? '';
const instance = input.instance ?? '';
const requestId = input.requestId;

const data: Rfc7807Body = {
status,
title,
detail: message,
instance,
...(input.code !== undefined
? {
extensions: {
...(requestId !== undefined ? { requestId } : {}),
...(input.code !== undefined ? { code: input.code } : {}),
          },
        }
: {}),
...(requestId !== undefined && input.code === undefined
? { extensions: { requestId } }
: {}),
  };

return {
isAxiosError: true,
name: 'ApiError',
message,
response: {
data,
status,
statusText: title,
    } as AxiosResponse,
toJSON: () => ({}),
  };
}
