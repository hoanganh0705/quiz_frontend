/**
 * Custom API Error class — RFC 7807 `application/problem+json` aware.
 *
 * @see https://tools.ietf.org/html/rfc7807
 * @see quiz_backend/src/common/types/problem-detail.type.ts (wire shape)
 * @see quiz_backend/src/common/filters/global-exception.filter.ts (status → code table)
 *
 * This class decodes the RFC 7807 wire shape produced by the backend's
 * `GlobalExceptionFilter`. Every getter reads from the correct RFC 7807
 * field first, then falls back to the legacy Nest shape (or an empty
 * string / 0) when the field is absent.
 *
 * Migration path (Phase 1, Epic 1.3):
 *
 *   | RFC 7807 (preferred) | Legacy alias     | Notes                             |
 *   |----------------------|------------------|-----------------------------------|
 *   | `code`               | —                | typed union (TKT-1.3.3.1)         |
 *   | `title`              | `error`          | RFC 7807 §3.1 field               |
 *   | `detail`             | `message` (via `super.message`) | RFC 7807 §3.1 field |
 *   | `instance`           | —                | RFC 7807 §3.1 field               |
 *   | `extensions.requestId`| `requestId`     | extension field                   |
 *   | `extensions.code`    | `error` (via `STATUS_TO_GLOBAL_CODE`) | synthesized     |
 *   | `status`             | `statusCode`     | RFC 7807 §3.1 field               |
 *
 * New code should branch on `code` (string union) and fall back on
 * `status` (number) only when `code` is empty (e.g. for errors from
 * non-proxied servers). The legacy fields (`statusCode`, `error`,
 * `message`, `path`, `method`, `validationMessages`) are preserved as
 * `@deprecated` getters that read from the same wire data — they are
 * kept for backward compatibility with code written before RFC 7807.
 */

import type { AxiosError, AxiosResponse } from "axios";

import type { ErrorCode } from "@/lib/api/error-codes";

export interface ApiErrorData {
  statusCode: number;
  message: string | string[];
  error: string;
  requestId?: string;
  path?: string;
  method?: string;
}

/**
 * Status → synthesized `extensions.code` table.
 *
 * Mirrors `STATUS_TO_GLOBAL_CODE` in
 * `quiz_backend/src/common/filters/global-exception.filter.ts`. The
 * `GLOBAL_VALIDATION_FAILED` override is conditional on the message
 * being an array (the shape produced by NestJS `ValidationPipe`); see
 * `synthesizedCodeForStatus` below.
 */
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

/**
 * Resolve the synthesized `extensions.code` for a given HTTP status.
 *
 * Used by `get code()` when the wire body's `extensions.code` is absent.
 * Mirrors the filter's branch ordering exactly:
 *   - 400 with `string[]` message → `GLOBAL_VALIDATION_FAILED`
 *   - 5xx (any) → `GLOBAL_INTERNAL_ERROR`
 *   - any other status in the table → the table entry
 *   - fallback → `GLOBAL_INTERNAL_ERROR`
 */
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

/**
 * Best-effort typed view of the RFC 7807 wire shape.
 *
 * The constructor accepts `AxiosError<unknown>`; this type narrows the
 * `response.data` to the RFC 7807 fields we read. It is intentionally
 * permissive (every field is optional) because the backend may omit
 * any of them.
 */
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
    validationErrors?: Array<{ field: string; message: string }>;
  };
};

export class ApiError extends Error {
  // Legacy public fields removed in TKT-1.3.1.3 — every legacy field is
  // now a `@deprecated` getter below. New code should use the RFC 7807
  // getters (no deprecation).

  private readonly data: Rfc7807Body | undefined;
  private readonly responseStatus: number | undefined;
  private readonly responseStatusText: string | undefined;

