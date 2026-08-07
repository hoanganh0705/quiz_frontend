/**
 * `error-types.ts` — shared types for the API error layer.
 *
 * Kept in a separate file (no runtime code) so the `ApiError` class
 * and the `coerceToApiError` helper can both depend on the type
 * without a circular import.
 *
 * Source epic: Phase 3 — `ApiError` constructor + `coerceToApiError`.
 * Source ticket: TKT-Phase-3.A2.
 *
 * @see src/lib/api/core/ApiError.ts
 * @see src/lib/api/error-coercion.ts
 */

/**
 * Structural input accepted by `ApiError.fromInput` and the
 * widened `new ApiError(input)` constructor.
 *
 * Field semantics mirror the RFC 7807 wire shape plus two ergonomic
 * shortcuts:
 *
 *   - `code` — the canonical `ErrorCode` (typed union). When omitted
 *     the synthesized-code fallback runs (status → `GLOBAL_*`).
 *   - `status` — the HTTP status. Defaults to `0` (network / unknown).
 *   - `message` — human-readable explanation. Becomes `Error.message`
 *     and `apiError.detail`.
 *   - `requestId` — server-side correlation id. Becomes
 *     `apiError.requestId` and `apiError.correlationId`.
 *   - All other fields map 1:1 to the corresponding `ApiError` getter.
 */
export interface ApiErrorInput {
  /** HTTP status (default 0). */
  status?: number;
  /**
   * Domain-specific error code. When omitted the synthesized-code
   * fallback (status → `GLOBAL_*`) runs.
   */
  code?: string;
  /** Human-readable explanation. Becomes `detail` and `Error.message`. */
  message?: string;
  /** Server-side request id. */
  requestId?: string;
  /** Short, human-readable title (RFC 7807 §3.1). */
  title?: string;
  /** RFC 7807 §3.1 occurrence URI. */
  instance?: string;
}
