# RFC 7807 Audit — `src/lib/api/core/ApiError.ts`

> **Source ticket**: TKT-1.3.1.1
> **Parent epic**: Epic 1.3 — RFC 7807 Error Model
> **Generated**: 2026-07-29 against `quiz_frontend/` on branch `main`.

## Field-by-field audit

The current `ApiError` reads and writes the fields below. Every row maps the *current* read source to the *correct* RFC 7807 read source.

| Field / getter | Type | Current read source | RFC 7807 reality | Migration |
|---|---|---|---|---|
| `statusCode` | `number` | `data?.statusCode ?? error.response?.status ?? 0` | `data.status` (RFC 7807). `data.statusCode` is the **legacy Nest** shape; Nest never emits it in `application/problem+json` responses. | New getter `status` reads `data.status ?? error.response?.status`. `statusCode` is preserved as a legacy alias. |
| `error` | `string` | `data?.error ?? ''` | `data.title` (RFC 7807). `data.error` is the legacy Nest shape. | New getter `title` reads `data.title`. `error` is preserved as a legacy alias reading `data.error ?? this.title`. |
| `message` (via `super(message)`) | `string` | `data?.message ?? error.message` | `data.detail` (RFC 7807). `data.message` is the legacy Nest shape; on validation failures it can be `string[]`. | New getter `detail` reads `data.detail ?? data.message ?? error.message`. The `super.message` call continues to use the joined-or-string fallback so existing `error.message` consumers (e.g. toast notifications) keep working. |
| `requestId` | `string \| undefined` | `data?.requestId` | `data.extensions.requestId` (RFC 7807). `data.requestId` is the legacy shape. | New getter `requestId` reads `data.extensions?.requestId ?? data.requestId ?? ''`. The original `requestId?: string` public field becomes a legacy getter (TKT-1.3.1.3). |
| `path` | `string \| undefined` | `data?.path` | Not part of RFC 7807. Backend's `GlobalExceptionFilter` does not currently emit `path`; the legacy field is empty for real responses. | Preserved as a legacy getter reading `data.path ?? ''`. |
| `method` | `string \| undefined` | `data?.method` | Not part of RFC 7807. Same story as `path`. | Preserved as a legacy getter reading `data.method ?? ''`. |
| `isValidationError` | `boolean` | `validationMessages.length > 0` (i.e. `Array.isArray(data.message)`) | `extensions.code === 'GLOBAL_VALIDATION_FAILED'` is the canonical RFC 7807 signal; the `string[]` shape is a legacy carry-over. | New `isValidationError` getter reads `code === 'GLOBAL_VALIDATION_FAILED' || (Array.isArray(data.message) && data.message.length > 0)`. Both paths return `true`. |
| `validationMessages` | `string[]` | `Array.isArray(data.message) ? data.message : []` | Not in RFC 7807. Future per-field validation lives at `extensions.validationErrors: Array<{ field, message }>` (per `quiz_backend/src/common/filters/global-exception.filter.ts:175–178`). | Preserved as a legacy getter reading `Array.isArray(data.message) ? data.message : []`. Future migration: read `data.extensions?.validationErrors` instead. |
| `isUnauthorized` | `boolean` | `this.statusCode === 401` | RFC 7807 `status: 401`. | Unchanged. The status-based check still works because `statusCode` falls back to `error.response?.status`. |
| `isForbidden` | `boolean` | `this.statusCode === 403` | RFC 7807 `status: 403`. | Unchanged. |
| `isNotFound` | `boolean` | `this.statusCode === 404` | RFC 7807 `status: 404`. | Unchanged. |
| `isServerError` | `boolean` | `this.statusCode >= 500` | RFC 7807 `status >= 500`. | Unchanged. |
| `isBadRequest` | `boolean` | `this.statusCode === 400` | RFC 7807 `status: 400`. | Unchanged. |
| `isConflict` | `boolean` | `this.statusCode === 409` | RFC 7807 `status: 409`. | Unchanged. |
| `isUnprocessableEntity` | `boolean` | `this.statusCode === 422` | RFC 7807 `status: 422`. | Unchanged. |

## Getters to add (per parent epic US-1.3.1)

| New getter | Type | Reads from | Fallback chain |
|---|---|---|---|
| `code` | `string` | `data.extensions?.code` | falls back to `synthesizedCodeForStatus(status)` if absent |
| `title` | `string` | `data.title` | `error.response?.statusText` → `''` |
| `detail` | `string` | `data.detail` | `data.message` → `error.message` → `''` |
| `instance` | `string` | `data.instance` | `''` |
| `requestId` | `string` | `data.extensions?.requestId` | `data.requestId` → `''` |
| `correlationId` | `string` | `data.extensions?.correlationId` | `data.extensions?.requestId` → `''` |
| `status` | `number` | `data.status` | `error.response?.status` → `0` |
| `isValidationError` | `boolean` | `code === 'GLOBAL_VALIDATION_FAILED'` | `Array.isArray(data.message) && data.message.length > 0` |

## Getters to preserve (legacy, soft-deprecation)

The legacy public properties (`statusCode`, `error`, `requestId`, `path`, `method`, `validationMessages`, `isValidationError` as a public property) are converted to `readonly` getters in TKT-1.3.1.3. Each carries `@deprecated` JSDoc.

## Constructor signature

Current:

```ts
constructor(error: AxiosError<ApiErrorData>)
```

Target:

```ts
constructor(error: AxiosError<unknown>)
```

`ApiErrorData` is the legacy Nest shape; the backend never produces it (every error response is RFC 7807). Widening to `AxiosError<unknown>` lets the getters read from the actual wire shape. The `ApiErrorData` interface is preserved as an exported type for any consumer that wants the legacy shape explicitly (none today).

## Synthesized-code fallback

The helper `synthesizedCodeForStatus(status: number): string` returns the synthesized `extensions.code` for native `HttpException` paths. The table mirrors `quiz_backend/src/common/filters/global-exception.filter.ts`'s `STATUS_TO_GLOBAL_CODE` plus the `GLOBAL_VALIDATION_FAILED` override:

| Status | Synthesized code |
|---|---|
| 400 (non-array message) | `GLOBAL_BAD_REQUEST` |
| 400 (`string[]` message) | `GLOBAL_VALIDATION_FAILED` |
| 401 | `GLOBAL_UNAUTHENTICATED` |
| 403 | `GLOBAL_FORBIDDEN` |
| 404 | `GLOBAL_NOT_FOUND` |
| 409 | `GLOBAL_CONFLICT` |
| 405 | `GLOBAL_METHOD_NOT_ALLOWED` |
| 422 | `GLOBAL_UNPROCESSABLE` |
| 429 | `GLOBAL_RATE_LIMITED` |
| 5xx (any) | `GLOBAL_INTERNAL_ERROR` |
| Anything else | `GLOBAL_INTERNAL_ERROR` |

Note: the `GLOBAL_VALIDATION_FAILED` override is conditional on the underlying message being an array. The override is the only branch in `synthesizedCodeForStatus` that needs to inspect the message shape; everything else is a pure status → code lookup.

## Files modified

- `quiz_frontend/docs/rfc-7807-audit.md` (new, this file).
- No source files modified in this ticket (TKT-1.3.1.1 is observational).