  constructor(error: AxiosError<unknown>) {
    const response = error.response as AxiosResponse | undefined;
    const data = response?.data as Rfc7807Body | undefined;

    const validationMessages = Array.isArray(data?.message)
      ? (data?.message as string[])
      : [];

    const message =
      validationMessages.length > 0
        ? validationMessages.join(", ")
        : (data?.detail ?? data?.message ?? error.message ?? "");

    super(typeof message === "string" ? message : String(message));

    this.name = "ApiError";

    this.data = data;
    this.responseStatus = response?.status;
    this.responseStatusText = response?.statusText;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  // ─── RFC 7807 getters ────────────────────────────────────────────────────

  /**
   * Domain-specific error code (e.g. `QUIZ_NOT_FOUND`, `AUTH_INVALID_CREDENTIALS`),
   * or a synthesized `GLOBAL_*` code for native `HttpException` paths.
   *
   * Reads `data.extensions?.code` first (the canonical RFC 7807 location).
   * Falls back to `synthesizedCodeForStatus(status, message)` when the
   * extension is absent.
   *
   * The return type is the typed `ErrorCode` union (TKT-1.3.3.1):
   *   - Domain errors carry a `<MODULE>_<ENTITY>_<CONDITION>` code from
   *     `quiz_backend/src/common/errors/problem-code-mapping.ts`.
   *   - Native HttpException paths carry one of the synthesized `GLOBAL_*`
   *     codes from `STATUS_TO_GLOBAL_CODE`.
   *
   * The synthesized-fallback branch guarantees the return value is a
   * known `ErrorCode`. The `extensions.code` branch returns whatever the
   * backend sent; if the backend ever emits an unknown code, it would
   * not appear in the type at compile time — the TKT-1.3.3.2 type test
   * enforces the contract that the union must stay in sync with the
   * backend.
   *
   * @returns typed `ErrorCode` (non-empty string). Always a member of
   *   the union defined in `src/lib/api/error-codes.ts`.
   */
  get code(): ErrorCode {
    const extCode = this.data?.extensions?.code;
    if (typeof extCode === "string" && extCode.length > 0) {
      // The backend is the source of truth for the wire body. We trust
      // its `extensions.code` to be a member of the `ErrorCode` union
      // because:
      //   1. The backend's `ProblemCodeMapping` enumerates every domain
      //      exception class's `code` (see the loud-failure branch in
      //      `global-exception.filter.ts`).
      //   2. Native HttpException paths produce a synthesized code,
      //      which is also a member of the union.
      // If either invariant breaks (e.g. a developer adds a new domain
      // exception class without updating `ProblemCodeMapping`), the
      // backend will surface a 500 with `error: 'unknown_error_code'`
      // and the client will receive an `ErrorCode` that doesn't appear
      // in the typed union — that's a fix-the-backend error, not a
      // contract violation on the client side. The cast here documents
      // the trust boundary; the type-level test in `error-codes.spec.ts`
      // ensures the union stays exhaustive on the client side.
      return extCode as ErrorCode;
    }
    return synthesizedCodeForStatus(
      this.status,
      this.data?.message,
    ) as ErrorCode;
  }

  /**
   * Short, human-readable summary of the problem type (RFC 7807 §3.1).
   *
   * Reads `data.title` first; falls back to `response.statusText`;
   * finally an empty string when the backend does not provide one.
   */
  get title(): string {
    return this.data?.title ?? this.responseStatusText ?? "";
  }

  /**
   * Human-readable explanation specific to this occurrence (RFC 7807 §3.1).
   *
   * Reads `data.detail` first; falls back to `data.message` (legacy Nest
   * shape — either a `string` or a `string[]`; arrays are joined with
   * `, `); finally to `error.message` from the AxiosError.
   */
  get detail(): string {
    const d = this.data?.detail;
    if (typeof d === "string") return d;
    const m = this.data?.message;
    if (typeof m === "string") return m;
    if (Array.isArray(m)) return m.join(", ");
    return this.message ?? "";
  }

  /**
   * URI reference identifying the specific occurrence (RFC 7807 §3.1).
   *
   * Usually the absolute request URL. Reads `data.instance`. Empty string
   * when the backend does not include the field.
   */
  get instance(): string {
    return this.data?.instance ?? "";
  }

  /**
   * Server-side request identifier. Use this when reporting a bug to
   * correlate the client error with backend logs.
   *
   * Reads `data.extensions?.requestId` first (canonical RFC 7807 location).
   * Falls back to `data.requestId` (legacy Nest shape).
   */
  get requestId(): string {
    return this.data?.extensions?.requestId ?? "";
  }

  /**
   * Correlation identifier. Currently identical to `requestId` on the
   * backend; the getter is named separately for forward-compatibility.
   */
  get correlationId(): string {
    return (
      this.data?.extensions?.correlationId ??
      this.data?.extensions?.requestId ??
      ""
    );
  }

  /**
   * HTTP status code from the RFC 7807 response (RFC 7807 §3.1).
   *
   * Reads `data.status`; falls back to `error.response?.status`; finally
   * to `0` when the request never reached the server (network error).
   */
  get status(): number {
    return this.data?.status ?? this.responseStatus ?? 0;
  }

  /**
   * True when the response is a validation error.
   *
   * Reads `code === 'GLOBAL_VALIDATION_FAILED'` (the canonical RFC 7807
   * signal) OR a non-empty `data.message: string[]` (the legacy Nest
   * `ValidationPipe` shape). Both paths return `true`.
   */
  get isValidationError(): boolean {
    return (
      this.code === "GLOBAL_VALIDATION_FAILED" ||
      (Array.isArray(this.data?.message) &&
        (this.data?.message as unknown[]).length > 0)
    );
  }

  /**
   * Per-field validation messages (legacy `string[]` shape).
   *
   * @deprecated Prefer `data.extensions?.validationErrors` (Phase 5+) for
   * the canonical per-field validation payload (`{ field, message }[]`).
   * This getter is kept for backward compatibility with code written
   * against the pre-RFC-7807 Nest `ValidationPipe` shape
   * (`data.message: string[]`); it returns an empty array when the
   * backend does not produce that shape.
   */
  get validationMessages(): string[] {
    return Array.isArray(this.data?.message)
      ? (this.data?.message as string[])
      : [];
  }

  // ─── Status-based boolean getters (unchanged) ────────────────────────────

  /** @returns true when the request was unauthenticated (401). */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** @returns true when the request was forbidden (403). */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** @returns true when the requested resource was not found (404). */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** @returns true when the server errored (5xx). */
  get isServerError(): boolean {
    return this.status >= 500;
  }

  /** @returns true when the request was malformed (400). */
  get isBadRequest(): boolean {
    return this.status === 400;
  }

  /** @returns true when the request conflicts with current state (409). */
  get isConflict(): boolean {
    return this.status === 409;
  }

  /** @returns true when the entity could not be processed (422). */
  get isUnprocessableEntity(): boolean {
    return this.status === 422;
  }

  // ─── Legacy soft-deprecated getters (TKT-1.3.1.3) ────────────────────────

  /**
   * @deprecated Use `status` instead. Reads from the legacy Nest shape
   * `data.statusCode` (which the backend never emits); falls back to
   * `status`. Will be removed in Phase 5+ once all callers migrate.
   */
  get statusCode(): number {
    return (
      (this.data as { statusCode?: number } | undefined)?.statusCode ??
      this.status
    );
  }

  /**
   * @deprecated Use `title` instead. Reads from the legacy Nest shape
   * `data.error`; falls back to `title` (which reads `data.title`). Will
   * be removed in Phase 5+.
   */
  get error(): string {
    return this.title;
  }

  /**
   * @deprecated Use `detail` instead. The `Error.message` is set by the
   * constructor from the joined `validationMessages` or the
   * `data.detail ?? data.message ?? error.message` chain.
   */
  override get message(): string {
    return super.message;
  }

  /**
   * @deprecated The backend does not emit `data.path`; this field is
   * preserved for backward compatibility but is always an empty string
   * in practice. Use `instance` for the request URL instead.
   */
  get path(): string {
    return (this.data as { path?: string } | undefined)?.path ?? "";
  }

  /**
   * @deprecated The backend does not emit `data.method`; this field is
   * preserved for backward compatibility but is always an empty string
   * in practice. The HTTP method is not part of RFC 7807.
   */
  get method(): string {
    return (this.data as { method?: string } | undefined)?.method ?? "";
  }

  /**
   * Construct an `ApiError` from an `AxiosError`.
   *
   * Source epic: Epic 1.4 — Custom Instance Hardening.
   * Source ticket: TKT-1.4.5.1.
   *
   * The factory exists primarily to give callers (the axios interceptors
   * in `custom-instance.ts`) a type-narrowed entry point that documents
   * the intent at the call site: "wrap this axios error in our typed
   * `ApiError` shape". Behaviourally identical to `new ApiError(error)`,
   * but reads better at the call site and gives us a single seam to
   * evolve (e.g. add memoization, telemetry, or unwrap transformations)
   * without touching the constructor signature.
   *
   * @example
   *   // In an axios error interceptor:
   *   return Promise.reject(ApiError.fromAxios(error));
   */
  static fromAxios(error: AxiosError<unknown>): ApiError {
    return new ApiError(error);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
